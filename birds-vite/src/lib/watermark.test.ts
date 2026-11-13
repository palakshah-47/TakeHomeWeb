import { describe, expect, test } from 'bun:test';

import {
	createWatermarkLoader,
	HttpError,
	type FetchLike,
} from './watermark';

const IMAGE = 'https://images.example.com/robin.jpg';
const OTHER_IMAGE = 'https://images.example.com/jay.jpg';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const jpeg = (content = 'jpeg') => new Blob([content], { type: 'image/jpeg' });

type Call = { url: string; init?: RequestInit };

/** A fake network: images download fine and the watermark service echoes them. */
function createNetwork(
	override?: (
		call: Call
	) => Response | undefined | Promise<Response | undefined>
) {
	const calls: Call[] = [];
	const fetchFn: FetchLike = async (input, init) => {
		const call = { url: String(input), init };
		calls.push(call);
		const custom = await override?.(call);
		if (custom) return custom;
		if (call.url === '/api/watermark') return new Response(jpeg('watermarked'));
		return new Response(jpeg());
	};

	return {
		calls,
		fetchFn,
		count: (predicate: (url: string) => boolean) =>
			calls.filter((call) => predicate(call.url)).length,
	};
}

function createLoader(
	fetchFn: FetchLike,
	options: Parameters<typeof createWatermarkLoader>[0] = {}
) {
	let counter = 0;
	const revoked: string[] = [];
	const loader = createWatermarkLoader({
		fetch: fetchFn,
		retryDelayMs: 1,
		createObjectURL: () => `blob:${++counter}`,
		revokeObjectURL: (url) => void revoked.push(url),
		...options,
	});
	return { loader, revoked };
}

/** A request that only ends when it is cancelled. */
const hangUntilAborted = (init?: RequestInit) =>
	new Promise<Response>((_, reject) => {
		init?.signal?.addEventListener('abort', () =>
			reject(init.signal?.reason ?? new DOMException('Aborted', 'AbortError'))
		);
	});

describe('createWatermarkLoader', () => {
	test('downloads the image and posts its bytes to the watermark service', async () => {
		const network = createNetwork();
		const { loader } = createLoader(network.fetchFn);

		const objectUrl = await loader.get(IMAGE);

		expect(objectUrl).toBe('blob:1');
		expect(network.calls.map((call) => call.url)).toEqual([
			IMAGE,
			'/api/watermark',
		]);
		const post = network.calls[1]!;
		expect(post.init?.method).toBe('POST');
		expect((post.init?.headers as Record<string, string>)['Content-Type']).toBe(
			'application/octet-stream'
		);
		expect(post.init?.body).toBeInstanceOf(Blob);
	});

	test('serves repeat requests from the cache', async () => {
		const network = createNetwork();
		const { loader } = createLoader(network.fetchFn);

		const first = await loader.get(IMAGE);
		const second = await loader.get(IMAGE);

		expect(second).toBe(first);
		expect(loader.peek(IMAGE)).toBe(first);
		expect(network.count((url) => url === IMAGE)).toBe(1);
	});

	test('concurrent requests for one image share a single download', async () => {
		const network = createNetwork();
		const { loader } = createLoader(network.fetchFn);

		const [a, b] = await Promise.all([loader.get(IMAGE), loader.get(IMAGE)]);

		expect(a).toBe(b);
		expect(network.count((url) => url === IMAGE)).toBe(1);
		expect(network.count((url) => url === '/api/watermark')).toBe(1);
	});

	test('cancels the request only when every consumer has gone away', async () => {
		let requestAborted = false;
		const network = createNetwork((call) => {
			if (call.url !== IMAGE) return undefined;
			call.init?.signal?.addEventListener('abort', () => {
				requestAborted = true;
			});
			return hangUntilAborted(call.init);
		});
		const { loader } = createLoader(network.fetchFn);

		const first = new AbortController();
		const second = new AbortController();
		const firstResult = loader.get(IMAGE, { signal: first.signal });
		const secondResult = loader.get(IMAGE, { signal: second.signal });
		await tick();

		first.abort();
		await expect(firstResult).rejects.toMatchObject({ name: 'AbortError' });
		expect(requestAborted).toBe(false);

		second.abort();
		await expect(secondResult).rejects.toMatchObject({ name: 'AbortError' });
		expect(requestAborted).toBe(true);
	});

	test('an aborted image can be requested again later', async () => {
		let hang = true;
		const network = createNetwork((call) =>
			call.url === IMAGE && hang ? hangUntilAborted(call.init) : undefined
		);
		const { loader } = createLoader(network.fetchFn);

		const controller = new AbortController();
		const aborted = loader.get(IMAGE, { signal: controller.signal });
		await tick();
		controller.abort();
		await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });

		hang = false;
		expect(await loader.get(IMAGE)).toBe('blob:1');
	});

	test('falls back to the image proxy when a direct download is blocked', async () => {
		const network = createNetwork((call) => {
			if (call.url === IMAGE) throw new TypeError('Failed to fetch');
			return undefined;
		});
		const { loader } = createLoader(network.fetchFn);

		expect(await loader.get(IMAGE)).toBe('blob:1');
		expect(network.calls.map((call) => call.url)).toEqual([
			IMAGE,
			`/api/image?url=${encodeURIComponent(IMAGE)}`,
			'/api/watermark',
		]);
	});

	test('retries transient server errors', async () => {
		let watermarkCalls = 0;
		const network = createNetwork((call) => {
			if (call.url === '/api/watermark' && ++watermarkCalls === 1) {
				return new Response('nope', { status: 503 });
			}
			return undefined;
		});
		const { loader } = createLoader(network.fetchFn);

		expect(await loader.get(IMAGE)).toBe('blob:1');
		expect(watermarkCalls).toBe(2);
	});

	test('does not retry client errors', async () => {
		const network = createNetwork((call) =>
			call.url === IMAGE ? new Response('gone', { status: 404 }) : undefined
		);
		const { loader } = createLoader(network.fetchFn);

		const error = await loader.get(IMAGE).catch((e) => e);

		expect(error).toBeInstanceOf(HttpError);
		expect(error.status).toBe(404);
		expect(network.count((url) => url === IMAGE)).toBe(1);
	});

	test('gives up after the retry limit', async () => {
		const network = createNetwork((call) =>
			call.url === IMAGE ? new Response('down', { status: 500 }) : undefined
		);
		const { loader } = createLoader(network.fetchFn, { retries: 2 });

		await expect(loader.get(IMAGE)).rejects.toBeInstanceOf(HttpError);
		expect(network.count((url) => url === IMAGE)).toBe(3);
	});

	test('times out slow requests', async () => {
		const network = createNetwork((call) =>
			call.url === IMAGE ? hangUntilAborted(call.init) : undefined
		);
		const { loader } = createLoader(network.fetchFn, {
			timeoutMs: 20,
			retries: 0,
		});

		await expect(loader.get(IMAGE)).rejects.toMatchObject({
			name: 'TimeoutError',
		});
	});

	test('does not cache failures', async () => {
		let broken = true;
		const network = createNetwork((call) =>
			call.url === IMAGE && broken
				? new Response('gone', { status: 404 })
				: undefined
		);
		const { loader } = createLoader(network.fetchFn);

		await expect(loader.get(IMAGE)).rejects.toBeInstanceOf(HttpError);
		expect(loader.peek(IMAGE)).toBeUndefined();

		broken = false;
		expect(await loader.get(IMAGE)).toBe('blob:1');
	});

	test('limits concurrent downloads', async () => {
		let active = 0;
		let peak = 0;
		const network = createNetwork(async (call) => {
			if (call.url === '/api/watermark') return undefined;
			active++;
			peak = Math.max(peak, active);
			await tick(5);
			active--;
			return undefined;
		});
		const { loader } = createLoader(network.fetchFn, { concurrency: 2 });

		await Promise.all(
			Array.from({ length: 6 }, (_, i) =>
				loader.get(`https://images.example.com/${i}.jpg`)
			)
		);

		expect(peak).toBe(2);
	});

	test('releases the oldest image once the cache is full', async () => {
		const network = createNetwork();
		const { loader, revoked } = createLoader(network.fetchFn, { maxCached: 2 });

		const first = await loader.get(IMAGE);
		await loader.get(OTHER_IMAGE);
		await loader.get('https://images.example.com/third.jpg');

		expect(loader.peek(IMAGE)).toBeUndefined();
		expect(revoked).toEqual([first]);
		expect(loader.peek(OTHER_IMAGE)).toBeDefined();
	});

	test('a recently used image survives eviction', async () => {
		const network = createNetwork();
		const { loader, revoked } = createLoader(network.fetchFn, { maxCached: 2 });

		const first = await loader.get(IMAGE);
		const second = await loader.get(OTHER_IMAGE);
		await loader.get(IMAGE); // touch the first image
		await loader.get('https://images.example.com/third.jpg');

		expect(revoked).toEqual([second]);
		expect(loader.peek(IMAGE)).toBe(first);
	});
});
