# Validation Summary: How to Handle Nested Objects in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch mappings
- Elasticsearch nested field type
- Elasticsearch Query DSL
- Elasticsearch aggregations
- Elasticsearch inner hits
- Elasticsearch Update API and Painless scripts
- Elasticsearch join field parent-child modeling
- curl REST API examples

## Sources Consulted
- Elasticsearch nested field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch nested query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-nested-query
- Elasticsearch nested aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-nested-aggregation
- Elasticsearch mapping limit settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/mapping-limit
- Elasticsearch join field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/parent-join
- Elasticsearch Update API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update
- Elasticsearch Painless lambda documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-lambdas
- Elasticsearch cat indices API documentation for Lucene document counts: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices

## Issues Found
- The reverse nested aggregation used `name.keyword`, but the `products-nested` mapping defined `name` only as `text`. I added a `keyword` multi-field to `name` so the `terms` aggregation on `name.keyword` is backed by an actual mapped field.
- The "Set Limits for Nested Objects" section said these settings prevent mapping explosion. `index.mapping.nested_fields.limit` limits distinct nested mappings, while `index.mapping.nested_objects.limit` limits nested JSON objects per document to avoid memory problems. I adjusted the sentence to "Prevent excessive nested mappings and documents" to match Elasticsearch's documented behavior.

## Review Notes
- The examples are otherwise consistent with current Elasticsearch documentation: arrays of objects are flattened unless mapped as `nested`, nested queries preserve per-object matching, supported nested `score_mode` values are accurate, nested and reverse nested aggregation syntax is valid, join-field routing for child documents is shown correctly, and Painless lambda syntax such as `removeIf(review -> ...)` is supported.
- The curl examples assume the reader's local Elasticsearch HTTPS certificate setup accepts the connection. A default secured local Elasticsearch installation may require a CA certificate option such as `--cacert` or an equivalent local TLS setup.
