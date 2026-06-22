# Validation Summary: How to Tune Elasticsearch Indexing Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- Elasticsearch Bulk API
- Elasticsearch index settings
- Elasticsearch mappings and analyzers
- Elasticsearch Python client
- Linux system tuning for Elasticsearch
- curl and jq

## Sources Consulted
- Elastic Docs: Tune for indexing speed - https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed
- Elastic Docs: Bulk API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elastic Docs: Thread pool settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elastic Docs: Translog settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/translog
- Elastic Docs: Force merge API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge
- Elastic Docs: Python client helpers - https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers
- Elastic Docs: Indexing buffer settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/indexing-buffer-settings
- Elastic Docs: File descriptors - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/file-descriptors
- Elastic Docs: Disable swapping - https://www.elastic.co/guide/en/elasticsearch/reference/8.19/setup-configuration-memory.html

## Issues Found
- Bulk API curl examples used `-d` and `Content-Type: application/json` for NDJSON payloads. Updated bulk examples to use `--data-binary` and `application/x-ndjson` where appropriate so newlines are preserved and the examples match Bulk API guidance.
- The `jq` bulk-error filter only checked `index` actions. Updated it to detect errors from `index`, `create`, `update`, and `delete` bulk actions.
- The Python error-handling example used the older direct `es.bulk(body=actions)` style. Replaced it with `elasticsearch.helpers.bulk(..., raise_on_error=False)` and error inspection that matches the current official Python helper guidance.
- The refresh interval description said the default is always 1 second. Updated it to note that Elasticsearch refreshes every second by default only for indices searched in the last 30 seconds.
- The thread pool example was labeled as an index thread pool and suggested tuning without context. Updated the label to write thread pool and added the static, expert-level caveat.
- The analyzer example referenced a `synonym` token filter without defining synonyms, which would not be a valid analyzer configuration. Replaced it with built-in filters that do not require additional synonym configuration.
- The Python client connection example omitted the URL scheme. Updated it to `http://localhost:9200`.
- The routing section implied custom routing automatically distributes indexing across shards. Reworded it to recommend high-cardinality routing values and monitoring for hot shards.
- The SSD claim used an unsupported fixed multiplier. Reworded it to the more accurate claim that SSDs usually provide significantly better throughput and latency than HDDs.
- The force merge guidance was too broad. Added the official caveat that force merge is recommended only for read-only indices.
- The bulk rejection guidance suggested increasing queue size as a normal response. Replaced it with reducing request rate, reducing worker concurrency, or adding indexing capacity.
- The indexing lifecycle summary said Elasticsearch eventually flushes to disk as segments. Clarified that it flushes and commits segments to disk.

## Review Notes
The post is now technically consistent with current Elasticsearch documentation for a general self-managed Elasticsearch deployment. Some tuning values, such as bulk size, indexing buffer size, worker count, and thread pool sizing, remain workload-dependent and should be benchmarked in the target cluster before use in production.
