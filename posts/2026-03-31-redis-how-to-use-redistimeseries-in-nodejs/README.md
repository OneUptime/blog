# How to Use RedisTimeSeries in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, RedisTimeSeries, Time Series, Metric, ioredis

Description: Learn how to use RedisTimeSeries in Node.js with ioredis to ingest, query, and aggregate time-stamped metrics data for monitoring and analytics.

---

## What Is RedisTimeSeries?

RedisTimeSeries is a Redis module for time-series data with:

- Fast sample ingestion (`TS.ADD`)
- Range queries with aggregations (avg, min, max, sum, count)
- Automatic retention and compaction rules
- Label-based multi-series queries

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack:latest
npm install ioredis
```

## Creating a Time Series

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function createTimeSeries() {
  // Create series with retention (milliseconds) and labels
  await redis.call(
    'TS.CREATE', 'metrics:cpu:server1',
    'RETENTION', String(7 * 24 * 60 * 60 * 1000),  // 7 days
    'LABELS', 'host', 'server1', 'metric', 'cpu', 'unit', 'percent'
  );

  await redis.call(
    'TS.CREATE', 'metrics:memory:server1',
    'RETENTION', String(24 * 60 * 60 * 1000),  // 1 day
    'DUPLICATE_POLICY', 'LAST',
    'LABELS', 'host', 'server1', 'metric', 'memory'
  );

  console.log('Time series created');
}

createTimeSeries();
```

## Adding Data Points

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function addDataPoints() {
  const now = Date.now();

  // Add single data point
  await redis.call('TS.ADD', 'metrics:cpu:server1', String(now), '45.5');

  // Add with auto-timestamp (use * for current time)
  await redis.call('TS.ADD', 'metrics:cpu:server1', '*', '47.2');

  // Batch add multiple samples across different series
  await redis.call(
    'TS.MADD',
    'metrics:cpu:server1', String(now - 60000), '42.1',
    'metrics:cpu:server1', String(now - 30000), '44.8',
    'metrics:memory:server1', String(now - 60000), '68.3',
    'metrics:memory:server1', String(now), '72.1'
  );

  console.log('Data points added');
}

addDataPoints();
```

## Range Queries

```javascript
const Redis = require('ioredis');
const redis = new Redis();

function parseTsRange(result) {
  return result.map(([timestamp, value]) => ({
    timestamp: parseInt(timestamp),
    value: parseFloat(value)
  }));
}

async function queryRange() {
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;

  // Get all data points in range
  const raw = await redis.call(
    'TS.RANGE', 'metrics:cpu:server1',
    String(oneHourAgo), String(now)
  );
  const points = parseTsRange(raw);
  console.log(`Found ${points.length} data points in last hour`);
  points.forEach(p => console.log(`  ${p.timestamp}: ${p.value}%`));

  // Get latest value
  const latest = await redis.call('TS.GET', 'metrics:cpu:server1');
  console.log('Latest CPU:', latest[1], '%');
}

queryRange();
```

## Aggregated Range Queries

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function aggregatedQuery() {
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;
  const fiveMinMs = 5 * 60 * 1000;

  // Average CPU over 5-minute buckets
  const avgResult = await redis.call(
    'TS.RANGE', 'metrics:cpu:server1',
    String(oneHourAgo), String(now),
    'AGGREGATION', 'avg', String(fiveMinMs)
  );

  console.log('CPU averages (5-min buckets):');
  avgResult.forEach(([ts, val]) => {
    console.log(`  ${new Date(parseInt(ts)).toISOString()}: ${parseFloat(val).toFixed(2)}%`);
  });

  // Min/max in 1-minute buckets
  const minResult = await redis.call(
    'TS.RANGE', 'metrics:cpu:server1',
    String(oneHourAgo), String(now),
    'AGGREGATION', 'min', String(60 * 1000)
  );

  const maxResult = await redis.call(
    'TS.RANGE', 'metrics:cpu:server1',
    String(oneHourAgo), String(now),
    'AGGREGATION', 'max', String(60 * 1000)
  );

  console.log(`Min: ${minResult[0]?.[1]}, Max: ${maxResult[0]?.[1]}`);
}

aggregatedQuery();
```

## Setting Up Compaction Rules

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function setupCompaction() {
  // Raw data (short retention)
  await redis.call(
    'TS.CREATE', 'metrics:requests:raw',
    'RETENTION', String(3600 * 1000)  // 1 hour
  );

  // 1-minute averages (7-day retention)
  await redis.call(
    'TS.CREATE', 'metrics:requests:1min',
    'RETENTION', String(7 * 24 * 3600 * 1000)
  );

  // Create compaction rule
  await redis.call(
    'TS.CREATERULE',
    'metrics:requests:raw',   // Source
    'metrics:requests:1min',  // Destination
    'AGGREGATION', 'avg', String(60 * 1000)
  );

  console.log('Compaction rule created');
}

setupCompaction();
```

## Metrics Collector Class

```javascript
const Redis = require('ioredis');
const redis = new Redis();
const os = require('os');

class MetricsCollector {
  constructor(host = os.hostname()) {
    this.host = host;
    this.series = {
      cpu: `metrics:cpu:${host}`,
      memory: `metrics:memory:${host}`,
    };
  }

  async init() {
    for (const [name, key] of Object.entries(this.series)) {
      try {
        await redis.call(
          'TS.CREATE', key,
          'RETENTION', String(24 * 3600 * 1000),
          'LABELS', 'host', this.host, 'metric', name
        );
      } catch {
        // Already exists
      }
    }
  }

  async collect() {
    const now = Date.now();
    const cpuLoad = os.loadavg()[0] * 10; // normalize
    const memUsed = (1 - os.freemem() / os.totalmem()) * 100;

    await redis.call(
      'TS.MADD',
      this.series.cpu, String(now), cpuLoad.toFixed(2),
      this.series.memory, String(now), memUsed.toFixed(2)
    );
  }

  async getLastHour(metric) {
    const key = this.series[metric];
    const now = Date.now();
    return redis.call(
      'TS.RANGE', key,
      String(now - 3600 * 1000), String(now),
      'AGGREGATION', 'avg', String(60 * 1000)
    );
  }
}

(async () => {
  const collector = new MetricsCollector();
  await collector.init();

  setInterval(() => collector.collect(), 10000);
})();
```

## Summary

RedisTimeSeries in Node.js uses ioredis `call()` for commands like `TS.CREATE`, `TS.ADD`, `TS.MADD`, `TS.RANGE`, and `TS.GET`. Create series with retention periods and labels, ingest samples with `TS.MADD` for bulk writes, and query aggregated ranges with `AGGREGATION avg/min/max` to reduce data volume. Compaction rules automatically downsample high-frequency data for long-term storage without manual intervention.
