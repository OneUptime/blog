# Detect Silent Feast Materialization Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Materialization, Monitoring, Feature Freshness, Prometheus, MLOps

Description: Detect stale online features by monitoring source watermarks, job results, registry progress, freshness metrics, and canary reads.

---

A materialization can exit successfully while online features still go stale. The selected interval may contain no new rows, an incremental watermark may have advanced past late data, only some FeatureViews may have run, or the serving tier may be reading a different registry and online store.

Monitor the data transition, not just the process exit code.

## Define Success as Five Checkpoints

A reliable materialization run proves all of these:

1. the upstream feature interval is complete;
2. Feast launched with the intended project, registry, FeatureViews, and time bounds;
3. every materialization job reached a successful terminal state;
4. the online value event-time frontier advanced as expected;
5. a serving-path canary can read the expected value.

Each checkpoint catches a different silent failure. A green scheduler task cannot prove checkpoints four and five.

## Gate on the Source Watermark

Do not use the wall clock as evidence that an hourly source partition is ready. Publish or query an upstream watermark that means all events through time `T` are available under the producer's lateness contract.

Record these timestamps together:

```text
scheduled_end        2026-08-15T11:00:00Z
source_watermark     2026-08-15T11:00:00Z
materialize_start    2026-08-15T10:00:00Z
materialize_end      2026-08-15T11:00:00Z
job_completed_at     2026-08-15T11:08:12Z
```

If the source watermark is behind, delay the Feast run. Advancing `materialize-incremental` beyond available data saves that end time per FeatureView and can skip rows that later arrive with older event timestamps.

## Capture Structured Job Evidence

For each FeatureView, log or emit metrics for:

- Feast version and deployment commit;
- project and registry identifier;
- explicit start and end timestamps;
- terminal status and duration;
- rows or bytes read and written where the engine exposes them;
- maximum event timestamp observed;
- retry count and final exception class.

Treat a submitted Spark, Ray, Snowflake, Kubernetes, or other remote job as pending, not successful. The orchestrator must wait for the engine's terminal result.

A zero-row run is not inherently an error. Compare it with expected source volume and watermark movement. For a continuously active view, zero rows plus a stationary online timestamp is a strong alert. For a sparse view, it may be normal.

## Use Feast's Current Metrics

The current Python feature server can expose Prometheus-compatible metrics on a separate endpoint. Its documented metrics include:

- `feast_materialization_total{feature_view,status}`;
- `feast_materialization_duration_seconds{feature_view}`;
- `feast_feature_freshness_seconds{feature_view,project}`;
- request counts and latency for the feature server.

Metrics are opt-in, and the documented default metrics port is 8000. Enable and scrape them according to the configuration for the pinned Feast version.

Example alert intent:

```promql
max by (project, feature_view) (feast_feature_freshness_seconds) > 1800
```

```promql
increase(feast_materialization_total{status!="success"}[15m]) > 0
```

Choose thresholds per FeatureView. A daily feature and a five-minute fraud feature cannot share one freshness limit.

Not every deployment invokes materialization through the Python feature server, so keep scheduler and engine metrics even when Feast metrics are enabled.

## Add a Known-Entity Canary

After each materialization, retrieve one or more controlled entities through the same endpoint used by the model:

```python
result = store.get_online_features(
    features=["pipeline_canary:sequence_number"],
    entity_rows=[{"canary_id": "materialization-eu-west"}],
).to_dict()

assert result["sequence_number"][0] == expected_sequence
```

The canary producer should write a deterministic, monotonically increasing value into every closed interval. The check catches wrong registry paths, wrong projects, missing online writes, stale server caches, and broken request serialization.

Use more than one canary when feature data is sharded. Keep canary identifiers free of customer information.

## Sample Real Feature Freshness

A synthetic canary proves plumbing but not that real feature producers are advancing. Sample entity keys from each important FeatureView and compare their stored or returned event timestamps with business expectations where the serving response and provider expose those timestamps.

Also track:

- percentage of online reads with missing features;
- age distribution of observed feature values;
- source-to-online row-count reconciliation for bounded intervals;
- change in feature-value distributions after a run;
- last successful run by FeatureView, not only by workflow.

Do not alert solely on registry materialization progress. Registry metadata can advance after a query that found no useful row for a key.

## Detect Partial and Split-Brain Writes

Run direct SDK retrieval using production registry and online-store credentials, then compare it with the deployed feature server.

- Direct read fresh, server stale: investigate registry cache, service configuration, and rollout skew.
- Both stale, registry advanced: investigate source selection, online writes, and entity serialization.
- Only some FeatureViews stale: inspect per-view interval state and job results.
- Missingness concentrated on one key type: inspect join-key normalization and schema changes.

Use a SQL registry for concurrent materialization writers, as Feast documents atomic object changes there. A SQL registry protects metadata updates; it does not make separate online-store writes transactional or eliminate the need for canaries.

## Build an Actionable Freshness SLO

An alert should say which boundary failed:

```text
FeatureView: driver_hourly_stats
source watermark lag: 4m
last successful materialization: 38m
registry end lag: 38m
online canary lag: 42m
missing read rate: 7.3%
```

This tells the responder whether to page the source owner, materialization owner, registry operator, or serving owner. A generic "Feast stale" alert does not.

## Official Documentation

- [Feast Python feature server and Prometheus metrics](https://docs.feast.dev/reference/feature-servers/python-feature-server)
- [Load data into the Feast online store](https://docs.feast.dev/how-to-guides/feast-snowflake-gcp-aws/load-data-into-the-online-store)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast SQL registry](https://docs.feast.dev/reference/registries/sql)
- [Feast online store](https://docs.feast.dev/getting-started/components/online-store)

## Conclusion

Detect staleness with a chain of evidence: upstream watermark, per-view terminal job status, registry interval, online event-time freshness, and a real serving-path canary. The process exit code is one signal in that chain, not the definition of success.
