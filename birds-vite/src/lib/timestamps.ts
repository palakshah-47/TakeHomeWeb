const MILLISECONDS_PER_SECOND = 1000;

export const toApiTimestamp = (date: Date) =>
	Math.floor(date.getTime() / MILLISECONDS_PER_SECOND);

export const fromApiTimestamp = (timestamp: number) =>
	new Date(timestamp * MILLISECONDS_PER_SECOND);
