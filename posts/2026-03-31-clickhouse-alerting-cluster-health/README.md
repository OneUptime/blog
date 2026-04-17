# How to Set Up Alerting for ClickHouse Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alerting, Monitoring, Prometheus, Grafana, Cluster Health

Description: Learn how to set up comprehensive alerting for ClickHouse cluster health covering replication lag, disk usage, query errors, and merge performance.

---

A ClickHouse cluster without alerting is a cluster waiting to surprise you. This guide covers the essential alerts every production ClickHouse deployment needs, using Prometheus and Grafana Alertmanager.

## Prometheus Scrape Configuration

Add ClickHouse to Prometheus in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: clickhouse
    static_configs:
      - targets:
          - ch1:9363
          - ch2:9363
          - ch3:9363
    metrics_path: /metrics
    scrape_interval: 15s
```

Enable the Prometheus endpoint in ClickHouse:

```xml
<prometheus>
  <endpoint>/metrics</endpoint>
  <port>9363</port>
  <metrics>true</metrics>
  <events>true</events>
  <asynchronous_metrics>true</asynchronous_metrics>
</prometheus>
```

## Essential Alert Rules

Create `clickhouse_alerts.yml`:

```yaml
groups:
  - name: clickhouse
    rules:
      - alert: ClickHouseDiskUsageHigh
        expr: >
          (ClickHouseAsyncMetrics_DiskTotal_default - ClickHouseAsyncMetrics_DiskAvailable_default)
          / ClickHouseAsyncMetrics_DiskTotal_default > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse disk usage above 80% on {{ $labels.instance }}"

      - alert: ClickHouseDiskUsageCritical
        expr: >
          (ClickHouseAsyncMetrics_DiskTotal_default - ClickHouseAsyncMetrics_DiskAvailable_default)
          / ClickHouseAsyncMetrics_DiskTotal_default > 0.90
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse disk usage above 90% on {{ $labels.instance }}"

      - alert: ClickHouseReplicasInReadOnly
        expr: ClickHouseAsyncMetrics_ReplicasMaxQueueSize > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse replicas have pending queue on {{ $labels.instance }}"

      - alert: ClickHouseQueryErrors
        expr: >
          increase(ClickHouseProfileEvents_FailedQuery[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High query error rate on {{ $labels.instance }}"

      - alert: ClickHouseInsertErrors
        expr: >
          increase(ClickHouseProfileEvents_FailedInsertQuery[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Insert failures detected on {{ $labels.instance }}"

      - alert: ClickHouseMemoryUsageHigh
        expr: >
          ClickHouseMetrics_MemoryTracking
          / ClickHouseAsyncMetrics_OSMemoryTotal > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse memory usage above 85% on {{ $labels.instance }}"

      - alert: ClickHouseTooManyParts
        expr: ClickHouseAsyncMetrics_ReplicasMaxMergesInQueue > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High merge queue on {{ $labels.instance }}"
```

## Replication Lag Alert via SQL

For a more precise replication alert, use a scheduled query:

```sql
SELECT
    replica_name,
    queue_size,
    inserts_in_queue
FROM system.replicas
WHERE queue_size > 1000
   OR inserts_in_queue > 100;
```

Alert if this query returns any rows.

## Keeper Health Alert

```bash
#!/bin/bash
# Run every minute via cron
for host in keeper1 keeper2 keeper3; do
  result=$(echo ruok | nc -w 2 "$host" 9181 2>/dev/null)
  if [ "$result" != "imok" ]; then
    # Send alert (PagerDuty, Slack, etc.)
    echo "ALERT: Keeper node $host is unhealthy"
  fi
done
```

## Grafana Dashboard Panels

Key panels for a ClickHouse health dashboard:

- Insert rate (rows/sec and bytes/sec)
- Select query rate and p99 latency
- Disk usage per node (bar gauge with thresholds)
- Replication queue size per table
- Active merges count
- Memory usage over time

## Summary

Set up ClickHouse alerting with Prometheus by enabling the metrics endpoint, creating alert rules for disk usage, query errors, insert failures, and memory pressure. Add Keeper health checks via shell scripts or synthetic monitoring. A good alerting setup pages on critical issues immediately and warns on degradation trends before they become outages.
