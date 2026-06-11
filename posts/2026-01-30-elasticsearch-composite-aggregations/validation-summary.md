# Validation Summary: How to Create Elasticsearch Composite Aggregations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch composite aggregations
- Elasticsearch bucket and metrics aggregations
- Elasticsearch Search API
- Elasticsearch JavaScript client
- Elasticsearch Python client
- Node.js async generators
- Python generators

## Sources Consulted
- Elasticsearch composite aggregation reference: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-composite-aggregation
- Elasticsearch Search API reference: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch JavaScript client API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Elasticsearch aggregations documentation: https://www.elastic.co/docs/explore-analyze/query-filter/aggregations

## Issues Found
- The post stated that standard bucket aggregations return all buckets at once. This is imprecise for aggregations such as `terms`, which return a configured number of buckets and do not provide cursor-style pagination through all buckets. Updated the wording to explain the actual limitation: standard bucket aggregations build bucket results for a single response rather than exposing a cursor over every bucket.
- The pagination section did not mention the official Elasticsearch caveat that `after_key` should not be derived from the last bucket. Added a sentence instructing readers to use the returned `after_key` because it is usually, but not guaranteed to be, the last bucket key.
- The early termination section implied that sorting by indexed fields was enough. Elasticsearch requires the index sort to match a prefix of the composite source order and sort direction for optimal early termination. Updated the explanation and example to mention matching `index.sort.field` / sort direction and `track_total_hits: false`.

## Review Notes
The remaining request examples use valid composite aggregation structure, supported value sources, per-source sort order, sub-aggregations, and pagination with `after`. The JavaScript and Python snippets use current client-style request parameters and response access patterns for modern Elastic clients.
