# How to Ingest Data from StatsD into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, StatsD, Metrics Ingestion, Analytics, Vector

Description: Learn how to ingest StatsD metrics into ClickHouse using Vector or a custom forwarder to store counters, gauges, and timers for long-term analytics.

---

StatsD aggregates application metrics (counters, gauges, timers) and emits them to a backend. ClickHouse makes an excellent long-term store for StatsD metrics, enabling historical queries and alerting.

## Target Table

```sql
CREATE TABLE statsd_metrics (
    received_at DateTime DEFAULT now(),
    metric_name LowCardinality(String),
    metric_type LowCardinality(String),  -- counter, gauge, timer, set
    value Float64,
    sample_rate Float32 DEFAULT 1.0,
    tags Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(received_at)
ORDER BY (metric_name, received_at)
TTL received_at + INTERVAL 90 DAY;
```

## Using Vector.dev as StatsD Relay

Vector can receive StatsD over UDP and forward to ClickHouse:

```yaml
sources:
  statsd_in:
    type: statsd
    mode: udp
    address: "0.0.0.0:8125"

transforms:
  statsd_to_log:
    type: metric_to_log
    inputs: ["statsd_in"]
  shape_for_clickhouse:
    type: remap
    inputs: ["statsd_to_log"]
    source: |
      .received_at = now()
      .metric_name = .name
      if exists(.counter.value) {
        .metric_type = "counter"
        .value = .counter.value
      } else if exists(.gauge.value) {
        .metric_type = "gauge"
        .value = .gauge.value
      } else if exists(.distribution) {
        .metric_type = "distribution"
        .value = 0.0
      } else if exists(.set) {
        .metric_type = "set"
        .value = 0.0
      }

sinks:
  clickhouse_out:
    type: clickhouse
    inputs: ["shape_for_clickhouse"]
    endpoint: "http://clickhouse:8123"
    database: default
    table: statsd_metrics
    auth:
      strategy: basic
      user: default
      password: "${CLICKHOUSE_PASSWORD}"
    batch:
      max_events: 2000
      timeout_secs: 5
```

The `metric_to_log` transform is required because Vector's StatsD source emits metric events, but the ClickHouse sink only accepts log events.

## Custom Node.js StatsD to ClickHouse Forwarder

```javascript
const dgram = require('dgram');
const { createClient } = require('@clickhouse/client');

const client = createClient({ url: 'http://clickhouse:8123' });
const sock = dgram.createSocket('udp4');

const buffer = [];
sock.on('message', (msg) => {
    const [nameValue, metricType] = msg.toString().split('|');
    const [name, valueStr] = nameValue.split(':');
    buffer.push({ metric_name: name, metric_type: metricType, value: parseFloat(valueStr) });
    if (buffer.length >= 500) flush();
});

async function flush() {
    const rows = buffer.splice(0);
    await client.insert({ table: 'statsd_metrics', values: rows, format: 'JSONEachRow' });
}

sock.bind(8125);
setInterval(flush, 5000);
```

## Querying Metrics

```sql
SELECT
    toStartOfMinute(received_at) AS minute,
    metric_name,
    sum(value) AS total
FROM statsd_metrics
WHERE metric_type = 'counter'
  AND received_at >= now() - INTERVAL 1 HOUR
GROUP BY minute, metric_name
ORDER BY minute, total DESC;
```

## Summary

StatsD metrics can be forwarded to ClickHouse via Vector (simplest setup) or a custom UDP relay. Use a MergeTree table with TTL for automatic data expiry and query aggregated metrics with time bucketing for dashboards and alerts.
