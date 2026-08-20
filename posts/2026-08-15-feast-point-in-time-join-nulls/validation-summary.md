# Validation Summary: Why Does a Feast Point-in-Time Join Return Nulls?

## Status

validated

## Post Type

Technical debugging guide

## Technologies Covered

- Feast 0.65.0 and current Feast development documentation
- Feast historical feature retrieval and point-in-time joins
- FeatureViews, Entities, entity keys, TTL, and FeatureView projections
- BigQuery offline store and GoogleSQL
- Python, Pandas DataFrames, and `get_historical_features`
- On-demand FeatureViews, registries, and `feast apply`

## Sources Consulted

- [Feast 0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0) - latest stable release at the time of review.
- [Feast point-in-time join documentation](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) and the [Feast 0.65.0 BigQuery join implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/bigquery.py) - event-time bounds, inclusive TTL handling, nulls from the final left join, and duplicate resolution.
- [Feast feature retrieval documentation](https://docs.feast.dev/getting-started/concepts/feature-retrieval), the [Feast 0.65.0 `FeatureStore.get_historical_features` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py), and the [timestamp-inference helper](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/offline_utils.py) - feature-reference syntax, entity DataFrame requirements, TTL behavior, and timestamp inference.
- [Feast entity documentation](https://docs.feast.dev/getting-started/concepts/entity) and the [Feast 0.65.0 `Entity` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/entity.py) - single join-key support, default join-key behavior, value types, and composite entity keys.
- [Feast FeatureView documentation](https://docs.feast.dev/getting-started/concepts/feature-view) and the [Feast 0.65.0 `with_join_key_map` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_view.py) - FeatureView TTL and entity aliasing.
- [Feast 0.65.0 `BigQuerySource` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/bigquery_source.py) - current constructor names, field mappings, event timestamps, and creation timestamps.
- [Feast registry documentation](https://docs.feast.dev/getting-started/components/registry), [`feature_store.yaml` reference](https://docs.feast.dev/reference/feature-repository/feature-store-yaml), and the [feature-repository documentation](https://docs.feast.dev/getting-started/concepts/feature-repo) - registry selection, cache refresh behavior, and `feast apply`.
- [Feast on-demand FeatureView documentation](https://docs.feast.dev/reference/beta-on-demand-feature-view) - historical execution of on-demand transformations.
- [GoogleSQL lexical syntax](https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical) and [BigQuery data types and time zones](https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types#time_zones) - table references and timestamp-literal syntax.
- [Feast PR #6617](https://github.com/feast-dev/feast/pull/6617) - the post-0.65.0 opt-in `filter_by_created_timestamp` behavior and its default.

## Issues Found

1. **The point-in-time description did not explicitly distinguish source event time from creation time.** Scoped the three listed predicates to Feast's default join and clarified that a row is excluded when its source event timestamp is after the entity timestamp. This matters because creation timestamps are deduplication keys in Feast 0.65.0 and are not event-time cutoffs by default on current master.
2. **The Entity wording implied that `join_keys` must always be supplied.** Clarified that an Entity supports one physical join key, a non-default value is set through a single-item `join_keys` list, and omission defaults the join key to the Entity name.
3. **The `BigQuerySource` example omitted its import.** Added `from feast import BigQuerySource`, so the snippet works in a fresh Python module or notebook with Feast installed.
4. **The null-diagnosis guidance implied that Feast returns the matched source row's event timestamp.** Historical retrieval normally returns the entity DataFrame's lookup timestamp plus requested features, not the selected source timestamp. Changed the guidance to inspect the source timestamp in the raw source and request the FeatureView features through Feast.
5. **Duplicate behavior was described only as nondeterministic row selection.** Clarified that, without an effective creation-time tie-breaker, behavior is offline-store-dependent and can be nondeterministic or can produce duplicate result rows. Feast's BigQuery query can preserve tied duplicate rows, while other stores may select one.

## Review Notes

- Reviewed against Feast 0.65.0, the latest stable release as of 2026-08-20, and current Feast master at commit `e79bd331694ffc7dd6023465b17348470afbe4e6` from 2026-08-19.
- Feast master includes the post-0.65.0 opt-in `filter_by_created_timestamp=True` mode for supported offline stores. It is disabled by default and is not part of Feast 0.65.0, so the post correctly describes the default event-time join after the wording correction.
- The published retrieval documentation requires an `event_timestamp` entity DataFrame column. Feast 0.65.0's implementation can infer a differently named timestamp only when exactly one datetime-typed column exists; using the reserved name remains the portable documented convention.
- The BigQuery TTL interval is inclusive at both ends for a positive TTL, and the SQL timestamp literals and two-part table name are valid GoogleSQL.
- The Entity, `BigQuerySource`, feature-reference, Pandas probe, registry, and `feast apply` examples use current, non-deprecated Feast 0.65.0 APIs.
- All four official documentation links in the post returned HTTP 200 and pointed to the intended Feast concept pages during validation.
