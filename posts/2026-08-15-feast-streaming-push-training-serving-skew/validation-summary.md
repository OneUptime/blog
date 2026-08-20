# Validation Summary: Push Streaming Features to Both Feast Stores Without Skew

## Status

validated

## Post Type

Technical architecture and implementation guide

## Technologies Covered

- Feast Python SDK
- Feast `PushSource`, `FeatureView`, and `FeatureStore.push`
- Feast online and offline stores
- Point-in-time historical feature retrieval
- Materialization and the Feast SQL registry
- Redis, DynamoDB, and PostgreSQL online stores
- Kafka, Kinesis, and durable streaming logs
- Feast Python feature server and Prometheus metrics

## Sources Consulted

- Feast PushSource documentation - https://docs.feast.dev/reference/data-sources/push
- Feast data-ingestion documentation - https://docs.feast.dev/getting-started/concepts/data-ingestion
- Feast Kafka source documentation - https://docs.feast.dev/reference/data-sources/kafka
- Feast offline-store overview and functionality matrix - https://docs.feast.dev/reference/offline-stores/overview
- Feast online-store overview - https://docs.feast.dev/getting-started/components/online-store
- Feast Redis online-store documentation - https://docs.feast.dev/reference/online-stores/redis
- Feast DynamoDB online-store documentation - https://docs.feast.dev/reference/online-stores/dynamodb
- Feast PostgreSQL online-store documentation - https://docs.feast.dev/reference/online-stores/postgres
- Feast point-in-time join documentation - https://docs.feast.dev/getting-started/concepts/point-in-time-joins
- Feast Python feature-server documentation - https://docs.feast.dev/reference/feature-servers/python-feature-server
- Feast SQL registry documentation - https://docs.feast.dev/reference/registries/sql
- Feast production guidance - https://docs.feast.dev/how-to-guides/running-feast-in-production
- Feast package metadata on PyPI - https://pypi.org/project/feast/
- Feast 0.65.0 `FeatureStore.push` and offline-write implementation - https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py
- Feast 0.65.0 DataFrame-to-online-row conversion - https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/utils.py
- Feast 0.65.0 entity implementation - https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/entity.py
- Feast 0.65.0 Redis, DynamoDB, SQLite, and PostgreSQL online-store implementations - https://github.com/feast-dev/feast/tree/v0.65.0/sdk/python/feast/infra/online_stores

## Issues Found

- The `Entity` example omitted `value_type`, which emits a `DeprecationWarning` in Feast 0.65.0 because the field is planned to become mandatory. Added `ValueType.INT64` for the example's `account_id` contract.
- The DataFrame requirements were incomplete. Online conversion also requires the batch source's configured timestamp field and its created-timestamp field when configured. For `OFFLINE` and `ONLINE_AND_OFFLINE`, Feast requires the DataFrame column set to match the batch-source table exactly; extra or missing columns raise `ValueError`. Updated the explanation accordingly.
- The partial-write discussion implied either ordering within one combined synchronous push. Feast currently attempts the online write before the offline write for each consuming FeatureView and provides no rollback. Clarified that order and distinguished it from states arising across retries or separate writers.
- The statement that Feast's online store always keeps the greatest event-time value was too broad. Feast retains current state rather than history, but stale-event rejection is backend-specific: Redis compares timestamps by default, while other implementations can use unconditional overwrite behavior. Replaced the universal claim with a store-specific warning.
- The post did not distinguish created-timestamp deduplication from as-known-at-time retrieval. By default, `created_timestamp_column` is a tie-breaker for rows with the same event timestamp, not a cutoff against the entity timestamp. Added conditional guidance for `filter_by_created_timestamp=True` or an equivalent warehouse filter.
- The concurrent-write matrices explicitly mark Redis support as `yes` and DynamoDB/PostgreSQL support as `no`; the wording was made explicit. The SQL registry wording was also corrected from generic "progress metadata" to serialized materialization metadata updates.

## Review Notes

Feast 0.65.0 was the current PyPI release on the validation date; current Feast documentation and master source were also checked for newer documented behavior. `filter_by_created_timestamp=True` depends on the installed Feast version and offline-store support, which the corrected post now states. The names `account_batch_source` and `feature_rows` remain intentional placeholders, so the snippets require a configured batch source and an actual DataFrame. Built-in push counters identify source and mode but do not prove eventual success of a batched offline flush, so the post's recommendation for producer-side outcome telemetry remains necessary. All external links in the post returned HTTP 200 and pointed to the intended resources.
