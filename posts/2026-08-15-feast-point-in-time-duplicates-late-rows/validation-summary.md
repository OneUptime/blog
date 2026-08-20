# Validation Summary: Keep Feast Joins Correct with Duplicate and Late Rows

## Status
validated

## Post Type
Technical Guide / Best Practices

## Technologies Covered
- Feast 0.65.0
- Feast point-in-time historical retrieval
- Feast BigQuery offline store and online-store plugins
- BigQuery GoogleSQL window functions
- Python materialization scheduling
- Event-time processing, deduplication, late data, and reproducible training datasets

## Sources Consulted
- [Feast 0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0) and [Feast on PyPI](https://pypi.org/project/feast/) - latest stable version at the time of review.
- [Feast 0.65.0 `BigQuerySource` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/bigquery_source.py) - constructor parameters and table-source behavior.
- [Feast point-in-time join documentation](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) and [Feast 0.65.0 BigQuery join template](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/bigquery.py) - event-time bounds, TTL handling, created-timestamp deduplication, and entity-row behavior.
- [Feast PR #6617](https://github.com/feast-dev/feast/pull/6617) - the post-0.65.0 opt-in created-timestamp cutoff, its default behavior, and provider support.
- [Feast feature retrieval documentation](https://docs.feast.dev/getting-started/concepts/feature-retrieval) and [FeatureView documentation](https://docs.feast.dev/getting-started/concepts/feature-view) - entity DataFrame timestamps, FeatureServices, and TTL semantics.
- [Feast 0.65.0 `FeatureStore.materialize` implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py) and [production scheduling guide](https://docs.feast.dev/how-to-guides/running-feast-in-production) - materialization signatures, incremental start times, registry history, and overlap windows for late data.
- [Feast online-store model](https://docs.feast.dev/getting-started/components/online-store), [Redis implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/redis.py), and [SQLite implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/sqlite.py) - latest-value storage and plugin-specific stale-write behavior.
- [Feast 0.65.0 Dask offline-store implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/offline_stores/dask.py) - provider-specific deduplication of entity rows.
- [Feast guide to loading the online store](https://docs.feast.dev/how-to-guides/feast-snowflake-gcp-aws/load-data-into-the-online-store) - materialization workflow.
- [BigQuery numbering functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/numbering_functions) and [`SELECT * EXCEPT` syntax](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax#select_except) - validity and determinism requirements of the source-view query.

## Issues Found
1. **Point-in-time protection was stated too broadly.** Feast's default historical join excludes rows with event timestamps after the observation, but a later-created revision with an eligible older event timestamp can still join. Scoped the opening and reproducibility discussion to future-event-time leakage and explicitly preserved the created-time caveat.
2. **Entity DataFrame row preservation was presented as general behavior.** BigQuery and several providers preserve the original left-side rows, but Feast 0.65.0's Dask offline store deduplicates on entity keys plus observation time. Changed the claim to state that preservation is offline-store-specific.
3. **Online stale-write rejection was treated as a universal guarantee.** Feast's online-store model retains one current value, but plugins do not enforce incoming timestamps uniformly: Redis rejects older or equal timestamps by default, while SQLite unconditionally upserts. Changed the post to require verification against the selected plugin.
4. **The incremental materialization boundary was described as a saved start watermark.** Feast normally uses the previous materialization's saved end time as the next incremental window's start. Reworded the explanation to match the implementation.
5. **The final upstream SQL tie-breaker was not explicitly required to be unique.** BigQuery `ROW_NUMBER()` is non-deterministic among peers with an identical ordering tuple. Clarified that `revision_id` must be a unique, deterministic identifier.

## Review Notes
- The `BigQuerySource(table=..., timestamp_field=..., created_timestamp_column=...)` and `store.materialize(start_date=..., end_date=..., feature_views=[...])` examples match Feast 0.65.0's current stable Python API.
- Feast's BigQuery join uses inclusive event-time bounds: the feature event must be at or before the observation and, when TTL is nonzero, at or after `observation - TTL`.
- Current Feast master documents an opt-in `filter_by_created_timestamp=True` mode for supported offline stores, but it is not present in the latest stable 0.65.0 release and is disabled by default on master. A globally deduplicated latest-revision source view also removes the older revisions needed for a true as-known-time lookup.
- The BigQuery SQL is valid GoogleSQL after making the uniqueness requirement explicit. All external links in the post returned HTTP 200 and led to the intended official resources.
