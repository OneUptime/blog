# How to Use clickhouse-monitoring Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, Dashboard, Grafana, Observability

Description: Learn how to set up and use the clickhouse-monitoring dashboard to visualize queries, system metrics, replication health, and resource usage.

---

The `clickhouse-monitoring` project by Duyet Le provides a ready-made Next.js-based monitoring dashboard for ClickHouse, covering queries in flight, replication status, disk usage, and more. Getting it running takes under 30 minutes. You can also pair it with Grafana for richer alerting and custom panels.

## Installing clickhouse-monitoring

Clone the repository and start the stack with Docker Compose:

```bash
git clone https://github.com/duyet/clickhouse-monitoring.git
cd clickhouse-monitoring
docker-compose up -d
```

This starts the Next.js monitoring dashboard and its dependencies. Access the UI at `http://localhost:3000`.

## Configuring ClickHouse as a Grafana Data Source

For additional monitoring with Grafana, add ClickHouse as a data source from the Grafana UI or via provisioning:

```yaml
apiVersion: 1
datasources:
  - name: ClickHouse
    type: grafana-clickhouse-datasource
    url: http://clickhouse:8123
    jsonData:
      defaultDatabase: default
      username: default
    secureJsonData:
      password: ""
```

## Key Dashboard Panels

The dashboard includes panels for:

- **Active queries** - queries currently executing with duration and memory usage
- **Replication queue** - pending parts per table across replicas
- **Merge progress** - ongoing background merges and their status
- **Disk usage** - compressed and uncompressed bytes per database and table
- **Memory usage** - current and peak memory consumption per query
- **Insert rate** - rows and bytes written per second over time

## Querying the Dashboard Data Directly

The dashboard runs queries against system tables. To replicate key panels manually:

```sql
-- Active queries panel
SELECT
    elapsed,
    read_rows,
    memory_usage,
    query
FROM system.processes
WHERE is_cancelled = 0
ORDER BY elapsed DESC;
```

```sql
-- Insert rate panel
SELECT
    toStartOfMinute(event_time) AS minute,
    sum(written_rows) AS rows_written,
    sum(written_bytes) AS bytes_written
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND query_kind = 'Insert'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Adding Custom Panels

Extend the dashboard with project-specific panels. For example, track slow queries per user:

```sql
SELECT
    user,
    count() AS slow_query_count,
    avg(query_duration_ms) AS avg_ms
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND query_duration_ms > 5000
    AND event_time >= $__timeFrom()
    AND event_time <= $__timeTo()
GROUP BY user
ORDER BY slow_query_count DESC;
```

## Setting Up Alerts from the Dashboard

Configure Grafana alerts on dashboard panels. For example, alert when the replication queue exceeds 100 pending parts:

```sql
SELECT sum(inserts_in_queue + merges_in_queue) AS total_pending
FROM system.replicas;
```

Set a threshold alert in Grafana: fire when `total_pending > 100` for more than 5 minutes.

## Summary

The clickhouse-monitoring dashboard gives operators an immediate view into ClickHouse health with minimal setup. It covers all the key observability surfaces - active queries, replication, merges, disk, and memory. Start with the default panels and add custom SQL queries to track application-specific metrics like per-user slow query rates or table-level insert throughput.
