# Validation Summary: How to Use Fuzzy Matching in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$project`, `$sort`, `$limit`)
- Atlas Search `text` operator with fuzzy matching
- Atlas Search `autocomplete` operator with fuzzy matching
- Atlas Search `compound` operator
- Atlas Search `range` and `equals` filter operators
- Levenshtein / Damerau-Levenshtein edit distance

## Sources Consulted
- MongoDB Atlas Search `text` operator documentation — https://www.mongodb.com/docs/atlas/atlas-search/text/
- MongoDB Atlas Search `autocomplete` operator documentation — https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/
- MongoDB Atlas Search `compound` operator documentation — https://www.mongodb.com/docs/atlas/atlas-search/compound/
- MongoDB Atlas Search `equals` operator documentation — https://www.mongodb.com/docs/atlas/atlas-search/equals/
- MongoDB Atlas Search scoring documentation — https://www.mongodb.com/docs/atlas/atlas-search/scoring/
- MongoDB fuzzy match overview — https://www.mongodb.com/resources/basics/fuzzy-match

## Issues Found
- **Invalid `maxEdits: 0` claim**: The blog stated in four places that `maxEdits` accepts values 0, 1, or 2, and described `maxEdits: 0` as "exact match, fastest." According to the MongoDB Atlas Search documentation, `maxEdits` only accepts 1 or 2. To get exact matching, you omit the `fuzzy` option entirely rather than setting `maxEdits: 0`. Fixed all four occurrences:
  - Line 38 comment: Changed `(0 = exact, 1 = 1 edit, 2 = 2 edits)` to `(1 or 2; omit fuzzy for exact match)`
  - Line 56 comment: Changed `(0, 1, or 2)` to `(1 or 2)`
  - Performance section: Removed the `maxEdits: 0` line and added a note to omit the fuzzy option for exact matching
  - Summary paragraph: Changed `(0, 1, or 2)` to `(1 or 2)`

## Review Notes
- MongoDB's documentation refers to the algorithm as "Damerau-Levenshtein distance" (which counts transpositions as a single edit), while the blog uses "Levenshtein distance." This matches some of MongoDB's own less-specific documentation, and the blog's example of "laptpo" as a distance-1 variant of "laptop" is correct under Damerau-Levenshtein. No change made since the blog follows MongoDB's commonly used terminology, but a future update could clarify the distinction.
- The last code example projects `score` via `$meta: "searchScore"` in `$project` and then also uses `$meta: "searchScore"` in the subsequent `$sort` stage. This is technically correct and functional, but sorting by the already-projected field (`{ score: -1 }`) would be more idiomatic. Not changed as it is not incorrect.
- The blog correctly notes that the default for `maxExpansions` is 50, matching the official documentation.
