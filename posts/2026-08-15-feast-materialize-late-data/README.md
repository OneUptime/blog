# Feast `materialize` vs `materialize-incremental` for Late Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Materialization, Late Data, Online Store, Scheduler, Event Time

Description: Choose explicit overlapping materialization windows when late rows can arrive, instead of trusting a forward-only registry watermark.

---

`feast materialize` and `feast materialize-incremental` write the latest eligible batch features into the online store. Their important difference is who chooses the start of each event-time interval.

- `materialize START END` does not derive its interval from prior runs: the caller supplies both boundaries. A successful run is still recorded in the registry.
- `materialize-incremental END` uses each FeatureView's most recent recorded end time, from either command, as the next start when one exists.

That makes the incremental command convenient, but it does not automatically rediscover a late row whose event timestamp falls before the stored watermark.

## Understand the Failure Timeline

Assume an hourly feature pipeline:

```text
12:05  materialize-incremental ends at 12:00
12:20  a delayed source row arrives with event_timestamp 11:42
13:05  next incremental run covers 12:00 through 13:00
```

The row arrived physically at 12:20, but its event time is 11:42. A query bounded to the new interval starts at 12:00, so the row is outside it. The registry records successful materialization intervals, not a change-data-capture cursor over source arrival time.

Feast's materialization guide documents that an incremental run starts at the previous end time. Its production scheduler example uses an explicit overlap to account for late data.

## Use Incremental Materialization for Closed Intervals

`materialize-incremental` works well when the upstream system publishes a reliable event-time watermark. Set the Feast end time to the latest closed source interval, not blindly to the wall clock.

```bash
feast materialize-incremental 2026-08-15T11:00:00+00:00
```

Only advance to 11:00 after the producer guarantees that rows through 11:00 are complete under its lateness policy. If source data is complete 30 minutes after the hour, a run at 12:05 might intentionally end at 11:00.

The tracked end time is per FeatureView. That is useful when views have different cadences, but it also means operators must inspect each view rather than treating one successful command as a single global watermark. When a workflow must select views explicitly, use the Python SDK's documented `feature_views=[...]` argument and verify the CLI surface of the pinned Feast release.

## Let the Scheduler Own Overlapping Windows

When late arrival is normal, call explicit `materialize` from an orchestrator that owns interval state:

```python
from datetime import timedelta
from feast import FeatureStore

store = FeatureStore(repo_path="production")

# data_interval_start and data_interval_end come from the scheduler.
store.materialize(
    start_date=data_interval_start - timedelta(hours=2),
    end_date=data_interval_end,
    feature_views=["driver_hourly_stats"],
)
```

Choose the overlap from measured source lateness, plus a safety margin. Re-reading two hours is safe only if online writes are idempotent enough for your provider and event timestamps are stable. Test repeated windows and concurrent writers for the selected online store.

An overlap catches a late row only while it is inside the replay horizon. For rarer extreme delays, schedule a separate repair job with a wider explicit interval.

```bash
feast materialize -v driver_hourly_stats \
  2026-08-12T00:00:00Z 2026-08-15T12:00:00Z
```

This command queries the interval again. It does not reset the entire online store, and online stores still retain only one current set of feature values per entity key. Whether replay replaces that value depends on the provider's write semantics.

## Do Not Confuse Event Time with Created Time

A source can declare both:

```python
from feast import BigQuerySource

source = BigQuerySource(
    table="analytics.driver_hourly_stats",
    timestamp_field="event_timestamp",
    created_timestamp_column="created_timestamp",
)
```

The event timestamp controls point-in-time eligibility and materialization intervals. The created timestamp can disambiguate revisions that have the same entity key and event time. It does not make an 11:42 event appear inside a 12:00 to 13:00 event-time scan merely because the row was created at 12:20. Whether rematerialization replaces a value already written at the same event time remains online-store-specific.

If the warehouse cannot expose an event-time-complete interval, maintain a separate arrival watermark in the scheduler or transform late changes into a repair queue.

## Know What Replaying Can Correct

An online store retains one current set of feature values per entity key, not a history. Feast's `OnlineStore` interface does not require every provider to reject an older event-time write. Replaying an old interval can fill an entity that had no online row; depending on the provider, it can also overwrite a genuinely later feature event. Some providers reject older or equal event timestamps, while others use last-write-style upserts.

For example, do not assume replaying a corrected 10:00 row will preserve a valid 11:00 row, or that a same-event-time revision will replace the value already online. A repair job must verify that the final served value is the latest correct state. Historical retrieval reads the corrected offline history; online repairs need separate provider-specific reasoning.

## Make the Workflow Observable

Record, per FeatureView:

- requested start and end timestamps;
- upstream event-time watermark at launch;
- row count read and written, if the engine exposes it;
- maximum source event timestamp observed;
- materialization duration and result;
- age of a canary entity's online value.

Alert when a run succeeds but the source watermark or online freshness does not advance. A zero-row run can be valid, so compare it with expected source volume rather than failing it unconditionally.

With concurrent FeatureView materializations, use the SQL registry recommended by Feast. File registries rewrite one serialized object and have documented concurrent-writer limitations.

## Choose the Command from the Data Contract

Use `materialize-incremental` when upstream intervals close cleanly and you want Feast to choose each view's next start from recorded progress. Use explicit `materialize` windows when the scheduler already owns interval state, when overlap is required for late rows, or when performing a targeted repair.

Neither command solves unbounded lateness by itself. The reliable design combines an upstream watermark, bounded overlap, idempotent replay, a rare backfill path, and freshness monitoring.

## Official Documentation

- [Load data into the Feast online store](https://docs.feast.dev/how-to-guides/feast-snowflake-gcp-aws/load-data-into-the-online-store)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast online store](https://docs.feast.dev/getting-started/components/online-store)
- [Feast CLI reference](https://docs.feast.dev/reference/feast-cli-commands)

## Conclusion

Incremental materialization advances a registry-backed event-time watermark; it is not an arrival-time catch-up mechanism. Delay the end to a closed upstream interval or let a scheduler run explicit overlapping windows, then keep a targeted repair path for data later than the normal overlap.
