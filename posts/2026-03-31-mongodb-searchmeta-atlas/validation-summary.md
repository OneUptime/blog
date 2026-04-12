# Validation Summary: How to Use $searchMeta in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline
- `$searchMeta` stage
- `$search` stage with `$$SEARCH_META` variable
- Faceted search (string, number, date facets)
- Atlas Search index definitions

## Sources Consulted
- MongoDB Atlas Search documentation for `$searchMeta`: https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/#-searchmeta
- MongoDB Atlas Search documentation for `facet` collector: https://www.mongodb.com/docs/atlas/atlas-search/facet/
- MongoDB Atlas Search documentation for `count`: https://www.mongodb.com/docs/atlas/atlas-search/counting/
- MongoDB Atlas Search index definition reference: https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/
- MongoDB Atlas Search `$$SEARCH_META` variable: https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/#search-metadata

## Issues Found

1. **Opening paragraph incorrectly claimed `$searchMeta` returns "scoring information".**
   - **What was wrong:** The intro stated `$searchMeta` returns "facet buckets, result counts, and scoring information." Scoring (relevance scores) is per-document metadata only available via `$search`, not `$searchMeta`.
   - **What was changed:** Removed "scoring information" — now reads "facet buckets and result counts."
   - **Why:** `$searchMeta` only returns aggregate metadata (counts and facet buckets), not per-document scores.

2. **"Getting Only a Count" example referenced a `description` field not present in the index definition.**
   - **What was wrong:** The example used `path: ["name", "description"]` but the Prerequisites index definition had `dynamic: false` and did not include a `description` field mapping. Searching on an unmapped field with a non-dynamic index would not match that field.
   - **What was changed:** Added `"description": { "type": "string" }` to the Prerequisites index definition so the multi-path search example is valid.
   - **Why:** With `dynamic: false`, only explicitly mapped fields are indexed. The example needed the field in the index to work correctly.

3. **Summary omitted `dateFacet` field type.**
   - **What was wrong:** The summary stated faceted fields require "`stringFacet` or `numberFacet` field mappings" but the post also demonstrates date facets, which require `dateFacet` mappings.
   - **What was changed:** Updated to "`stringFacet`, `numberFacet`, or `dateFacet` field mappings" and clarified the requirement applies to facet queries specifically (not count-only queries).
   - **Why:** The post includes a Date Facets section, so the summary should reflect all three facet types.

## Review Notes
- The `$$SEARCH_META` inline example using `$search` with a `facet` collector is a valid pattern — the `facet` collector works with both `$search` and `$searchMeta` stages.
- The Date Facets example uses a different collection (`articles`) with its own index (`articles_search`), so the absence of `dateFacet` in the `products` index definition is not an error — but readers should note that the `articles` index would need `dateFacet` mapped on `publishedAt`.
- All `numBuckets` values used (5, 10, 15, 20) are well within the maximum of 1000 for string facets.
- The `count` option syntax alongside operators in `$searchMeta` (for count-only queries) is correct per the Atlas Search documentation.
