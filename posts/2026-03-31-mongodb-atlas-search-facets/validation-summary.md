# Validation Summary: How to Use $search with Facets in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$searchMeta`)
- Atlas Search facet collector (`stringFacet`, `numberFacet`, `dateFacet`)
- MongoDB Node.js Driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB Atlas Search documentation: `$searchMeta` aggregation stage — https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/#-searchmeta
- MongoDB Atlas Search facet documentation — https://www.mongodb.com/docs/atlas/atlas-search/facet/
- MongoDB Atlas Search index definition for facet types — https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/#std-label-bson-data-types-facet
- MongoDB Atlas Search compound operator documentation — https://www.mongodb.com/docs/atlas/atlas-search/compound/

## Issues Found
1. **Incorrect description in Step 3**: The original text stated "Use `$search` with a `$facet` pipeline stage alongside `$searchMeta` called in parallel, or use the `$search` + `$searchMeta` compound in a `$facet` aggregation stage." This is incorrect — `$search` and `$searchMeta` must be the first stage in their respective pipelines and cannot be nested inside a `$facet` aggregation stage. The code example was already correct (two separate parallel queries via `Promise.all`), but the description was misleading. Fixed to accurately describe the parallel query pattern shown in the code.

## Review Notes
- The filtering approach in Step 4 uses `text` search on brand/category fields. While this works, using the `equals` operator would provide exact matching on facet values and be more precise for filter-by-facet-click scenarios. This is a design choice rather than a technical error.
- The top-level `await` on line 116 (`const meta = await getFacets(...)`) requires an ES module context or wrapping in an async function. This is a common blog post convention for brevity and not flagged as an error.
