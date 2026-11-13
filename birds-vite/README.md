# Birds App

## Development

Requires [Bun](https://bun.sh/).

1. Run `bun install`.
2. Copy `.env.example` to `.env.local`.
3. Set `ACCESS_TOKEN` in `.env.local`. The Bun server uses this token when
   forwarding GraphQL requests; it is not exposed to the browser.
4. Run `bun run dev`.

Run the test suite with `bun test`, or use `bun run typecheck`, `bun run lint`,
and `bun run build` for the other project checks.

