# Validation Summary: How to Build Elasticsearch Transform Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch transforms
- Pivot transforms
- Latest transforms
- Elasticsearch Query DSL
- Elasticsearch aggregations
- Elasticsearch Transform APIs
- Elasticsearch Index Lifecycle Management

## Sources Consulted
- Elastic Docs: Transforms overview - https://www.elastic.co/docs/explore-analyze/transforms/transform-overview
- Elastic API Docs: Create transform - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-put-transform
- Elastic API Docs: Preview transform - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-preview-transform
- Elastic API Docs: Start transform - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-start-transform
- Elastic API Docs: Stop transforms - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-stop-transform
- Elastic API Docs: Get transform stats - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform-stats
- Elastic API Docs: Update transform - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-update-transform
- Elastic API Docs: Delete transform - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-delete-transform
- Elastic Docs: Filter aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-filter-aggregation

## Issues Found
- The source filtering example used a `range` query on `log_level` with `gte: "ERROR"`, which is lexicographic string comparison and does not represent log severity ordering. Changed it to a `terms` query for `ERROR` and `FATAL`.
- The "Scripted Metrics" subsection showed a `bucket_script` pipeline aggregation, not a `scripted_metric` aggregation. Renamed the subsection to "Pipeline Metrics" while keeping the valid example.
- The ILM section said the sample applied an ILM policy, but the snippet only creates a policy. Clarified that the policy still needs to be attached through an index template or index settings.
- The update section incorrectly stated that transforms cannot be modified while running and that deleting/recreating resumes from where it left off. Replaced it with the supported `_update` workflow and clarified that breaking changes require recreation and reprocessing.

## Review Notes
- Transform create, preview, start, stop, stats, update, and delete API paths were checked against current Elastic API documentation.
- Pivot and latest transform behavior, continuous checkpoints, `frequency`, `sync.time.delay`, `max_page_search_size`, supported pivot aggregations, and latest transform `unique_key`/`sort` fields were verified against Elastic documentation.
- The examples assume grouped string fields such as `country`, `service.name`, and HTTP fields are mapped as `keyword` or otherwise aggregatable fields in the source indices.
