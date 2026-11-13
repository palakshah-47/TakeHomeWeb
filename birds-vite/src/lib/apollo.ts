import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

// Requests go through the Bun server (server.ts), which adds the Authorization
// header and forwards them to the GraphQL API, so the token never reaches the browser.
export const client = new ApolloClient({
	link: new HttpLink({ uri: '/api/graphql' }),
	cache: new InMemoryCache(),
});
