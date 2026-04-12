# How to Monitor Oplog Capacity for Change Stream Token Expiration in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Change Stream, Monitoring, Replication

Description: Monitor MongoDB oplog window size to prevent Change Stream resume token expiration, and configure oplog capacity to match your CDC pipeline recovery requirements.

---

MongoDB Change Stream resume tokens are backed by the oplog. If a consumer falls behind or is offline long enough for the oplog to roll over past its last token, the stream raises a `ChangeStreamHistoryLost` error and the consumer must perform a full re-sync. Monitoring and sizing the oplog correctly prevents this.

## Understanding the Oplog Window

The oplog is a capped collection stored in the `local` database on every replica set member. Its window (in hours) is determined by the rate of writes and the configured maximum oplog size.

```text
Oplog window (hours) = Oplog max size (GB) / Write rate (GB/hour)
```

A busy cluster with a small oplog can have a window of only a few hours.

## Checking the Current Oplog Window

```javascript
// In mongosh
db.getSiblingDB("local").oplog.rs.stats().maxSize;

// Get the earliest and latest timestamps
const oldest = db.getSiblingDB("local").oplog.rs
  .find({}, { ts: 1 }).sort({ $natural: 1 }).limit(1).next();
const newest = db.getSiblingDB("local").oplog.rs
  .find({}, { ts: 1 }).sort({ $natural: -1 }).limit(1).next();

const windowSecs = newest.ts.t - oldest.ts.t;
print("Oplog window:", Math.round(windowSecs / 3600), "hours");
```

Or use `rs.printReplicationInfo()` which shows a human-readable summary:

```bash
mongosh --eval "rs.printReplicationInfo()"
```

Output:

```text
configured oplog size:   10240 MB
log length start to end: 14400 secs (4 hrs)
oplog first event time:  ...
oplog last event time:   ...
```

## Configuring Oplog Size

Set the oplog size in `mongod.conf`:

```yaml
replication:
  replSetName: "rs0"
  oplogSizeMB: 51200   # 50 GB
```

To change it on a running replica set, use `replSetResizeOplog`:

```javascript
// Resize oplog to 50 GB (value is in megabytes)
db.adminCommand({ replSetResizeOplog: 1, size: 51200 });
```

This takes effect immediately without a restart.

## Minimum Oplog Window Recommendation

For Change Stream-based pipelines, size your oplog to cover at least your worst-case consumer downtime plus a safety margin:

```text
Target window = max_consumer_downtime * 2

Example: 8 hours of planned maintenance -> 16 hours oplog window minimum
```

## Monitoring with Prometheus and Grafana

If you use `mongodb_exporter`, the following metrics are available:

```text
mongodb_mongod_replset_oplog_head_timestamp
mongodb_mongod_replset_oplog_tail_timestamp
```

Alert when the window drops below your threshold:

```yaml
# Prometheus alerting rule
- alert: MongoDBOplogWindowLow
  expr: |
    (mongodb_mongod_replset_oplog_head_timestamp - mongodb_mongod_replset_oplog_tail_timestamp)
    < 14400
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB oplog window below 4 hours on {{ $labels.instance }}"
```

## Checking Change Stream Consumer Lag

Compare the timestamp on the latest Change Stream event against wall-clock time to measure consumer lag:

```javascript
changeStream.on("change", (event) => {
  const eventTs = event.clusterTime?.t ?? Math.floor(Date.now() / 1000);
  const lagSeconds = Math.floor(Date.now() / 1000) - eventTs;
  metrics.gauge("change_stream_lag_seconds", lagSeconds);
});
```

Alert if `change_stream_lag_seconds` approaches the oplog window. If lag + recovery time exceeds the window, the consumer will lose its place.

## Handling ChangeStreamHistoryLost

```javascript
changeStream.on("error", async (err) => {
  if (err.codeName === "ChangeStreamHistoryLost") {
    console.error("Oplog rolled past resume token. Initiating full resync.");
    await deleteResumeToken();
    await triggerFullCollectionResync();
  }
});
```

## Summary

Oplog window size directly determines how long a Change Stream consumer can be offline before it loses its position. Monitor window length with `rs.printReplicationInfo()` or Prometheus metrics, size the oplog to cover your worst-case recovery time multiplied by two, and build `ChangeStreamHistoryLost` handling into every consumer to fall back to a full re-sync when needed.
