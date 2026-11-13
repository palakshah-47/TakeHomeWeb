import { expect, test } from 'bun:test';

import { parseNoteContent, serializeNoteContent } from './notes';

test('preserves a note title and body in the API comment field', () => {
	const comment = serializeNoteContent('Nesting site', 'Seen near the creek.');

	expect(parseNoteContent(comment)).toEqual({
		title: 'Nesting site',
		body: 'Seen near the creek.',
	});
});

test('keeps existing notes without a title as plain body text', () => {
	expect(parseNoteContent('Seen near the creek.\nLooked healthy.')).toEqual({
		body: 'Seen near the creek.\nLooked healthy.',
	});
});
