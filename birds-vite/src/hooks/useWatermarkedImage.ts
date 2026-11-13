import { useEffect, useState } from 'react';

import { getCachedImage, getWatermarkedImage } from '../lib/watermark';

export type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface Options {
	/** Loading starts when this is true and is cancelled when it turns false. */
	enabled?: boolean;
	/** Higher numbers are loaded first. */
	priority?: number;
}

interface State {
	src?: string;
	status: ImageStatus;
	url?: string;
}

export function useWatermarkedImage(
	src: string | undefined,
	{ enabled = true, priority = 0 }: Options = {}
) {
	const [state, setState] = useState<State>({ status: 'idle' });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!src || !enabled || getCachedImage(src)) return;

		const controller = new AbortController();
		setState({ src, status: 'loading' });

		getWatermarkedImage(src, { signal: controller.signal, priority }).then(
			(url) => setState({ src, status: 'loaded', url }),
			() => {
				// An aborted request is not a failure; the component went away.
				if (!controller.signal.aborted) setState({ src, status: 'error' });
			}
		);

		return () => controller.abort();
	}, [src, enabled, priority, attempt]);

	// Images that were loaded before are available immediately, with no flash.
	const url = src
		? (getCachedImage(src) ?? (state.src === src ? state.url : undefined))
		: undefined;

	let status: ImageStatus = 'idle';
	if (url) status = 'loaded';
	else if (state.src === src) status = state.status;
	else if (enabled) status = 'loading';

	return { status, url, retry: () => setAttempt((count) => count + 1) };
}
