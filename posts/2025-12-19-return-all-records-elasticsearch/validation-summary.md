# Validation Summary: How to Return All Records in Elasticsearch

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Elasticsearch Search API
- Elasticsearch pagination with `from` / `size`
- Elasticsearch Scroll API
- Elasticsearch `search_after`
- Elasticsearch Point in Time (PIT)
- Python Elasticsearch client
- `elasticsearch.helpers.scan`

## Sources Consulted
- Elasticsearch: Paginate search results: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch: `_id` field: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field
- Elasticsearch API: Open a point in time: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time
- Elasticsearch Python client API reference: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- Elasticsearch Python client helpers: https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers
- Python Elasticsearch client helper API reference: https://elasticsearch-py.readthedocs.io/en/stable/api_helpers.html

## Issues Found
- The `search_after` examples used `_id` as a sort field. Elasticsearch restricts the `_id` metadata field from sorting, aggregations, and scripting. Changed the examples to use `product_id.keyword` and added a note that the tiebreaker should be a unique field with `doc_values` enabled.
- The post described `search_after` as resilient to index changes. Elasticsearch documentation says refreshes between `search_after` requests can change result ordering and cause inconsistent pages unless PIT is used. Replaced that advantage with a narrower, accurate statement that `search_after` works on live data when a consistent snapshot is not required.
- The decision diagram and scroll section implied Scroll API is the main large-dataset recommendation. Elastic currently says Scroll API is no longer recommended for deep pagination and recommends PIT + `search_after` when preserving index state beyond 10,000 hits. Updated the diagram and scroll introduction while keeping Scroll API as valid for batch processing and one-off exports.

## Review Notes
The Python examples use request bodies in `es.search(...)`; the current Python client API still supports `body`, while also exposing typed keyword parameters such as `query`, `size`, `sort`, `pit`, and `search_after`. Future improvements could modernize the Python snippets to keyword parameters, but this was not required for correctness.
