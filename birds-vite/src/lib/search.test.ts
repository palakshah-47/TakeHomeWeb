import { describe, expect, test } from 'bun:test';

import { filterBirds } from './search';

const birds = [
	{ english_name: 'American Robin', latin_name: 'Turdus migratorius' },
	{ english_name: 'Blue Jay', latin_name: 'Cyanocitta cristata' },
	{ english_name: 'Northern Cardinal', latin_name: 'Cardinalis cardinalis' },
	{ english_name: 'Ruby-throated Hummingbird', latin_name: 'Archilochus colubris' },
	{ english_name: 'Pingüino de Magallanes', latin_name: 'Spheniscus magellanicus' },
];

const names = (query: string) =>
	filterBirds(birds, query).map((bird) => bird.english_name);

describe('filterBirds', () => {
	test('returns every bird for an empty or blank query', () => {
		expect(filterBirds(birds, '')).toBe(birds);
		expect(filterBirds(birds, '   ')).toBe(birds);
	});

	test('matches English names without caring about case', () => {
		expect(names('robin')).toEqual(['American Robin']);
		expect(names('BLUE')).toEqual(['Blue Jay']);
	});

	test('matches Latin names', () => {
		expect(names('cristata')).toEqual(['Blue Jay']);
	});

	test('matches partial words', () => {
		expect(names('hummi')).toEqual(['Ruby-throated Hummingbird']);
	});

	test('requires every word to match, in any order', () => {
		expect(names('cardinal northern')).toEqual(['Northern Cardinal']);
		expect(names('blue robin')).toEqual([]);
	});

	test('can match across the English and Latin name', () => {
		expect(names('jay cyanocitta')).toEqual(['Blue Jay']);
	});

	test('ignores accents on either side', () => {
		expect(names('pinguino')).toEqual(['Pingüino de Magallanes']);
		expect(names('pingüino')).toEqual(['Pingüino de Magallanes']);
	});

	test('returns an empty list when nothing matches', () => {
		expect(names('penguin')).toEqual([]);
	});

	test('handles an empty bird list', () => {
		expect(filterBirds([], 'robin')).toEqual([]);
	});
});
