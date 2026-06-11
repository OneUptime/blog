# Validation Summary: How to Build MongoDB Atlas Search Advanced

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Search indexes
- Apache Lucene analyzers
- MongoDB aggregation pipelines
- Node.js MongoDB driver
- Faceted search
- Autocomplete

## Sources Consulted
- MongoDB Search Index Reference: https://www.mongodb.com/docs/search/index/index-definitions/
- MongoDB Search Custom Analyzers: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/
- MongoDB Search Token Filters: https://www.mongodb.com/docs/search/index/analyzers/token-filters/
- MongoDB Search Autocomplete Field Type: https://www.mongodb.com/docs/search/index/field-types/autocomplete-type/
- MongoDB Search autocomplete Operator: https://www.mongodb.com/docs/search/query/operators-collectors/autocomplete/
- MongoDB Search facet Operator: https://www.mongodb.com/docs/search/query/operators-collectors/facet/
- MongoDB Search Score Details: https://www.mongodb.com/docs/atlas/atlas-search/score/get-details/
- MongoDB Search Score Modification: https://www.mongodb.com/docs/atlas/atlas-search/score/modify-score/
- MongoDB Search Pagination: https://www.mongodb.com/docs/atlas/atlas-search/paginate-results/
- mongosh createSearchIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createsearchindex/
- MongoDB Node.js Driver Collection API: https://mongodb.github.io/node-mongodb-native/Next/classes/Collection.html

## Issues Found
- The post used `stringFacet` and `numberFacet` in examples. These field mappings are now outdated in MongoDB Search; current documentation recommends `token` for string facets and `number` for numeric facets. Updated the field mappings and field-type table accordingly.
- The custom `autocompleteAnalyzer` used the `edgeGram` token filter with an `autocomplete` field mapping. MongoDB Search does not allow graph-producing token filters such as `edgeGram` in `autocomplete` mapping definitions. Removed that custom analyzer from the autocomplete mapping and used the supported `autocomplete` field properties instead.
- The phrase/near section described `near` as terms within proximity, but the example uses a date field and the `near` operator scores values near an origin. Updated the wording and code comment.
- The facet response section said `$searchMeta` returns facet counts alongside search results. `$searchMeta` returns metadata only, so the wording was corrected.
- The pagination best-practice wording implied `$skip` and `$limit` are the general efficient pattern. MongoDB now recommends `searchAfter` and `searchBefore` for deeper pagination, with `$skip` and `$limit` appropriate for shallow pagination or controlled jumps. Updated the wording without restructuring the example.

## Review Notes
The remaining code examples are illustrative and assume matching collection schemas and Atlas Search indexes exist. The production index-management snippet still uses a placeholder `atlasAdminApi` client abstraction rather than a concrete SDK call, but it is framed as pseudocode for an Admin API wrapper.
