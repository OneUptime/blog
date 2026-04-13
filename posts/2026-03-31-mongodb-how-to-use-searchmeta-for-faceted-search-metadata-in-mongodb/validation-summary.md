# Validation Summary: How to Use $searchMeta for Faceted Search Metadata in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- `$searchMeta` aggregation stage
- Faceted search (string, number, and date facets)
- `$search` aggregation stage
- Atlas Search index definitions (stringFacet, numberFacet, dateFacet field types)
- MongoDB compound operator

## Sources Consulted
- [$searchMeta - MongoDB Atlas Search Docs](https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/searchmeta/)
- [facet (collector) - MongoDB Atlas Search Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/facet/)
- [How to Index String Fields For Faceted Search - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/field-types/string-facet-type/)
- [How to Index Numeric Values for Faceted Search - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/field-types/number-facet-type/)
- [How to Index Date Fields For Faceted Search - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/field-types/date-facet-type/)
- [Count Atlas Search Results - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/counting/)
- [compound Operator - MongoDB Atlas Search Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/compound/)
- [range Operator - MongoDB Atlas Search Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/range/)

## Issues Found

### 1. Incorrect syntax in "Getting Total Count Only" section
**What was wrong:** The example used `count: { type: "total" }` as a top-level field in `$searchMeta` alongside a `text` operator. The `count` option with `type: "total"` is a feature of the `$search` stage (to request exact counts), not a valid top-level field in `$searchMeta`. Additionally, the `text` operator was placed as a sibling of `count` at the top level, which is not valid syntax. The expected output also incorrectly showed `{ count: { total: 247 } }`.

**What was changed:** Replaced with the correct approach: passing the search operator directly to `$searchMeta` (without the `facet` collector), which returns count metadata in the format `{ count: { lowerBound: N } }`. Updated the description, code example, and expected output accordingly.

### 2. Misleading description in "Combining $search and $searchMeta" section
**What was wrong:** The intro text said "Use `$facet` to get search results AND metadata in one query" but the actual code example used `Promise.all` with two separate aggregation pipelines (parallel queries), not the MongoDB `$facet` aggregation stage.

**What was changed:** Updated the description to accurately say "Run `$search` and `$searchMeta` as parallel queries to get search results AND metadata together."

## Review Notes
- The `$searchMeta` stage with a non-facet operator returns `count: { lowerBound: N }` which is an approximate lower-bound count by default. For exact counts, users should use the `$search` stage with `count: { type: "total" }` and access the count via `$$SEARCH_META`. This nuance is not covered in the post but is a possible enhancement for the future.
- The facet field types (`stringFacet`, `numberFacet`, `dateFacet`) used in the index definition are correct. Note that fields can be indexed as both the regular type (e.g., `string`) for searching and the facet type (e.g., `stringFacet`) for faceting by specifying multiple type mappings.
- All other code examples (basic facet query, numeric facets with ranges, date facets, compound operator with filter, parallel query pattern) are syntactically correct and follow current Atlas Search conventions.
