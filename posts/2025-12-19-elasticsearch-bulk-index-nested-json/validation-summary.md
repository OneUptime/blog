# Validation Summary: How to Bulk Index Nested JSON in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Elasticsearch Bulk API
- Elasticsearch nested field mappings and nested queries
- Elasticsearch index settings and refresh behavior
- Elasticsearch Tasks API
- Python
- Python Elasticsearch client helpers
- cURL
- NDJSON

## Sources Consulted
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch nested field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch indexing speed guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed
- Elasticsearch index settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elasticsearch update index settings API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings
- Elasticsearch Tasks API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-tasks-list
- Python Elasticsearch client helper documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers
- Python Elasticsearch client 8.12 helper reference: https://elasticsearch-py.readthedocs.io/en/v8.12.0/helpers.html
- Python Elasticsearch client exception migration notes: https://www.elastic.co/guide/en/elasticsearch/client/python-api/8.19/migration.html

## Issues Found
- The Bulk API section said each operation requires two lines. This is only true for index/create operations; delete operations use only an action line and update operations use an action line plus update payload. Changed the wording to "Each index operation requires two lines" to match the example.
- The Bulk API section did not mention that the final NDJSON line must end with a newline. Added that requirement because Elasticsearch documents it explicitly for bulk requests.
- The parallel bulk Python example imported `concurrent.futures` but did not use it. Removed the unused import.
- The retry example attempted to retry bulk error response dictionaries as if they were original bulk action documents. Replaced it with `helpers.streaming_bulk()` using `max_retries`, `initial_backoff`, and `max_backoff`, which is the Python client's documented retry path for 429 bulk rejections.

## Review Notes
The post is technically accurate after the fixes. Future improvements could mention that setting `number_of_replicas` to `0` reduces availability and should be limited to controlled initial loads or cases where the data can be replayed.
