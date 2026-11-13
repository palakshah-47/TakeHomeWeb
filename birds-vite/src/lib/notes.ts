const NOTE_TITLE_PREFIX = 'Title: ';

export interface ParsedNoteContent {
	title?: string;
	body: string;
}

// The notes API only has a comment field, so keep the title in that persisted text.
export const serializeNoteContent = (title: string, body: string) =>
	`${NOTE_TITLE_PREFIX}${title.trim()}\n\n${body.trim()}`;

export function parseNoteContent(comment: string): ParsedNoteContent {
	const separator = comment.indexOf('\n\n');
	if (separator < 0 || !comment.startsWith(NOTE_TITLE_PREFIX)) {
		return { body: comment };
	}

	const title = comment.slice(NOTE_TITLE_PREFIX.length, separator).trim();
	if (!title) return { body: comment };

	return { title, body: comment.slice(separator + 2) };
}
