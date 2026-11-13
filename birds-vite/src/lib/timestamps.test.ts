import { expect, test } from 'bun:test';

import { fromApiTimestamp, toApiTimestamp } from './timestamps';

test('converts milliseconds to a GraphQL Int-safe Unix timestamp', () => {
	const timestamp = toApiTimestamp(new Date('2026-11-13T04:00:00.000Z'));

	expect(timestamp).toBe(1_794_542_400);
	expect(timestamp).toBeLessThanOrEqual(2_147_483_647);
});

test('converts an API timestamp back to a date', () => {
	const timestamp = 1_794_542_400;

	expect(fromApiTimestamp(timestamp).toISOString()).toBe(
		'2026-11-13T04:00:00.000Z'
	);
});
