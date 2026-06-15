# Validation Summary: How to Implement Nested Objects in Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch nested field mappings
- Elasticsearch nested queries and inner hits
- Elasticsearch nested and reverse nested aggregations
- Elasticsearch Bulk API
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch nested field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch nested query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-nested-query
- Elasticsearch nested aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-nested-aggregation
- Elasticsearch reverse nested aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-reverse-nested-aggregation
- Elasticsearch `_id` field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field
- Elasticsearch mapping limit settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/mapping-limit
- Elasticsearch Python client querying documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/querying
- Elasticsearch Python client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples

## Issues Found
- The reverse nested aggregation example used a `cardinality` aggregation on `_id`. Elasticsearch restricts `_id` from use in aggregations, sorting, and scripting. I added a parent-level `product_id` keyword field to the nested-products mapping and sample document, then changed the cardinality aggregation to use `product_id`.
- The Bulk API example used `Content-Type: application/json` with `-d`. I changed it to `Content-Type: application/x-ndjson` with `--data-binary`, which matches the NDJSON format expected by bulk requests and preserves newlines.
- The Python client examples used `body=` request dictionaries. I updated the examples to use current typed request parameters such as `mappings=`, `query=`, `aggs=`, and `size=`.
- The nested field limit snippet listed `index.mapping.nested_fields.limit: 50`. Current Elasticsearch documentation lists the default as `100`, so I corrected the value.

## Review Notes
- The core explanation of object-array flattening, nested mappings, nested queries, inner hits, and nested/reverse nested aggregation behavior is consistent with the official Elasticsearch documentation.
- The Python snippet was checked for syntax validity after edits.
- The embedded JSON request bodies and the NDJSON bulk payload were parsed successfully after edits.
