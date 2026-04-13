# Validation Summary: How to Build Faceted Navigation with $searchMeta in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- `$searchMeta` aggregation stage
- `$search` aggregation stage
- Atlas Search facet collector (`stringFacet`, `numberFacet`)
- `compound` operator with `must` and `filter` clauses
- Standard MongoDB `$facet` aggregation stage
- Express.js (API example)

## Sources Consulted
- MongoDB Atlas Search facet operator documentation — https://www.mongodb.com/docs/atlas/atlas-search/facet/
- MongoDB Atlas Search stringFacet field type — https://www.mongodb.com/docs/atlas/atlas-search/field-types/string-facet-type/
- MongoDB Atlas Search define field mappings — https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/
- MongoDB Atlas Search compound operator — https://www.mongodb.com/docs/atlas/atlas-search/compound/
- MongoDB Atlas Search facet tutorial — https://www.mongodb.com/docs/atlas/atlas-search/tutorial/facet-tutorial/
- MongoDB Community Forum — https://www.mongodb.com/community/forums/t/how-to-return-all-facets-if-there-are-more-than-1000/283591
- MongoDB Search Lab facet query examples — https://mongodb-developer.github.io/search-lab/docs/facet/query

## Issues Found

### 1. Index definition missing `string` type for `brand` field (Critical)
**What was wrong:** The `brand` field in the Atlas Search index definition was mapped only as `stringFacet`, but multiple code examples later in the post use the `text` operator on the `brand` field for filtering (in the "Filtering with Active Facets" and "Building a Faceted Search API" sections). The `stringFacet` type only supports facet operations — using `text` on a `stringFacet`-only field silently returns empty results without raising an error, making this a subtle and hard-to-debug bug.

**What was changed:** Updated the `brand` field definition to use an array with both `stringFacet` and `string` (with `lucene.keyword` analyzer) type mappings. Also expanded the explanatory note after the index definition to warn readers about this requirement and the silent failure behavior.

**Why:** According to the MongoDB Atlas Search documentation, fields indexed only as `stringFacet` do not support the `text` operator. To both facet on a field and filter it with `text`, you must define both `stringFacet` and `string` type mappings for that field.

## Review Notes
- The `description` field is referenced in the Express.js API example (`path: ["title", "description"]`) but is not included in the Atlas Search index definition. This means text searches would not match terms in the `description` field. This is not strictly an error in the code examples (the search simply won't match on that field), but readers building from the complete example should add `description` to their index.
- The Express.js API example creates a `compound` operator with potentially empty `must` and `filter` arrays when no query or filters are provided. Behavior with all-empty compound clauses may vary; in production code, consider handling this edge case explicitly.
- The example output for the basic facet query omits the `categoryFacet` results even though the query defines three facets (brand, category, price). This is likely intentional for brevity but could confuse readers expecting a complete output.
- The `numBuckets` parameter for string facets has a maximum of 1000. This is not mentioned in the post and could be relevant for readers with high-cardinality facet fields.
