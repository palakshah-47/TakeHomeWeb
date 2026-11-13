export type QueueTask<T> = (signal: AbortSignal) => Promise<T>;

export interface QueueOptions {
	/** Higher numbers run first. Tasks with equal priority run in insertion order. */
	priority?: number;
	/** Aborting before the task starts removes it from the queue. */
	signal?: AbortSignal;
}

export const abortError = () => new DOMException('Aborted', 'AbortError');

interface Entry {
	priority: number;
	order: number;
	run: () => void;
}

/**
 * A tiny promise queue that runs at most `concurrency` tasks at once.
 * Used to keep the grid from firing dozens of image requests at the same time.
 */
export function createQueue(concurrency: number) {
	const pending: Entry[] = [];
	let running = 0;
	let counter = 0;

	function next() {
		while (running < concurrency && pending.length > 0) {
			let best = 0;
			for (let i = 1; i < pending.length; i++) {
				const a = pending[i]!;
				const b = pending[best]!;
				if (
					a.priority > b.priority ||
					(a.priority === b.priority && a.order < b.order)
				) {
					best = i;
				}
			}
			const [entry] = pending.splice(best, 1);
			running++;
			entry!.run();
		}
	}

	function add<T>(
		task: QueueTask<T>,
		{ priority = 0, signal }: QueueOptions = {}
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			if (signal?.aborted) {
				reject(abortError());
				return;
			}

			function onAbortWhilePending() {
				const index = pending.indexOf(entry);
				if (index !== -1) {
					pending.splice(index, 1);
					reject(abortError());
				}
			}

			const entry: Entry = {
				priority,
				order: counter++,
				run: () => {
					signal?.removeEventListener('abort', onAbortWhilePending);
					const taskSignal = signal ?? new AbortController().signal;
					Promise.resolve()
						.then(() => task(taskSignal))
						.then(resolve, reject)
						.finally(() => {
							running--;
							next();
						});
				},
			};

			signal?.addEventListener('abort', onAbortWhilePending, { once: true });
			pending.push(entry);
			next();
		});
	}

	return {
		add,
		size: () => ({ pending: pending.length, running }),
	};
}

export type TaskQueue = ReturnType<typeof createQueue>;
