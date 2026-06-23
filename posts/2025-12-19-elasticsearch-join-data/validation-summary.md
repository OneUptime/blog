# Validation Summary: How to Join Data in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch mappings
- Elasticsearch nested fields and nested queries
- Elasticsearch join field, has_parent, has_child, and children aggregations
- Elasticsearch terms lookup queries
- Python Elasticsearch client
- curl

## Sources Consulted
- Elasticsearch join field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/parent-join
- Elasticsearch has_parent query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-has-parent-query
- Elasticsearch has_child query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-has-child-query
- Elasticsearch nested field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch nested query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-nested-query
- Elasticsearch nested aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-nested-aggregation
- Elasticsearch children aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-children-aggregation
- Elasticsearch terms query and terms lookup documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-query
- Elasticsearch keyword field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- Elasticsearch Python client helper documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers

## Issues Found
- The parent-child overview described the model as "Same Index, Different Types". Elasticsearch join fields define parent-child relations inside one index, but they are not legacy mapping types. Changed this to "Same Index, Join Relations".
- The denormalized customer query used a `term` query on `customer.tier` without an explicit keyword mapping. Since exact-value filters should use `keyword` fields, changed the query to `customer.tier.keyword`.
- The terms lookup example queried `product_id` without defining it as a keyword field. Product IDs are exact identifiers, and the terms query should target a keyword field. Added a minimal products index mapping with `product_id` as `keyword` before the terms lookup query.

## Review Notes
- The parent-child examples correctly use a `join` field, same-index documents, and routing for child documents.
- The nested mapping, nested query, and nested aggregation examples match the documented Elasticsearch patterns.
- The Python examples use the official Elasticsearch Python client and bulk helper patterns. For production-sized datasets, the helper's `size: 10000` searches should be replaced with paging, PIT/search_after, scroll, or a helper-based scan pattern.
