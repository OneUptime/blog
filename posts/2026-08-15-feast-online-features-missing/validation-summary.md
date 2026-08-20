# Validation Summary: Why Are Feast Online Features Missing After Materialization?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Feast 0.65.0
- Feast CLI and feature repositories
- Feast registry configuration and caching
- FeatureViews, FeatureServices, and schema validation
- Batch materialization and online stores
- Entity join keys and key serialization
- Feast Python SDK and Python feature server
- Prometheus metrics
- SQL source diagnostics

## Sources Consulted
- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0) - latest stable release as of the validation date.
- [Feast CLI reference](https://docs.feast.dev/reference/feast-cli-commands) - CLI commands, materialization flags, and documented `apply` behavior.
- [Feast online store documentation](https://docs.feast.dev/getting-started/components/online-store) - online-store state and materialization model.
- [Load data into the online store](https://docs.feast.dev/how-to-guides/feast-snowflake-gcp-aws/load-data-into-the-online-store) and [running Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production) - materialization and incremental late-data guidance.
- [Feast Entity documentation](https://docs.feast.dev/getting-started/concepts/entity) and [FeatureView entity aliasing](https://docs.feast.dev/getting-started/concepts/feature-view#entity-aliasing) - join keys, composite entities, and projected aliases.
- [Feast FeatureViews and schema validation](https://docs.feast.dev/getting-started/concepts/feature-view) - current `FeatureView` API and validation behavior.
- [Feast Python feature server](https://docs.feast.dev/reference/feature-servers/python-feature-server) - registry refresh, response statuses, materialization endpoints, and Prometheus metrics.
- [Feast v0.65.0 repository reconciliation code](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/repo_operations.py) and [registry diff code](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/diff/registry_diff.py) - actual CLI `apply` deletion behavior.
- [Feast v0.65.0 `FeatureStore.apply()` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py) and [FeatureView implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_view.py) - partial SDK apply defaults, materialization state, and enabled/lifecycle gates.
- [Feast v0.65.0 request preparation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/utils.py), [type conversion](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/type_map.py), and [entity-key encoding](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/key_encoding_utils.py) - entity-name compatibility, registered-type coercion, composite keys, and serialization.
- Feast v0.65.0 online-store implementations for [SQLite](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/sqlite.py), [PostgreSQL](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/postgres_online_store/postgres.py), and [Redis](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/redis.py) - backend-specific timestamp conflict behavior.

## Issues Found
1. **Serialization defaults were excluded from the configuration comparison.** The post only called out `entity_key_serialization_version` when explicitly configured. Changed this to compare the resolved value, including defaults, because differently resolved versions produce different physical keys.
2. **Current FeatureView serving gates were incomplete.** Feast 0.65.0 includes an `enabled` flag and lifecycle state that can block materialization or serving even when online writing is configured. Added these checks and named the relevant online-write controls.
3. **`feast apply` deletion behavior was incorrect.** The post repeated the current documentation's claim that removing a declaration does not delete the registry object. Feast 0.65.0's released CLI actually computes a full repository diff and deletes objects absent from the scanned repository. Corrected the paragraph and distinguished CLI reconciliation from `FeatureStore.apply()`, which remains partial by default. The official CLI and registry prose is inconsistent with released code on this point.
4. **Older-row overwrite protection was presented as a general guarantee.** Current SQLite and PostgreSQL online stores update conflicts without an event-timestamp predicate, while Redis normally checks timestamps unless `skip_dedup` is enabled. Reworded the claim to make stale-write protection explicitly backend- and configuration-specific.
5. **Entity-name and native-type requirements were overstated.** Physical join keys remain the recommended request keys, but the current Python SDK accepts Entity names through a deprecated compatibility path. It also coerces compatible inputs according to the registered entity type, so a numeric string is not guaranteed to address a different key. Updated the bullets and clarified that the dangerous mismatch is disagreement in registered type or serialization between writer and reader.
6. **Prometheus metric types were imprecise.** Replaced the plural “materialization counters” wording with the documented materialization result counter, duration histogram, and freshness gauge.

## Review Notes
- The review used Feast 0.65.0, the latest stable release on 2026-08-20, and cross-checked current upstream source. The post does not pin a Feast version, so its recommendation to inspect `feast --help` for the deployed release remains important.
- The four CLI commands in the diagnostic block are current. The `-v` / `--views` materialization selector and `--disable-event-timestamp` behavior are also current.
- The Python `FeatureView` and `get_online_features()` snippets use current APIs. Schema validation raises for missing declared feature columns and warns for type mismatches as stated.
- Materialization source filters use inclusive start and end boundaries in the checked core implementations, matching the sample diagnostic query. Timestamp-literal syntax is warehouse-specific and may need adaptation to the configured offline store.
- Online response statuses are available in the REST/protobuf surface; Python `OnlineResponse.to_dict()` exposes missing values but not statuses, so the post's client-surface qualification is accurate.
- All five documentation links in the post returned HTTP 200 and point to the intended official Feast resources.
