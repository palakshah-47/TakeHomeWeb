import { abortError, createQueue } from './queue';

export class HttpError extends Error {
	readonly status: number;

	constructor(status: number) {
		super(`Request failed with status ${status}`);
		this.name = 'HttpError';
		this.status = status;
	}
}

export type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

export interface WatermarkLoaderOptions {
	fetch?: FetchLike;
	/** How many images are downloaded and watermarked at the same time. */
	concurrency?: number;
	/** Time limit for one attempt (download + watermark). */
	timeoutMs?: number;
	/** Extra attempts after a transient failure (network error, timeout, 5xx). */
	retries?: number;
	/** Base delay for exponential backoff between attempts. */
	retryDelayMs?: number;
	/** How many finished images are kept in memory before the oldest is released. */
	maxCached?: number;
	createObjectURL?: (blob: Blob) => string;
	revokeObjectURL?: (url: string) => void;
}

export interface GetImageOptions {
	signal?: AbortSignal;
	/** Higher numbers are loaded first. */
	priority?: number;
}

interface InflightEntry {
	promise: Promise<string>;
	controller: AbortController;
	consumers: number;
}

const isTransient = (error: unknown) => {
	if (error instanceof HttpError) {
		return error.status >= 500 || error.status === 429 || error.status === 408;
	}
	// Network failures and timeouts are worth another try; user aborts are not.
	return !(error instanceof DOMException && error.name === 'AbortError');
};

function sleep(ms: number, signal: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(abortError());
			return;
		}
		const onAbort = () => {
			clearTimeout(timer);
			reject(abortError());
		};
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

/**
 * Loads bird images and runs them through the watermark service.
 *
 * - Requests are limited by a queue so the page stays responsive.
 * - Concurrent requests for the same image share one download.
 * - When every consumer of an image goes away (scrolled off screen, unmounted)
 *   the underlying request is cancelled.
 * - Finished images are cached as object URLs, with the oldest released first.
 */
export function createWatermarkLoader(options: WatermarkLoaderOptions = {}) {
	const {
		concurrency = 5,
		timeoutMs = 30_000,
		retries = 2,
		retryDelayMs = 400,
		maxCached = 100,
		createObjectURL = (blob: Blob) => URL.createObjectURL(blob),
		revokeObjectURL = (url: string) => URL.revokeObjectURL(url),
	} = options;
	const fetchFn: FetchLike =
		options.fetch ?? ((input, init) => globalThis.fetch(input, init));

	const queue = createQueue(concurrency);
	const inflight = new Map<string, InflightEntry>();
	// Map keeps insertion order, which doubles as least-recently-used order.
	const cache = new Map<string, string>();

	async function download(url: string, signal: AbortSignal) {
		let response: Response;
		try {
			response = await fetchFn(url, { signal });
		} catch (error) {
			if (signal.aborted) throw error;
			// Most likely the image host blocks cross-origin downloads.
			response = await fetchFn(`/api/image?url=${encodeURIComponent(url)}`, {
				signal,
			});
		}
		if (!response.ok) throw new HttpError(response.status);
		return response.blob();
	}

	async function watermark(image: Blob, signal: AbortSignal) {
		const response = await fetchFn('/api/watermark', {
			method: 'POST',
			headers: { 'Content-Type': 'application/octet-stream' },
			body: image,
			signal,
		});
		if (!response.ok) throw new HttpError(response.status);
		return response.blob();
	}

	async function attempt(url: string, signal: AbortSignal) {
		const timeout = AbortSignal.timeout(timeoutMs);
		const combined = AbortSignal.any([signal, timeout]);
		try {
			const original = await download(url, combined);
			const watermarked = await watermark(original, combined);
			return createObjectURL(watermarked);
		} catch (error) {
			if (signal.aborted) throw abortError();
			if (timeout.aborted) throw new DOMException('Timed out', 'TimeoutError');
			throw error;
		}
	}

	async function load(url: string, signal: AbortSignal) {
		for (let tryNumber = 0; ; tryNumber++) {
			try {
				return await attempt(url, signal);
			} catch (error) {
				if (tryNumber >= retries || !isTransient(error)) throw error;
				await sleep(retryDelayMs * 2 ** tryNumber, signal);
			}
		}
	}

	function remember(url: string, objectUrl: string) {
		cache.set(url, objectUrl);
		while (cache.size > maxCached) {
			const [oldestUrl, oldestObjectUrl] = cache.entries().next().value!;
			cache.delete(oldestUrl);
			revokeObjectURL(oldestObjectUrl);
		}
	}

	function start(url: string, priority: number): InflightEntry {
		const controller = new AbortController();
		const entry: InflightEntry = {
			controller,
			consumers: 0,
			promise: Promise.resolve(''),
		};
		entry.promise = queue
			.add((signal) => load(url, signal), {
				priority,
				signal: controller.signal,
			})
			.then(
				(objectUrl) => {
					if (inflight.get(url) === entry) inflight.delete(url);
					remember(url, objectUrl);
					return objectUrl;
				},
				(error) => {
					if (inflight.get(url) === entry) inflight.delete(url);
					throw error;
				}
			);
		return entry;
	}

	/** Returns the watermarked image as an object URL. */
	function get(
		url: string,
		{ signal, priority = 0 }: GetImageOptions = {}
	): Promise<string> {
		const cached = cache.get(url);
		if (cached) {
			cache.delete(url);
			cache.set(url, cached);
			return Promise.resolve(cached);
		}

		if (signal?.aborted) return Promise.reject(abortError());

		let entry = inflight.get(url);
		if (!entry) {
			entry = start(url, priority);
			inflight.set(url, entry);
		}
		entry.consumers++;
		const current = entry;

		return new Promise<string>((resolve, reject) => {
			const onAbort = () => {
				current.consumers--;
				if (current.consumers === 0) {
					if (inflight.get(url) === current) inflight.delete(url);
					current.controller.abort();
				}
				reject(abortError());
			};
			signal?.addEventListener('abort', onAbort, { once: true });
			current.promise.then(
				(objectUrl) => {
					signal?.removeEventListener('abort', onAbort);
					resolve(objectUrl);
				},
				(error) => {
					signal?.removeEventListener('abort', onAbort);
					reject(error);
				}
			);
		});
	}

	/** Returns the image right away if it has already been loaded. */
	function peek(url: string): string | undefined {
		return cache.get(url);
	}

	function clear() {
		for (const objectUrl of cache.values()) revokeObjectURL(objectUrl);
		cache.clear();
	}

	return { get, peek, clear };
}

const loader = createWatermarkLoader();

export const getWatermarkedImage = loader.get;
export const getCachedImage = loader.peek;
