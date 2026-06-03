# Validation Summary: How to Configure OpenSearch Index Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Index State Management (ISM)
- OpenSearch ISM policy APIs
- OpenSearch index templates and aliases
- curl
- jq

## Sources Consulted
- OpenSearch ISM policies documentation: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch ISM API documentation: https://docs.opensearch.org/latest/im-plugin/ism/api/
- OpenSearch ISM error prevention documentation: https://docs.opensearch.org/latest/im-plugin/ism/error-prevention/
- Amazon OpenSearch Service ISM documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html
- OpenSearch index templates documentation: https://docs.opensearch.org/latest/im-plugin/index-templates/
- OpenSearch Roll Over Index API documentation: https://docs.opensearch.org/latest/api-reference/index-apis/rollover/
- Referenced OneUptime blog link: https://oneuptime.com/blog/post/2026-02-12-set-up-opensearch-ingestion-pipelines/view

## Issues Found
- The `ism_template` example used an array. Current OpenSearch ISM policy examples define `ism_template` as an object with `index_patterns` and `priority`, so the snippet was changed to use an object.
- The delete-state notification used an `sns` destination. OpenSearch ISM notification destinations support Slack, Amazon Chime, custom webhook, or notification channels, so the example was changed to use `custom_webhook`.
- The shrink action used `target_alias` and combined `num_new_shards` with `max_shard_size`. OpenSearch ISM shrink uses `aliases` and `target_index_name_template`, and `num_new_shards` cannot be used together with `max_shard_size`, so the example was corrected.
- The `jq` command for listing managed indices treated every top-level explain response value as an index object. OpenSearch also returns `total_managed_indices`, and state/action/step are nested objects, so the filter was updated to select index entries and read `.name` fields.
- The policy update example contained `...` inside JSON, which is not valid JSON for a runnable curl example. It was changed to post a complete policy body from `app-logs-policy-v2.json`.

## Review Notes
The examples target modern OpenSearch ISM APIs using the `_plugins/_ism` endpoint. Amazon OpenSearch Service has additional constraints for cold storage ISM operations, but those constraints do not invalidate the examples because the post does not use Amazon OpenSearch cold storage APIs.
