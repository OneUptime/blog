# Validation Summary: MongoDB vs Elasticsearch: Search and Storage Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (general-purpose document database, Atlas Search)
- Elasticsearch (distributed search and analytics engine)
- Apache Lucene (underlying Atlas Search engine)
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Logstash, Kafka connectors, MongoDB change streams (data sync tools)

## Sources Consulted
- Elasticsearch official documentation: multi_match query, bool query, range query, terms aggregation, index settings — https://www.elastic.co/guide/en/elasticsearch/reference/current/
- MongoDB official documentation: updateOne, aggregation pipeline ($match, $group, $sort) — https://www.mongodb.com/docs/manual/
- MongoDB Atlas Search documentation: $search aggregation stage, text operator, fuzzy option — https://www.mongodb.com/docs/atlas/atlas-search/
- Elasticsearch update mechanism (immutable segments, delete-and-reindex) — https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update.html
- MongoDB Connector for BI documentation (confirmed it is a SQL translation layer, not a data sync tool) — https://www.mongodb.com/docs/bi-connector/current/

## Issues Found

1. **Elasticsearch aggregation missing time range filter**: The Elasticsearch aggregation example was labeled "equivalent" to the MongoDB aggregation, but the MongoDB query filtered on `ts >= now - 1 day` while the Elasticsearch query had no time range filter. Added a `bool` query with both a `term` filter for level and a `range` filter on `ts` using `"gte": "now-1d"` to make it a proper equivalent.

2. **Incorrect sync tool reference ("MongoDB Connector for BI")**: The summary mentioned "MongoDB Connector for BI" as a tool for syncing data from MongoDB to Elasticsearch. The Connector for BI is actually a SQL translation layer that allows BI tools to query MongoDB via SQL — it has nothing to do with syncing data to Elasticsearch. Replaced with "MongoDB change streams, or Kafka connectors," which are the actual tools used for this purpose.

## Review Notes
- The JSON code blocks contain `//` comments (lines 19 and 77), which are not valid in strict JSON. This is a common convention in technical blog posts for annotation purposes and most readers understand it, but the examples cannot be copy-pasted directly into tools that expect valid JSON. Changing the language tag to `jsonc` could help, but may not render consistently across all markdown renderers.
- The Elasticsearch `terms` aggregation uses `"size": 10` which limits results to the top 10 buckets, while the MongoDB equivalent has no such limit. This is a reasonable practical default and not an error, but worth noting for readers who need exhaustive grouping.
- All other technical claims are accurate: BM25 as the default scoring algorithm, Elasticsearch's immutable document model, MongoDB Atlas Search being powered by Lucene, and the general characterization of scaling models for both systems.
