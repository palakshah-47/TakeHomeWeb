import { describe, expect, test } from 'bun:test';

import { createQueue } from './queue';

const deferred = <T = void>() => {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createQueue', () => {
	test('never runs more tasks than the concurrency limit', async () => {
		const queue = createQueue(2);
		const gates = [deferred(), deferred(), deferred(), deferred()];
		let active = 0;
		let peak = 0;

		const results = gates.map((gate, index) =>
			queue.add(async () => {
				active++;
				peak = Math.max(peak, active);
				await gate.promise;
				active--;
				return index;
			})
		);

		await tick();
		expect(queue.size()).toEqual({ pending: 2, running: 2 });

		gates.forEach((gate) => gate.resolve());
		expect(await Promise.all(results)).toEqual([0, 1, 2, 3]);
		expect(peak).toBe(2);
		expect(queue.size()).toEqual({ pending: 0, running: 0 });
	});

	test('runs higher priority first and keeps insertion order for ties', async () => {
		const queue = createQueue(1);
		const blocker = deferred();
		const order: string[] = [];

		const first = queue.add(() => blocker.promise);
		const a = queue.add(async () => void order.push('a'));
		const b = queue.add(async () => void order.push('b'), { priority: 5 });
		const c = queue.add(async () => void order.push('c'));
		const d = queue.add(async () => void order.push('d'), { priority: 5 });

		blocker.resolve();
		await Promise.all([first, a, b, c, d]);
		expect(order).toEqual(['b', 'd', 'a', 'c']);
	});

	test('a task aborted while waiting is rejected and never runs', async () => {
		const queue = createQueue(1);
		const blocker = deferred();
		const controller = new AbortController();
		let ran = false;

		const first = queue.add(() => blocker.promise);
		const waiting = queue.add(
			async () => {
				ran = true;
			},
			{ signal: controller.signal }
		);

		controller.abort();
		await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });

		blocker.resolve();
		await first;
		await tick();
		expect(ran).toBe(false);
		expect(queue.size()).toEqual({ pending: 0, running: 0 });
	});

	test('rejects right away when the signal is already aborted', async () => {
		const queue = createQueue(1);
		const controller = new AbortController();
		controller.abort();

		await expect(
			queue.add(async () => 1, { signal: controller.signal })
		).rejects.toMatchObject({ name: 'AbortError' });
	});

	test('a failing task frees its slot for the next one', async () => {
		const queue = createQueue(1);

		const failing = queue.add(async () => {
			throw new Error('boom');
		});
		const after = queue.add(async () => 'ok');

		await expect(failing).rejects.toThrow('boom');
		expect(await after).toBe('ok');
	});

	test('passes the abort signal to a running task', async () => {
		const queue = createQueue(1);
		const controller = new AbortController();
		let sawAbort = false;

		const running = queue.add(
			(signal) =>
				new Promise<void>((_, reject) => {
					signal.addEventListener('abort', () => {
						sawAbort = true;
						reject(new DOMException('Aborted', 'AbortError'));
					});
				}),
			{ signal: controller.signal }
		);

		await tick();
		controller.abort();
		await expect(running).rejects.toMatchObject({ name: 'AbortError' });
		expect(sawAbort).toBe(true);
		expect(queue.size().running).toBe(0);
	});
});
