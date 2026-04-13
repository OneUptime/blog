# Validation Summary: How to Use the wildcard Operator in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$project`)
- Atlas Search `wildcard` operator
- Atlas Search `compound` operator
- Atlas Search custom analyzers

## Sources Consulted
- MongoDB Atlas Search wildcard operator docs: https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/wildcard/
- MongoDB Atlas Search string field type docs: https://www.mongodb.com/docs/atlas/atlas-search/field-types/string-type/
- MongoDB Atlas Search token field type docs: https://www.mongodb.com/docs/atlas/atlas-search/field-types/token-type/
- MongoDB Atlas Search custom analyzers docs: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/
- MongoDB Atlas Search path construction docs: https://www.mongodb.com/docs/atlas/atlas-search/path-construction/

## Issues Found
- **Incorrect `normalizer` property in index definition**: The "Case-Insensitive Wildcard" section used `"normalizer": "lowercase"` on a `string` type field mapping. The `normalizer` property is only valid on `token` type fields in Atlas Search, not `string` fields. This appears to be borrowed from Elasticsearch conventions. Fixed by replacing the index definition with a custom analyzer (`lowercaseKeyword`) that combines a `keyword` tokenizer with a `lowercase` token filter, which is the correct Atlas Search approach for case-insensitive wildcard matching.
- **Removed misleading `"analyzer": "lucene.keyword"` from custom index**: The original index definition set `"analyzer": "lucene.keyword"` alongside the invalid `normalizer`. The corrected version uses a custom analyzer name (`lowercaseKeyword`) that is defined in the `analyzers` array of the index definition.

## Review Notes
- All other code examples (basic wildcard, suffix matching, single character wildcard, compound queries, multi-field search) are syntactically correct and use valid Atlas Search API patterns.
- The `allowAnalyzedField: true` parameter is correctly documented and used.
- The wildcard vs regex comparison table is accurate in its general claims about relative performance and use cases.
- The `path` parameter correctly shows both single string and array-of-strings usage.
