# How to Use ClickHouse as a Prometheus Long-Term Storage Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prometheus, Long-Term Storage, Observability, Metric

Description: Learn how to configure ClickHouse as a remote write storage backend for Prometheus to retain metrics for months or years at low cost.

---

## Why ClickHouse for Prometheus Long-Term Storage

Prometheus's local TSDB retains data for a configurable window (default 15 days). ClickHouse can receive Prometheus remote write data, compress it efficiently, and serve range queries through a compatible adapter - providing cheap multi-year retention.

## Adapter Options

The most common approaches are:

- **ClickHouse native Prometheus support** - built-in remote write/read handlers, no external adapter needed (recommended)
- **PromHouse** - early open-source adapter by Percona Labs (experimental)
- **prom2click** - community remote storage adapter

## Configuring ClickHouse Native Prometheus Support

Since ClickHouse 24.8, Prometheus remote write and read protocols are supported natively. Add the following to your ClickHouse server configuration (e.g., `config.d/prometheus.xml`):

```xml
<clickhouse>
    <prometheus>
        <port>9363</port>
        <handlers>
            <write_handler>
                <url>/write</url>
                <handler>
                    <type>remote_write</type>
                    <table>metrics.prometheus</table>
                </handler>
            </write_handler>
            <read_handler>
                <url>/read</url>
                <handler>
                    <type>remote_read</type>
                    <table>metrics.prometheus</table>
                </handler>
            </read_handler>
        </handlers>
    </prometheus>
</clickhouse>
```

## ClickHouse Schema

Create the target database and a `TimeSeries` table, which automatically generates the required internal tables for data, tags, and metric metadata:

```sql
SET allow_experimental_time_series_table = 1;

CREATE DATABASE IF NOT EXISTS metrics;

CREATE TABLE metrics.prometheus ENGINE = TimeSeries;
```

The `TimeSeries` engine creates three internal sub-tables:

- A **data** table (MergeTree) storing `id`, `timestamp`, and `value`
- A **tags** table (AggregatingMergeTree) storing `metric_name` and label key-value pairs
- A **metrics** table (ReplacingMergeTree) storing metric family metadata

## Prometheus remote_write Configuration

```yaml
remote_write:
  - url: http://clickhouse:9363/write
    queue_config:
      max_samples_per_send: 10000
      capacity: 100000
      max_shards: 10

remote_read:
  - url: http://clickhouse:9363/read
    read_recent: true
```

## Querying Long-Term Data in Grafana

Point a Grafana Prometheus data source at the ClickHouse `/read` endpoint. Long-range queries work transparently.

```text
Datasource URL: http://clickhouse:9363
```

For direct ClickHouse queries, add a ClickHouse Grafana plugin data source to build custom dashboards against the internal data and tags tables:

```sql
SELECT
  toStartOfHour(d.timestamp) AS time,
  avg(d.value) AS cpu_avg
FROM metrics.`.inner_id.data.prometheus` AS d
JOIN metrics.`.inner_id.tags.prometheus` AS t ON d.id = t.id
WHERE t.metric_name = 'node_cpu_seconds_total'
  AND d.timestamp BETWEEN $__fromTime AND $__toTime
GROUP BY time
ORDER BY time
```

## Retention Tuning

Adjust the TTL on the internal data table to match your retention policy:

```sql
ALTER TABLE metrics.`.inner_id.data.prometheus`
  MODIFY TTL timestamp + INTERVAL 2 YEAR
```

## Summary

ClickHouse stores Prometheus metrics via its native remote write/read protocol support, providing compressed multi-year retention at a fraction of the cost of dedicated TSDB solutions. Configure the ClickHouse Prometheus handlers, point Prometheus `remote_write` and `remote_read` at the ClickHouse endpoint, and leverage ClickHouse's native TTL for automated data expiry.
