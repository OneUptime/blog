# Validation Summary: How to Debug Elasticsearch Indexing Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Elasticsearch indexing APIs
- Elasticsearch mappings and nested fields
- Elasticsearch Bulk API
- Elasticsearch ingest pipelines and processors
- Elasticsearch thread pools and rejection monitoring
- Python requests-based indexing examples
- curl-based Elasticsearch API usage

## Sources Consulted
- Elasticsearch Index API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-index
- Elasticsearch Validate Query API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-validate-query
- Elasticsearch Bulk API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch array and nested mapping behavior: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/array
- Elasticsearch nested field type: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch dynamic mapping behavior: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dynamic
- Elasticsearch convert processor: https://www.elastic.co/docs/reference/enrich-processor/convert-processor
- Elasticsearch ingest pipeline API and on_failure behavior: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-pipeline
- Elasticsearch simulate pipeline API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-simulate
- Elasticsearch thread pool settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elasticsearch cat thread pool API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-thread-pool
- Elasticsearch disk watermark troubleshooting: https://www.elastic.co/docs/troubleshoot/elasticsearch/fix-watermark-errors

## Issues Found
- The "Validate a Document" example used the Validate Query API, which validates query syntax rather than document compatibility with mappings. Changed it to a single-document indexing test that surfaces mapping errors directly.
- The debugging workflow used `_doc?dry_run=true`, but Elasticsearch does not support a dry-run option for indexing. Replaced it with a test indexing request and clarified the limitation.
- The nested-object section only changed the mapping to `nested`; nested fields also require a `nested` query to preserve per-object matching. Added the corresponding nested query example.
- The ingest convert pipeline used `ignore_failure: true`, which would allow an unconverted bad value to continue and still fail against a numeric mapping. Replaced it with processor-level `on_failure` that sets a safe default.
- The pipeline error-handling example set `ignore_failure: true` on processors while also relying on pipeline-level `on_failure`. Since ignored processor failures do not trigger pipeline-level failure handling, removed the `ignore_failure` flags.
- The rejection guidance recommended `thread_pool.write.queue_size: 2000` as an "increase", but modern Elasticsearch defaults are commonly higher and bulk coordination uses `write_coordination` in recent versions. Replaced it with client-side bulk-size/concurrency reduction guidance and updated monitoring commands to include `write_coordination`.
- The dead-letter queue JSON used `[...]` in a JSON code block, which is not valid JSON. Replaced it with an empty `processors` array placeholder.

## Review Notes
The post is generally accurate after the fixes. It remains version-neutral; future improvements could call out Elasticsearch version differences explicitly, especially around bulk coordination thread pools in Elastic Stack 9.x.
