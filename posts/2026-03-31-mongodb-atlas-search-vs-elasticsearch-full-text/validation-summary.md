# Validation Summary: MongoDB Atlas Search vs Elasticsearch: Full-Text Search Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB Atlas Search
- Elasticsearch
- Apache Lucene
- MongoDB aggregation pipeline (`$search`, `$searchMeta`)
- Elasticsearch Query DSL
- Logstash (MongoDB input plugin)

## Sources Consulted
- MongoDB Atlas Search documentation — https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB `createSearchIndex` reference — https://www.mongodb.com/docs/manual/reference/method/db.collection.createSearchIndex/
- Atlas Search highlighting guide — https://www.mongodb.com/docs/atlas/atlas-search/highlighting/
- Atlas Search `$searchMeta` documentation — https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/searchMeta/
- Atlas Search score modification — https://www.mongodb.com/docs/atlas/atlas-search/score/modify-score/
- MongoDB BI Connector documentation — https://www.mongodb.com/docs/bi-connector/current/
- Elastic MongoDB connector reference — https://www.elastic.co/docs/reference/search-connectors/es-connectors-mongodb/
- Elasticsearch index mapping API — https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html
- Elasticsearch Query DSL — https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html

## Issues Found

1. **Missing `highlight` option in `$search` stage (line 58-67)**: The query used `$meta: "searchHighlights"` in the `$project` stage but did not include a `highlight` option in the `$search` stage. Atlas Search requires `highlight: { path: [...] }` at the top level of `$search` for highlights to be returned. Added `highlight: { path: ["title", "body"] }` to the `$search` stage.

2. **Incorrect claim about `$searchMeta` for score modification (line 86)**: The post stated that Atlas Search allows score modification via `$searchMeta`. In reality, `$searchMeta` is an aggregation stage that returns search metadata such as facet counts and total result counts — it is not used for score modification. Score modification is done via the `score` option within search operators (e.g., `boost`, `constant`, `function`). Corrected the text to reference the `score` option instead.

3. **Incorrect reference to "MongoDB Connector for BI" for data sync (line 107)**: The post listed "MongoDB Connector for BI" as a tool for syncing data from MongoDB to Elasticsearch. The MongoDB Connector for BI is a SQL interface that allows BI tools (Tableau, Power BI, etc.) to query MongoDB — it has no Elasticsearch sync capability. Changed to "Elastic MongoDB connector" which is the correct tool for this purpose.

## Review Notes
- The `logstash-input-mongodb` plugin shown in the Logstash config is a community plugin with limited update-tracking capabilities. For production MongoDB-to-Elasticsearch sync, MongoDB change streams with a custom consumer or the official Elastic MongoDB connector are more robust approaches. The example is acceptable for illustrative purposes.
- The `undefined` parameter name in the Atlas Search boost score modifier (line 95) is technically correct per MongoDB's API but may confuse JavaScript developers since `undefined` is a reserved identifier in JS. In mongosh, `{ undefined: 1.0 }` creates a key with the string `"undefined"`, which matches the API expectation. No change made since it follows the official API.
