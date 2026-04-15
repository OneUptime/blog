# ClickHouse Monitoring Setup Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, Prometheus, Grafana, Checklist

Description: A monitoring setup checklist for ClickHouse covering Prometheus metrics, Grafana dashboards, alerting rules, and system table monitoring.

---

ClickHouse exposes rich telemetry through its HTTP metrics endpoint and system tables. This checklist covers everything needed for complete observability of a ClickHouse deployment.

## Prometheus Metrics

ClickHouse exposes Prometheus metrics at `/metrics` on port 9363 by default. Enable it in `config.xml`:

```xml
<prometheus>
  <endpoint>/metrics</endpoint>
  <port>9363</port>
  <metrics>true</metrics>
  <events>true</events>
  <asynchronous_metrics>true</asynchronous_metrics>
</prometheus>
```

```text
[ ] Prometheus metrics endpoint enabled and accessible
[ ] Prometheus scraping ClickHouse /metrics every 15 seconds
[ ] All nodes in cluster being scraped
```

## Key Metrics to Monitor

```text
[ ] ClickHouseMetrics_Query - active queries count
[ ] ClickHouseMetrics_MergesMutationsMemoryTracking - merge memory pressure
[ ] ClickHouseProfileEvents_SlowRead - slow disk reads
[ ] ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay - replication lag
[ ] ClickHouseAsyncMetrics_DiskAvailable_data - disk space remaining
[ ] ClickHouseMetrics_BackgroundMergesAndMutationsPoolSize - merge queue depth
```

## Grafana Dashboard

```text
[ ] Official ClickHouse Grafana dashboard installed
    (https://grafana.com/grafana/dashboards/14192)
[ ] Dashboard showing: query rate, p99 latency, memory usage, disk usage
[ ] Replication status panel showing lag per shard/replica
[ ] Part count and merge queue panel
```

## Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: clickhouse
    rules:
      - alert: ClickHouseHighDiskUsage
        expr: (1 - ClickHouseAsyncMetrics_DiskAvailable_data / ClickHouseAsyncMetrics_DiskTotal_data) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse disk usage above 80%"

      - alert: ClickHouseReplicationLag
        expr: ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay > 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse replication lag > 5 minutes"

      - alert: ClickHouseHighMemoryUsage
        expr: ClickHouseAsyncMetrics_MemoryResident / ClickHouseAsyncMetrics_OSMemoryTotal > 0.85
        for: 5m
        labels:
          severity: warning
```

## System Table Monitoring

```sql
-- Monitor slow queries in real time
SELECT query_id, user, elapsed, query
FROM system.processes
WHERE elapsed > 10
ORDER BY elapsed DESC;

-- Check mutation queue
SELECT database, table, command, parts_to_do, is_done
FROM system.mutations
WHERE is_done = 0;

-- Check merge queue depth
SELECT database, table, count() AS pending_merges
FROM system.merges
GROUP BY database, table;
```

```text
[ ] system.query_log retention set to 30 days minimum
[ ] system.metric_log retention set to 7 days
[ ] Automated slow query log review process in place
```

## Health Check Endpoint

```bash
# Simple HTTP health check
curl -s "http://localhost:8123/ping"
# Returns: Ok.

# Query-based health check
curl -s "http://localhost:8123/?query=SELECT+1"
# Returns: 1
```

```text
[ ] Load balancer health check configured against /ping
[ ] External monitoring checking /ping every 30 seconds
```

## Summary

Complete ClickHouse monitoring requires Prometheus scraping from the built-in metrics endpoint, Grafana dashboards for visualization, alerting rules for critical conditions (disk, replication lag, memory), and regular review of slow queries in `system.query_log`. Set all of this up before going to production.
