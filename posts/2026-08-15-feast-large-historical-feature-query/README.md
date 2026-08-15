# Speed Up Large Feast Historical Feature Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Historical Features, Entity DataFrame, Point-in-Time Join, Offline Store, Performance

Description: Reduce large historical retrieval cost by pushing entities into the offline engine, narrowing time and columns, and avoiding local materialization.

---

`get_historical_features` can be slow or memory-hungry for two independent reasons: the offline engine performs an expensive point-in-time join, or the client downloads a large result into local Pandas memory. Optimize those boundaries separately.

The entity DataFrame controls both join cardinality and the time range Feast must inspect. A million redundant entity rows can be more expensive than a wide feature source, while `.to_df()` can exhaust the client after a warehouse query finishes successfully.

## Measure Query and Client Phases

Record:

- entity rows and distinct entity/time pairs;
- requested FeatureViews and fields;
- minimum and maximum entity timestamps;
- source bytes scanned and warehouse execution time;
- join output rows and bytes;
- download time and Python peak resident memory;
- ODFV transformation time.

Feast offline-store APIs return a retrieval job, and implementations commonly execute lazily when results are converted or persisted. A fast `get_historical_features(...)` call does not prove the actual query is fast.

## Keep the Entity Relation in the Offline System

Feast documentation accepts either a Pandas DataFrame or a SQL query for entities on supported SQL-backed paths. Prefer a query when labels already live in the same warehouse:

```python
entity_sql = """
SELECT
  customer_id,
  prediction_timestamp AS event_timestamp,
  churned AS label
FROM ml_training.churn_observations
WHERE prediction_timestamp >= TIMESTAMP '2026-01-01 00:00:00+00'
  AND prediction_timestamp <  TIMESTAMP '2026-04-01 00:00:00+00'
"""

job = store.get_historical_features(
    entity_df=entity_sql,
    features=store.get_feature_service("churn_model_v6"),
)
```

This avoids uploading a large Pandas object and lets the offline store plan the entity relation. Verify SQL entity input support and temporary-table behavior in the exact offline-store functionality page.

If entities originate outside that system, load them into a staged table with a stable observation identifier rather than embedding a huge `IN` list.

## Reduce Work Before the Join

Request only the fields in the model's FeatureService. Avoid selecting whole FeatureViews for convenience.

Constrain entity timestamps to the intended dataset split. The FeatureView TTL then bounds feature-source lookback from those timestamps, but an unnecessarily long TTL increases scan range and may change modeling semantics. Do not shorten TTL solely for speed without validating feature validity.

Remove accidental duplicates using the training example's true key. Keep repeated rows that represent real separate observations. A stable `observation_id` helps detect multiplication after joins.

Precompute large transformations and rolling aggregations upstream. Feast's current FeatureView documentation notes that local on-demand transformations can scale poorly for offline retrieval.

## Avoid Pulling the Full Result into Pandas

`.to_df()` materializes the complete result in a local DataFrame. For a large training set, prefer a retrieval-job export or persistence capability advertised by the selected offline store, such as export to a data warehouse or data lake. The functionality matrix differs by plugin.

`to_arrow()` can reduce some conversion overhead and preserve columnar representation, but it still returns an in-memory Arrow table unless the implementation provides batches or remote export. It is not automatic out-of-core execution.

If using Feast saved datasets, note their documented Alpha status and backend restrictions. A native warehouse table produced through a supported retrieval export may be simpler for a critical training pipeline.

## Partition Without Breaking Semantics

When one query remains too large, partition by a stable observation-time range or observation ID, then concatenate outputs after asserting:

- every input observation appears exactly once;
- no observation falls through a boundary;
- the same registry revision and source snapshot served every partition;
- FeatureView TTL lookback remains available across partition edges;
- output schemas are identical.

Time partitioning changes entity-row selection, not the point-in-time rule. A January observation may legitimately read a December feature row, so do not physically restrict the feature source to January without TTL headroom.

Pin a warehouse snapshot or equivalent if source data can change while partitions run. Otherwise late corrections can make one dataset internally inconsistent.

## Choose a Scalable Engine

The current Dask offline-store documentation warns that FileSource data is downloaded and joined in Python and may not scale to production. Move large joins to an offline store or compute engine with native point-in-time support.

Current Feast references describe Spark and Ray contributed compute engines for distributed historical retrieval. Ray documents partitioned join strategies and large entity DataFrames; Spark documents distributed point-in-time execution. Treat contributed integrations as versioned dependencies and test parity before migration.

Also tune the underlying warehouse using its official guidance: partition pruning, clustering on entity and time, statistics, temporary-table strategy, warehouse size, and query concurrency. Feast cannot compensate for an unpartitioned multi-year source scan.

## Inspect One Query Plan

For the plugin's supported preview or SQL-export path, inspect whether:

- entity filters are pushed down;
- source scans use timestamp partitions;
- join keys have compatible types without casts;
- deduplication sorts an unnecessarily broad relation;
- requested columns are pruned;
- intermediate results spill or broadcast unexpectedly.

Compare output values against a small golden point-in-time fixture after every optimization. A faster non-point-in-time join is a regression, not an improvement.

## Official Documentation

- [Feast feature retrieval](https://docs.feast.dev/getting-started/concepts/feature-retrieval)
- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Feast offline-store reference](https://docs.feast.dev/reference/offline-stores)
- [Feast Dask offline store](https://docs.feast.dev/reference/offline-stores/dask)
- [Feast Spark compute engine](https://docs.feast.dev/reference/compute-engine/spark)
- [Feast Ray compute engine](https://docs.feast.dev/reference/compute-engine/ray)
- [Feast FeatureViews and ODFV scaling caveat](https://docs.feast.dev/getting-started/concepts/feature-view)

## Conclusion

Keep large entity relations and point-in-time joins inside a capable offline engine, narrow fields and timestamps, and export results remotely instead of calling `.to_df()` blindly. Partition only with stable observation keys and one source snapshot, then prove semantic parity with golden joins.
