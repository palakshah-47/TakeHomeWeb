import { expect, test } from 'bun:test';

import { findBirdById, type BirdSummary } from './birds';

const birds: BirdSummary[] = [
	{
		id: '1-nothoprocta-perdicaria',
		thumb_url: 'https://images.example.com/tinamou.jpg',
		latin_name: 'Nothoprocta perdicaria',
		english_name: 'Chileans Tinamou',
	},
];

test('finds a bird by its full route id', () => {
	expect(findBirdById(birds, '1-nothoprocta-perdicaria')).toBe(birds[0]);
});

test('returns no bird for an unknown route id', () => {
	expect(findBirdById(birds, 'unknown-bird')).toBeUndefined();
});
