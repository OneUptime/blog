# Validation Summary: How to Bulk Index JSON Data in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Bulk API
- Elasticsearch index settings and thread pools
- Python elasticsearch-py helpers
- Node.js @elastic/elasticsearch client
- cURL
- jq
- NDJSON

## Sources Consulted
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch indexing speed guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed
- Elasticsearch thread pool settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elasticsearch nodes stats API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats
- Elasticsearch Force Merge API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge
- Python Elasticsearch client helpers documentation: https://elasticsearch-py.readthedocs.io/en/stable/api_helpers.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- JavaScript Elasticsearch client bulk examples: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/bulk_examples
- JavaScript Elasticsearch client helper documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/client-helpers

## Issues Found
- The initial NDJSON format example used `{"action": ...}` as if `action` were a valid bulk operation name. Changed it to `{"index": ...}` and adjusted the explanation to say most operations include a source line, since `delete` has no source line.
- Several Elasticsearch request examples were fenced as `json` even though they included HTTP request lines and comments. Changed those fences to `http` so the snippets are not presented as valid JSON documents.
- The Node.js examples used the older `body` parameter for `client.bulk`. Updated them to the current `operations` parameter used by the official JavaScript client examples.
- The Node.js error handling assumed every bulk response item used the `index` action. Updated it to inspect the actual operation key from each response item.
- The Node.js retry example reported success when all failures were permanent, non-retryable errors. Updated it to return permanent failures and set `success` to `false` when they occur.
- The thread pool section stated that the `bulk` thread pool was renamed to `write` in Elasticsearch 7.x. Updated it to note that `bulk` was replaced by `write` in Elasticsearch 6.3 and that Elasticsearch 9.1 and later use `write_coordination` for bulk coordination.
- The thread pool stats request used `GET /_nodes/stats/thread_pool/write`, which is not the documented nodes stats metric path. Updated it to `GET /_nodes/stats/thread_pool`.
- The data transformation Python snippet used `datetime.utcnow()` without importing `datetime`. Replaced it with `datetime.now(timezone.utc).isoformat()` and added the required imports.

## Review Notes
- The force merge example is technically valid, but force merge should only be used after writes have stopped or on read-only indices because it is expensive and can harm active write-heavy indices.
- Batch-size recommendations are reasonable as practical guidance, but Elasticsearch's official recommendation is to benchmark for the workload and avoid requests beyond a couple tens of megabytes.
