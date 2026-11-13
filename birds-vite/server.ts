import index from './index.html';

// The browser never talks to the GraphQL API or the watermark function directly.
// This small server forwards those requests so the access token stays on the server
// and we don't depend on the upstream services allowing cross-origin requests.

const GRAPHQL_ENDPOINT =
	process.env.GRAPHQL_ENDPOINT ?? 'https://takehome.graphql.copilot.money';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? process.env.VITE_ACCESS_TOKEN;
const WATERMARK_URL =
	process.env.WATERMARK_URL ??
	'https://us-central1-copilot-take-home.cloudfunctions.net/watermark';

const json = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});

async function proxyGraphql(req: Request) {
	if (!ACCESS_TOKEN) {
		return json(
			{ errors: [{ message: 'ACCESS_TOKEN is not set. See .env.example.' }] },
			500
		);
	}

	try {
		const upstream = await fetch(GRAPHQL_ENDPOINT, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${ACCESS_TOKEN}`,
			},
			body: await req.text(),
		});

		return new Response(upstream.body, {
			status: upstream.status,
			headers: {
				'content-type':
					upstream.headers.get('content-type') ?? 'application/json',
			},
		});
	} catch {
		return json({ errors: [{ message: 'GraphQL API is unreachable.' }] }, 502);
	}
}

// Receives the raw JPEG bytes and returns the watermarked JPEG.
async function proxyWatermark(req: Request) {
	try {
		const bytes = await req.arrayBuffer();
		const upstream = await fetch(WATERMARK_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/octet-stream',
				'content-length': String(bytes.byteLength),
			},
			body: bytes,
		});

		if (!upstream.ok) {
			return new Response(upstream.body, { status: upstream.status });
		}

		return new Response(upstream.body, {
			status: 200,
			headers: { 'content-type': 'image/jpeg' },
		});
	} catch {
		return json({ error: 'Watermark service is unreachable.' }, 502);
	}
}

// Fallback for image hosts that don't allow cross-origin downloads.
// Only public https URLs are forwarded.
async function proxyImage(req: Request) {
	const target = new URL(req.url).searchParams.get('url');
	if (!target) return json({ error: 'Missing url.' }, 400);

	let url: URL;
	try {
		url = new URL(target);
	} catch {
		return json({ error: 'Invalid url.' }, 400);
	}

	const isLocalHost =
		url.hostname === 'localhost' ||
		/^[\d.]+$/.test(url.hostname) ||
		url.hostname.includes(':');
	if (url.protocol !== 'https:' || isLocalHost) {
		return json({ error: 'Only public https images are allowed.' }, 400);
	}

	try {
		const upstream = await fetch(url);
		return new Response(upstream.body, {
			status: upstream.status,
			headers: {
				'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
			},
		});
	} catch {
		return json({ error: 'Image host is unreachable.' }, 502);
	}
}

const server = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	routes: {
		'/api/graphql': { POST: proxyGraphql },
		'/api/watermark': { POST: proxyWatermark },
		'/api/image': { GET: proxyImage },
		// Everything else is the single-page app (client-side routing).
		'/*': index,
	},
	development: process.env.NODE_ENV !== 'production' && {
		hmr: true,
		console: true,
	},
});

console.log(`The Birds App is running at ${server.url}`);
