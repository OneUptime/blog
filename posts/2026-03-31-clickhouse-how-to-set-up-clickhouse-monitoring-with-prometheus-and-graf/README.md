# How to Set Up ClickHouse Monitoring with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prometheus, Grafana, Monitoring, Observability

Description: Learn how to configure ClickHouse to expose Prometheus metrics, scrape them with Prometheus, and visualize them in Grafana dashboards for complete observability.

---

## Enabling the Prometheus Endpoint in ClickHouse

Edit `config.xml` to expose the Prometheus metrics endpoint:

```xml
<prometheus>
    <endpoint>/metrics</endpoint>
    <port>9363</port>
    <metrics>true</metrics>
    <events>true</events>
    <asynchronous_metrics>true</asynchronous_metrics>
    <errors>true</errors>
</prometheus>
```

Restart ClickHouse and verify:

```bash
curl http://localhost:9363/metrics | head -30
```

## Configuring Prometheus to Scrape ClickHouse

Add ClickHouse as a target in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'clickhouse'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'clickhouse-server-1:9363'
          - 'clickhouse-server-2:9363'
          - 'clickhouse-server-3:9363'
    metrics_path: '/metrics'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+)(:[0-9]+)?'
        replacement: '${1}'
```

Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Key ClickHouse Metrics to Monitor

```text
# Query performance
ClickHouseProfileEvents_Query
ClickHouseProfileEvents_SelectQuery
ClickHouseProfileEvents_InsertQuery
ClickHouseProfileEvents_FailedQuery

# Memory
ClickHouseAsyncMetrics_MemoryResident
ClickHouseMetrics_MemoryTracking

# Merges
ClickHouseMetrics_BackgroundMergesAndMutationsPoolTask
ClickHouseProfileEvents_MergedRows
ClickHouseProfileEvents_MergedUncompressedBytes

# Replication
ClickHouseMetrics_ReplicatedChecks
ClickHouseAsyncMetrics_ReplicasMaxRelativeDelay

# Parts
ClickHouseMetrics_PartsActive
ClickHouseAsyncMetrics_NumberOfTables
```

## Installing ClickHouse Grafana Data Source

Install the ClickHouse Grafana plugin:

```bash
grafana-cli plugins install grafana-clickhouse-datasource
systemctl restart grafana-server
```

Configure the data source in Grafana UI:
- Type: ClickHouse
- URL: `http://clickhouse-server:8123`
- User: `default`
- Default database: `default`

## Sample Grafana Dashboard Queries

### Queries Per Second

```text
rate(ClickHouseProfileEvents_Query[1m])
```

### Failed Queries Rate

```text
rate(ClickHouseProfileEvents_FailedQuery[5m])
```

### Memory Usage

```text
ClickHouseAsyncMetrics_MemoryResident / 1024 / 1024 / 1024
```

### Active Background Merges

```text
ClickHouseMetrics_BackgroundMergesAndMutationsPoolTask
```

### Replication Lag

```text
ClickHouseAsyncMetrics_ReplicasMaxRelativeDelay
```

## Using system.metrics for SQL-Based Monitoring

Query metrics directly from ClickHouse:

```sql
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric LIKE '%Merge%'
ORDER BY metric;
```

```sql
SELECT
    event,
    value
FROM system.events
WHERE event IN (
    'Query',
    'SelectQuery',
    'InsertQuery',
    'FailedQuery',
    'MergedRows'
);
```

## Alerting Rules in Prometheus

```yaml
groups:
  - name: clickhouse
    rules:
      - alert: ClickHouseHighMemoryUsage
        expr: ClickHouseAsyncMetrics_MemoryResident > 50000000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse memory usage above 50GB on {{ $labels.instance }}"

      - alert: ClickHouseReplicationLag
        expr: ClickHouseAsyncMetrics_ReplicasMaxRelativeDelay > 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse replication lag > 5 minutes on {{ $labels.instance }}"
```

## Summary

ClickHouse has built-in Prometheus support via the `<prometheus>` config block. Enable it on port 9363, add the target to Prometheus, and build Grafana dashboards using the `ClickHouseProfileEvents_*`, `ClickHouseMetrics_*`, and `ClickHouseAsyncMetrics_*` metric families. Configure alerting rules in Prometheus for memory thresholds and replication lag to catch issues before they impact queries.
