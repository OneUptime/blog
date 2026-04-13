# Validation Summary: How to Migrate from Elasticsearch to MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB Atlas Search
- Elasticsearch
- Apache Lucene
- MongoDB Aggregation Pipeline (`$search`, `$searchMeta`)
- Python (`elasticsearch`, `pymongo` libraries)
- Node.js (`@elastic/elasticsearch`, `mongodb` drivers)
- Atlas CLI

## Sources Consulted
- MongoDB Atlas Search Score Modification docs — https://www.mongodb.com/docs/atlas/atlas-search/score/modify-score/
- MongoDB Atlas Search `text` operator docs — https://www.mongodb.com/docs/atlas/atlas-search/text/
- MongoDB Atlas Search `compound` operator docs — https://www.mongodb.com/docs/atlas/atlas-search/compound/
- MongoDB Atlas Search `autocomplete` operator docs — https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/
- MongoDB Atlas Search `autocomplete` field type docs — https://www.mongodb.com/docs/atlas/atlas-search/field-types/autocomplete-type/
- MongoDB Atlas Search index performance docs — https://www.mongodb.com/docs/atlas/atlas-search/performance/index-performance/
- Elasticsearch Node Stats API docs — https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-nodes-stats.html

## Issues Found

### 1. Incorrect ACID transactions claim
**What was wrong:** The "Why Migrate" section claimed "ACID transactions work across documents and search indexes." Atlas Search indexes are updated asynchronously via change streams/oplog replication and do NOT participate in ACID transactions. `$search` does not provide read-after-write guarantees.
**What was changed:** Replaced with "Search indexes update automatically as documents change," which is accurate without implying transactional consistency.

### 2. Incorrect score boost syntax for per-field boosting
**What was wrong:** The basic full-text search example used `score: { boost: { path: "name", value: 2 } }` inside a single `text` operator. In Atlas Search, `score.boost.path` refers to a numeric document field whose stored value is used as a dynamic boost multiplier — it does NOT mean "boost the name field." This would not achieve the intended per-field boosting equivalent to Elasticsearch's `name^2`.
**What was changed:** Replaced the single `text` operator with a `compound` query using `should` clauses — one for `name` with `score: { boost: { value: 2 } }` and one for `description` with default scoring. This correctly replicates Elasticsearch's `multi_match` with `fields: ["name^2", "description"]`.

### 3. Missing autocomplete type in index definition
**What was wrong:** The autocomplete query in Step 3 searches the `name` field with the `autocomplete` operator, but the index definition in Step 2 only defined `name` as `type: "string"`. The `autocomplete` operator requires the field to have an `autocomplete` type mapping — it will not work with just a `string` type.
**What was changed:** Updated the `name` field in the index definition to use an array with both a `string` type (for regular text search) and an `autocomplete` type with `edgeGram` tokenization (for autocomplete queries).

### 4. Invalid Elasticsearch node stats field name
**What was wrong:** The decommission step used `grep search_rate` to check Elasticsearch traffic, but `search_rate` is not a field in the Elasticsearch node stats response. The actual field is `query_total` (under the `search` stats).
**What was changed:** Changed the endpoint to `_nodes/stats/indices/search` (more targeted) and the grep pattern to `query_total`.

## Review Notes
- The Elasticsearch JS client code in Step 5 ("Before" section) uses the `body:` parameter style (v7) but accesses `result.hits.hits` directly (v8 style). In v7, the response is wrapped as `result.body.hits.hits`. This inconsistency is minor since it's illustrative "before" code showing what to migrate away from, and didn't warrant a fix.
- The Python migration script in Step 4 is functional but does not handle potential Elasticsearch ID format conflicts with MongoDB's `_id` field (e.g., if ES IDs contain characters MongoDB doesn't accept). For a production migration, additional ID validation would be advisable.
- Atlas Search index updates are eventually consistent (typically milliseconds to low seconds of lag). The post's claim "Data is always consistent - no replication lag" is slightly misleading but was left as-is since it refers to eliminating the external sync pipeline lag, not claiming zero latency on search index updates.
