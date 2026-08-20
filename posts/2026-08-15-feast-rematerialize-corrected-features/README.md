# Rematerialize Corrected Feast Features Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Rematerialization, Backfill, Online Store, Data Correction, Feature Store

Description: Repair corrected Feast data by separating offline history fixes from the latest online state and replaying controlled windows.

---

Correcting a row in the offline source and rerunning `feast materialize-incremental` often leaves the online value unchanged. That is expected when the corrected event is behind the registry's incremental watermark. After an explicit replay, whether an older or same-time correction overwrites an existing online value depends on the online-store implementation and configuration.

The repair must answer two different questions:

1. Is historical training data now correct for every past observation?
2. What is the correct latest value that online serving should hold now?

Those answers can come from different source rows because Feast's online store retains only the latest values per entity key.

## Classify the Correction

Write down the entity key, FeatureView, old event timestamp, corrected event timestamp, and current latest source event.

| Case | Historical effect | Desired online effect |
| --- | --- | --- |
| corrected value at the current latest event time | past joins change | latest online value should change |
| corrected value older than a valid newer event | some past joins change | online value should remain the newer event |
| deleted bad latest event | past joins change | online value should fall back to the next valid event |
| entity key or feature type changed | join/schema changes | often requires a new FeatureView |

Do not force an old event to overwrite a newer online value merely to make the correction visible. That would make serving less current.

## Fix the Offline Source First

Feast queries feature data from the configured source. Make the correction durable there and preserve event-time meaning. If the warehouse is append-only, add a revision with the same entity key and event timestamp plus a later created timestamp, then configure `created_timestamp_column` so duplicate resolution can prefer it.

```python
source = BigQuerySource(
    table="analytics.account_risk_features",
    timestamp_field="event_timestamp",
    created_timestamp_column="created_timestamp",
)
```

Validate a small point-in-time retrieval around the corrected event before touching online serving:

```python
probe = pd.DataFrame(
    {
        "account_id": ["a-17", "a-17", "a-17"],
        "event_timestamp": pd.to_datetime(
            [
                "2026-08-10T09:59:59Z",
                "2026-08-10T10:00:00Z",
                "2026-08-10T10:00:01Z",
            ],
            utc=True,
        ),
    }
)

print(
    store.get_historical_features(
        entity_df=probe,
        features=["account_risk:risk_score"],
    ).to_df()
)
```

The probes just before, exactly at, and just after the event prove both the correction and its temporal boundary.

## Replay an Explicit Event-Time Window

When prior materialization history exists, incremental materialization starts at the latest registered end for each FeatureView, so it will not normally revisit an older correction. If the online store already has the desired latest value, stop after historical validation. Otherwise, use non-incremental materialization with explicit bounds:

```bash
feast materialize -v account_risk \
  2026-08-10T09:00:00Z 2026-08-10T11:00:00Z
```

Include enough context to select the intended latest row for affected entities. On a backend that accepts unconditional upserts, set the end bound late enough to include each affected entity's current intended latest source row; otherwise a narrow replay can roll online state backward. Replaying a bounded interval is preferable to a blind full-history run because it limits source scans and online writes.

Repeated writes and timestamp-conflict handling are provider-dependent. Run repair jobs sequentially, one FeatureView at a time. If you parallelize them, use an online store and registry that support your concurrency pattern. Feast recommends the SQL registry when materialization jobs write registry metadata concurrently.

## Understand Online Write Conflicts

An online store is latest-state storage. Suppose it contains an 11:00 value and you repair the 10:00 source row. Historical requests between 10:00 and 11:00 should change, but an online request should still see 11:00.

If the 11:00 row itself is wrong and should not exist, replaying 10:00 does not portably make online state fall backward. Some online-store implementations reject older, and sometimes equal, event timestamps; others overwrite existing values without that guard. A same-event-time correction with a later created timestamp can therefore also be skipped by a backend that requires a strictly newer event timestamp. Feast does not expose one portable row-level "rewind to previous source value" command across all backends.

Use one of these controlled strategies:

- publish a new, semantically valid latest feature event from the upstream computation;
- clear the affected FeatureView's online data with a provider-specific, reviewed maintenance procedure, then rematerialize the intended state;
- create a versioned FeatureView and materialize it into separate online state, with separately provisioned infrastructure if required, for a breaking or large correction.

The first option is normally safest for a small correction. The second requires a maintenance window, exact key targeting, backups, and a canary because native deletion bypasses Feast's portable API. The third gives the cleanest rollback for broad changes.

Never invent a future event timestamp solely to beat the online conflict rule. It corrupts event-time semantics and can prevent genuine later events from winning.

## Coordinate Batch and Streaming Writers

Pause or fence stream writers for the affected FeatureView while performing a destructive repair. Otherwise an old stream retry can race the batch replay.

For a versioned repair:

1. add `account_risk_v2` without changing `account_risk_v1`;
2. run `feast apply`;
3. materialize `v2` from corrected data;
4. verify historical and online canaries;
5. create a new FeatureService for the model version and run `feast apply` again;
6. shift readers gradually;
7. retain `v1` through the rollback window.

This costs duplicate storage but keeps the current model stable.

## Verify the Repair at Both Boundaries

After replay, test:

- historical rows just before, at, and after the corrected event;
- online retrieval for affected entities and an unaffected control entity;
- event timestamps or freshness metadata where the client exposes them;
- missing-feature rate and model input distributions;
- for a versioned repair, registry metadata and feature-server registry-cache propagation.

Record the exact source revision, Feast version, registry, interval, FeatureView list, and affected entity count in the incident log. A repair that cannot be reproduced cannot be safely audited.

## Official Documentation

- [Load data into the Feast online store](https://docs.feast.dev/how-to-guides/feast-snowflake-gcp-aws/load-data-into-the-online-store)
- [Feast online store semantics](https://docs.feast.dev/getting-started/components/online-store)
- [Feast point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Feast SQL registry](https://docs.feast.dev/reference/registries/sql)
- [Feast production deployment guide](https://docs.feast.dev/how-to-guides/running-feast-in-production)

## Conclusion

Repair offline history first and validate it with point-in-time probes. When online state also needs repair, replay an explicit window that selects the intended latest row for every affected entity. If the correct online state must move behind its stored latest timestamp, use a controlled upstream rewrite, provider-specific rebuild, or versioned FeatureView instead of falsifying event time.
