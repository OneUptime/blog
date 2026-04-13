# How to Use Free Monitoring in MongoDB Community

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Free Monitoring, Community, Performance

Description: Learn how to enable and use MongoDB's built-in free monitoring feature to track performance metrics for Community Edition deployments without additional tooling.

---

> **Deprecation Notice:** MongoDB free monitoring was deprecated in April 2023 and the hosted dashboard was fully decommissioned in August 2023. The commands described below still exist in older MongoDB versions (4.0–5.x) but no longer upload data or return a working dashboard URL. For Community Edition monitoring, use a Prometheus `mongodb_exporter` deployment or upgrade to MongoDB Atlas.

## What Is MongoDB Free Monitoring?

MongoDB Community Edition (versions 4.0 through 5.x) included a free monitoring service that uploaded operational metrics to a hosted dashboard at `cloud.mongodb.com/freemonitoring`. It collected CPU usage, memory usage, operation counts, operation execution time, and replication oplog window - giving you a quick health overview without setting up Prometheus or other external tools.

Free monitoring is opt-in and can be enabled per deployment.

## Enabling Free Monitoring

Enable free monitoring from the MongoDB shell:

```javascript
db.enableFreeMonitoring()
```

The command returns a URL to your unique monitoring dashboard:

```text
{
  state: 'enabled',
  message: 'To see your monitoring data, navigate to the unique URL below.',
  url: 'https://cloud.mongodb.com/freemonitoring/cluster/XXXXXXXXXXXXXXXX',
  userReminder: 'You can disable monitoring at any time by running db.disableFreeMonitoring().',
  ok: 1
}
```

Save the URL - it is unique to your deployment and does not require a MongoDB Atlas account.

## Checking Free Monitoring Status

```javascript
db.getFreeMonitoringStatus()
```

Output:

```json
{
  "state": "enabled",
  "url": "https://cloud.mongodb.com/freemonitoring/cluster/XXXXXXXXXXXXXXXX",
  "ok": 1
}
```

If `state` is `undecided`, free monitoring has not been configured yet.

## Enabling Free Monitoring at Startup

Enable it in `mongod.conf` so it is active from the first startup:

```yaml
cloud:
  monitoring:
    free:
      state: on
```

Valid values for `state` are `on`, `off`, and `runtime` (default - decided at runtime by `enableFreeMonitoring`).

## Disabling Free Monitoring

To stop data upload:

```javascript
db.disableFreeMonitoring()
```

Or in `mongod.conf`:

```yaml
cloud:
  monitoring:
    free:
      state: off
```

## What Metrics Are Available

The free monitoring dashboard shows:

- **Operation execution time** - latency percentiles for reads, writes, commands
- **Memory usage** - resident and virtual memory over time
- **CPU usage** - normalized CPU for mongod process
- **Replication oplog window** - how many hours of oplog are retained
- **Network I/O** - bytes in and out

These metrics update every minute and are retained for 24 hours on the hosted dashboard.

## Limitations of Free Monitoring

Free monitoring is useful for quick checks but has constraints:

```text
Feature                  | Free Monitoring | Atlas / Prometheus
-------------------------|-----------------|-------------------
Retention period         | 24 hours        | Configurable (weeks/months)
Metric granularity       | ~1 minute       | Seconds
Custom alerts            | No              | Yes
Per-collection stats     | No              | Yes
Index usage              | No              | Yes
Cost                     | Free            | Varies
```

For production workloads needing custom alerts, longer retention, or per-collection breakdowns, pair free monitoring with a Prometheus `mongodb_exporter` deployment.

## Summary

MongoDB Community's free monitoring feature provided a zero-config performance dashboard for standalone and replica set deployments in versions 4.0 through 5.x. However, this service was deprecated in April 2023 and fully decommissioned in August 2023. For current MongoDB Community deployments, use a Prometheus `mongodb_exporter` setup or MongoDB Atlas for monitoring capabilities.
