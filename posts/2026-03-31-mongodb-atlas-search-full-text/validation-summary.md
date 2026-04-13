# Validation Summary: How to Use $search in MongoDB Atlas for Full-Text Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Apache Lucene (underlying engine)
- MongoDB `$search` aggregation stage
- MongoDB `$searchMeta` aggregation stage
- MongoDB Node.js driver
- Atlas Search index mappings (dynamic and explicit)

## Sources Consulted
- MongoDB Atlas Search documentation: https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB `$search` aggregation stage reference: https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/search/
- MongoDB Atlas Search operators (text, phrase, autocomplete, compound): https://www.mongodb.com/docs/atlas/atlas-search/operators-and-collectors/
- MongoDB Atlas Search `highlight` option: https://www.mongodb.com/docs/atlas/atlas-search/highlighting/
- MongoDB Atlas Search facet collector: https://www.mongodb.com/docs/atlas/atlas-search/facet/
- MongoDB Atlas Search index definitions: https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
No technical issues found.

## Review Notes
- The explicit `$sort: { score: -1 }` after `$search` in several examples is technically redundant since `$search` already returns results sorted by relevance score by default. However, including it is not incorrect and adds clarity for readers.
- The post correctly notes that `$search` is only available on MongoDB Atlas (not self-hosted deployments), which is an important distinction.
- All operator syntax (`text`, `phrase`, `autocomplete`, `compound`), index mapping field types (`string`, `number`, `stringFacet`, `autocomplete`), and Lucene analyzer references (`lucene.english`) are accurate.
- The `fuzzy.maxEdits` parameter is correctly used with value 1; the allowed range is 1-2.
- The `highlight` option is correctly placed as a top-level option within `$search` alongside the operator, not nested inside the operator.
