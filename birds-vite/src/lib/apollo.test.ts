import { gql } from '@apollo/client';
import { expect, test } from 'bun:test';

test('sends GraphQL requests through the server without a browser access token', async () => {
	const originalFetch = globalThis.fetch;
	let requestUrl: string | undefined;
	let requestHeaders: Headers | undefined;

	Object.defineProperty(globalThis, 'fetch', {
		configurable: true,
		writable: true,
		value: async (input: RequestInfo | URL, init?: RequestInit) => {
			requestUrl = String(input);
			requestHeaders = new Headers(init?.headers);
			return Response.json({ data: { __typename: 'Query' } });
		},
	});

	try {
		const { client } = await import('./apollo');
		await client.query({
			query: gql`query ApiClientProbe { __typename }`,
			fetchPolicy: 'network-only',
		});

		expect(requestUrl).toBe('/api/graphql');
		expect(requestHeaders?.get('authorization')).toBeNull();
	} finally {
		Object.defineProperty(globalThis, 'fetch', {
			configurable: true,
			writable: true,
			value: originalFetch,
		});
	}
});
