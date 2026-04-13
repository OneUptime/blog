# Validation Summary: How to Use Synonym Mappings in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$project`, `$sort`)
- Atlas Search synonym mappings (equivalent and explicit)
- Atlas Search `text` operator
- Atlas Search `compound` operator

## Sources Consulted
- MongoDB Atlas Search `text` operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/text/
- MongoDB Atlas Search synonym mapping documentation: https://www.mongodb.com/docs/atlas/atlas-search/synonyms/

## Issues Found
1. **Synonyms combined with fuzzy search (Section: "Combining Synonyms with Fuzzy Search")**: The original code example placed `synonyms` and `fuzzy` options together in a single `text` operator. The official MongoDB documentation explicitly states: "You can't use fuzzy with synonyms." These two options are mutually exclusive within a single `text` operator. **Fix**: Replaced the single `text` operator with a `compound` query using two `should` clauses — one with `synonyms` and one with `fuzzy` — which is the correct approach to achieve both capabilities in a single search.

## Review Notes
- The explicit synonym example shows `input: ["iphone"]` mapping to `synonyms: ["smartphone", "mobile phone", "apple phone"]` without including "iphone" in the synonyms array. With explicit mappings, Atlas Search replaces input terms with synonym terms, so searching for "iphone" would match "smartphone", "mobile phone", and "apple phone" but would NOT match "iphone" itself unless it is also listed in the `synonyms` array. This is technically valid code but could surprise readers who expect the input term to still match. A brief note about this behavior would be helpful in a future revision.
- The `updateOne` example at the end uses `{ synonyms: "sneakers" }` as a filter, which works because MongoDB matches scalar values against array elements. This is correct but may be non-obvious to beginners.
