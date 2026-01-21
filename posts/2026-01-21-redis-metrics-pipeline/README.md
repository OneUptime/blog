# How to Build a Metrics Pipeline with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Metrics, Pipeline, Monitoring, Observability, Data Engineering

Description: A comprehensive guide to building a metrics collection, aggregation, and querying pipeline using Redis for real-time monitoring and observability systems.

---

A metrics pipeline is the backbone of any observability system. It collects, aggregates, stores, and serves metrics data for dashboards, alerts, and analysis. Redis excels in this role due to its low latency, versatile data structures, and support for time-series operations.

## Architecture Overview

A typical Redis-based metrics pipeline consists of:

1. **Collection Layer**: Receives metrics from applications
2. **Aggregation Layer**: Computes rollups and downsamples data
3. **Storage Layer**: Persists metrics with appropriate retention
4. **Query Layer**: Serves data to dashboards and alerting systems

```
Applications --> Collection --> Aggregation --> Storage --> Query API
                    |               |              |
                    v               v              v
                  Redis          Redis          Redis
                 Streams      TimeSeries       Sorted Sets
```

## Step 1: Metrics Collection

### Direct Push with Streams

```python
import redis
import time
import json
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class MetricsCollector:
    def __init__(self, stream_prefix='metrics:raw'):
        self.stream_prefix = stream_prefix

    def collect(self, metric_name, value, tags=None, timestamp=None):
        """Collect a single metric data point."""
        if timestamp is None:
            timestamp = int(time.time() * 1000)

        if tags is None:
            tags = {}

        stream_key = f"{self.stream_prefix}:{metric_name}"

        fields = {
            'value': str(value),
            'timestamp': str(timestamp),
            **{f'tag_{k}': v for k, v in tags.items()}
        }

        message_id = r.xadd(stream_key, fields, maxlen=100000)
        return message_id

    def collect_batch(self, metrics):
        """Collect multiple metrics in a batch."""
        pipe = r.pipeline()

        for metric in metrics:
            stream_key = f"{self.stream_prefix}:{metric['name']}"
            timestamp = metric.get('timestamp', int(time.time() * 1000))
            tags = metric.get('tags', {})

            fields = {
                'value': str(metric['value']),
                'timestamp': str(timestamp),
                **{f'tag_{k}': v for k, v in tags.items()}
            }

            pipe.xadd(stream_key, fields, maxlen=100000)

        return pipe.execute()

# Usage
collector = MetricsCollector()

# Single metric
collector.collect('cpu_usage', 75.5, tags={'host': 'server1', 'region': 'us-east'})

# Batch collection
metrics = [
    {'name': 'memory_usage', 'value': 62.3, 'tags': {'host': 'server1'}},
    {'name': 'disk_io', 'value': 1024, 'tags': {'host': 'server1', 'disk': 'sda'}},
    {'name': 'network_rx', 'value': 50000, 'tags': {'host': 'server1', 'iface': 'eth0'}},
]
collector.collect_batch(metrics)
```

### Node.js Collection Client

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class MetricsCollector {
  constructor(streamPrefix = 'metrics:raw') {
    this.streamPrefix = streamPrefix;
    this.buffer = [];
    this.flushInterval = null;
  }

  async collect(metricName, value, tags = {}, timestamp = Date.now()) {
    const streamKey = `${this.streamPrefix}:${metricName}`;

    const fields = [
      'value', String(value),
      'timestamp', String(timestamp),
      ...Object.entries(tags).flatMap(([k, v]) => [`tag_${k}`, v])
    ];

    return await redis.xadd(streamKey, 'MAXLEN', '~', 100000, '*', ...fields);
  }

  // Buffered collection for high-throughput scenarios
  buffer(metricName, value, tags = {}) {
    this.buffer.push({ name: metricName, value, tags, timestamp: Date.now() });

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const metrics = this.buffer.splice(0);
    const pipeline = redis.pipeline();

    for (const metric of metrics) {
      const streamKey = `${this.streamPrefix}:${metric.name}`;
      const fields = [
        'value', String(metric.value),
        'timestamp', String(metric.timestamp),
        ...Object.entries(metric.tags).flatMap(([k, v]) => [`tag_${k}`, v])
      ];

      pipeline.xadd(streamKey, 'MAXLEN', '~', 100000, '*', ...fields);
    }

    await pipeline.exec();
  }

  startAutoFlush(intervalMs = 1000) {
    this.flushInterval = setInterval(() => this.flush(), intervalMs);
  }

  stopAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flush(); // Final flush
    }
  }
}

// Usage
const collector = new MetricsCollector();
collector.startAutoFlush(1000);

// Collect metrics
setInterval(() => {
  collector.buffer('api_latency', Math.random() * 100, {
    endpoint: '/api/users',
    method: 'GET'
  });
}, 10);
```

## Step 2: Metrics Aggregation

### Stream Consumer for Real-time Aggregation

```python
import threading
from collections import defaultdict
from statistics import mean

class MetricsAggregator:
    def __init__(self, input_prefix='metrics:raw', output_prefix='metrics:agg'):
        self.input_prefix = input_prefix
        self.output_prefix = output_prefix
        self.running = False
        self.aggregation_buckets = defaultdict(list)
        self.bucket_interval = 60  # 1-minute buckets

    def _get_bucket_key(self, timestamp):
        """Get the bucket key for a timestamp."""
        bucket = int(timestamp / 1000 / self.bucket_interval)
        return bucket * self.bucket_interval * 1000

    def _aggregate_and_store(self, metric_name, bucket_key, values):
        """Compute aggregations and store results."""
        if not values:
            return

        aggregations = {
            'min': min(values),
            'max': max(values),
            'avg': mean(values),
            'sum': sum(values),
            'count': len(values)
        }

        # Store aggregated metrics
        pipe = r.pipeline()
        for agg_type, value in aggregations.items():
            key = f"{self.output_prefix}:{metric_name}:{agg_type}"
            pipe.zadd(key, {f"{bucket_key}:{value}": bucket_key})
            pipe.expire(key, 86400 * 7)  # 7-day retention

        pipe.execute()

    def process_stream(self, metric_name, consumer_group='aggregators', consumer_name='agg1'):
        """Process metrics stream and compute aggregations."""
        stream_key = f"{self.input_prefix}:{metric_name}"

        # Create consumer group if not exists
        try:
            r.xgroup_create(stream_key, consumer_group, id='0', mkstream=True)
        except:
            pass

        current_bucket = None
        bucket_values = []

        while self.running:
            entries = r.xreadgroup(
                consumer_group,
                consumer_name,
                {stream_key: '>'},
                count=100,
                block=1000
            )

            if not entries:
                continue

            for stream, messages in entries:
                for message_id, fields in messages:
                    value = float(fields['value'])
                    timestamp = int(fields['timestamp'])
                    bucket_key = self._get_bucket_key(timestamp)

                    if current_bucket is None:
                        current_bucket = bucket_key

                    if bucket_key != current_bucket:
                        # Flush previous bucket
                        self._aggregate_and_store(
                            metric_name, current_bucket, bucket_values
                        )
                        bucket_values = []
                        current_bucket = bucket_key

                    bucket_values.append(value)

                    # Acknowledge message
                    r.xack(stream_key, consumer_group, message_id)

    def start(self, metric_names):
        """Start aggregation workers for multiple metrics."""
        self.running = True
        threads = []

        for metric_name in metric_names:
            t = threading.Thread(
                target=self.process_stream,
                args=(metric_name,)
            )
            t.start()
            threads.append(t)

        return threads

    def stop(self):
        """Stop all aggregation workers."""
        self.running = False
```

### RedisTimeSeries for Automatic Aggregation

```python
from redis.commands.timeseries import TimeSeries

ts = r.ts()

class TimeSeriesAggregator:
    def __init__(self):
        self.raw_retention = 3600000     # 1 hour for raw data
        self.min_retention = 86400000    # 1 day for 1-minute rollups
        self.hour_retention = 604800000  # 7 days for hourly rollups

    def create_metric_with_rollups(self, metric_name, labels=None):
        """Create a metric with automatic downsampling rules."""
        if labels is None:
            labels = {}

        # Raw series
        raw_key = f"ts:{metric_name}:raw"
        min_key = f"ts:{metric_name}:1m"
        hour_key = f"ts:{metric_name}:1h"

        # Create series
        for key, retention in [
            (raw_key, self.raw_retention),
            (min_key, self.min_retention),
            (hour_key, self.hour_retention)
        ]:
            try:
                ts.create(key, retention_msecs=retention, labels=labels)
            except:
                pass  # Already exists

        # Create aggregation rules
        try:
            ts.createrule(raw_key, min_key, 'avg', 60000)  # 1-minute avg
            ts.createrule(raw_key, hour_key, 'avg', 3600000)  # 1-hour avg
        except:
            pass  # Rules exist

    def add_metric(self, metric_name, value, timestamp=None):
        """Add a metric value to the raw series."""
        raw_key = f"ts:{metric_name}:raw"
        if timestamp is None:
            timestamp = '*'
        return ts.add(raw_key, timestamp, value)

    def query_metric(self, metric_name, resolution, start, end, aggregation='avg'):
        """Query metric data at specified resolution."""
        if resolution == 'raw':
            key = f"ts:{metric_name}:raw"
            return ts.range(key, start, end)
        elif resolution == '1m':
            key = f"ts:{metric_name}:1m"
            return ts.range(key, start, end)
        elif resolution == '1h':
            key = f"ts:{metric_name}:1h"
            return ts.range(key, start, end)
        else:
            # Custom resolution with aggregation
            key = f"ts:{metric_name}:raw"
            bucket_ms = self._resolution_to_ms(resolution)
            return ts.range(
                key, start, end,
                aggregation_type=aggregation,
                bucket_size_msec=bucket_ms
            )

    def _resolution_to_ms(self, resolution):
        """Convert resolution string to milliseconds."""
        units = {'s': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000}
        value = int(resolution[:-1])
        unit = resolution[-1]
        return value * units[unit]

# Usage
aggregator = TimeSeriesAggregator()

# Setup metrics with rollups
aggregator.create_metric_with_rollups('cpu_usage', {'host': 'server1'})
aggregator.create_metric_with_rollups('memory_usage', {'host': 'server1'})

# Add data
for i in range(1000):
    aggregator.add_metric('cpu_usage', 50 + (i % 30))
    aggregator.add_metric('memory_usage', 60 + (i % 20))

# Query at different resolutions
now = int(time.time() * 1000)
one_hour_ago = now - 3600000

raw_data = aggregator.query_metric('cpu_usage', 'raw', one_hour_ago, now)
minute_data = aggregator.query_metric('cpu_usage', '1m', one_hour_ago, now)
```

## Step 3: Query API

### Building a Metrics Query Service

```python
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

class MetricsQueryService:
    def __init__(self):
        self.ts = r.ts()

    def query_range(self, metric_name, start, end, resolution='1m', labels=None):
        """Query metrics within a time range."""
        if labels:
            # Multi-series query with label filters
            filter_str = ' '.join([f'{k}={v}' for k, v in labels.items()])
            results = self.ts.mrange(
                start, end,
                filters=[filter_str],
                aggregation_type='avg',
                bucket_size_msec=self._resolution_to_ms(resolution)
            )
            return self._format_mrange_results(results)
        else:
            # Single series query
            key = f"ts:{metric_name}:{resolution}"
            results = self.ts.range(key, start, end)
            return self._format_range_results(results)

    def query_instant(self, metric_name, timestamp=None):
        """Query the latest value of a metric."""
        key = f"ts:{metric_name}:raw"
        if timestamp is None:
            result = self.ts.get(key)
        else:
            result = self.ts.range(key, timestamp - 1000, timestamp)
            result = result[-1] if result else None
        return result

    def query_labels(self, metric_name):
        """Get all label values for a metric."""
        key = f"ts:{metric_name}:raw"
        info = self.ts.info(key)
        return info.labels if info else {}

    def list_metrics(self, label_filter=None):
        """List all available metrics."""
        if label_filter:
            filter_str = ' '.join([f'{k}={v}' for k, v in label_filter.items()])
            return self.ts.queryindex([filter_str])
        else:
            return self.ts.queryindex(['__name__!='])

    def _resolution_to_ms(self, resolution):
        units = {'s': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000}
        if resolution in ['raw', '1m', '1h']:
            return 60000  # Default to 1 minute
        value = int(resolution[:-1])
        unit = resolution[-1]
        return value * units.get(unit, 60000)

    def _format_range_results(self, results):
        return [{'timestamp': ts, 'value': val} for ts, val in results]

    def _format_mrange_results(self, results):
        formatted = {}
        for series in results:
            key = series[0]
            labels = series[1]
            data = series[2]
            formatted[key] = {
                'labels': labels,
                'data': [{'timestamp': ts, 'value': val} for ts, val in data]
            }
        return formatted

query_service = MetricsQueryService()

@app.route('/api/v1/query_range')
def query_range():
    metric = request.args.get('metric')
    start = int(request.args.get('start', time.time() * 1000 - 3600000))
    end = int(request.args.get('end', time.time() * 1000))
    resolution = request.args.get('resolution', '1m')

    data = query_service.query_range(metric, start, end, resolution)
    return jsonify({'status': 'success', 'data': data})

@app.route('/api/v1/query')
def query_instant():
    metric = request.args.get('metric')
    data = query_service.query_instant(metric)
    return jsonify({'status': 'success', 'data': data})

@app.route('/api/v1/metrics')
def list_metrics():
    metrics = query_service.list_metrics()
    return jsonify({'status': 'success', 'data': metrics})
```

### Node.js Query API

```javascript
const express = require('express');
const Redis = require('ioredis');

const app = express();
const redis = new Redis();

class MetricsQueryService {
  async queryRange(metricName, start, end, resolution = '1m') {
    const key = `ts:${metricName}:${resolution}`;

    try {
      const results = await redis.call('TS.RANGE', key, start, end);
      return results.map(([timestamp, value]) => ({
        timestamp: parseInt(timestamp),
        value: parseFloat(value)
      }));
    } catch (err) {
      // Fallback to raw data with aggregation
      const rawKey = `ts:${metricName}:raw`;
      const bucketMs = this.resolutionToMs(resolution);

      const results = await redis.call(
        'TS.RANGE', rawKey, start, end,
        'AGGREGATION', 'avg', bucketMs
      );

      return results.map(([timestamp, value]) => ({
        timestamp: parseInt(timestamp),
        value: parseFloat(value)
      }));
    }
  }

  async queryInstant(metricName) {
    const key = `ts:${metricName}:raw`;
    const result = await redis.call('TS.GET', key);

    if (!result) return null;

    return {
      timestamp: parseInt(result[0]),
      value: parseFloat(result[1])
    };
  }

  async aggregateQuery(metricName, start, end, aggregation, bucketMs) {
    const key = `ts:${metricName}:raw`;

    const results = await redis.call(
      'TS.RANGE', key, start, end,
      'AGGREGATION', aggregation, bucketMs
    );

    return results.map(([timestamp, value]) => ({
      timestamp: parseInt(timestamp),
      value: parseFloat(value)
    }));
  }

  resolutionToMs(resolution) {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const value = parseInt(resolution.slice(0, -1));
    const unit = resolution.slice(-1);
    return value * (units[unit] || 60000);
  }
}

const queryService = new MetricsQueryService();

app.get('/api/v1/query_range', async (req, res) => {
  const { metric, start, end, resolution } = req.query;

  const data = await queryService.queryRange(
    metric,
    parseInt(start) || Date.now() - 3600000,
    parseInt(end) || Date.now(),
    resolution || '1m'
  );

  res.json({ status: 'success', data });
});

app.get('/api/v1/query', async (req, res) => {
  const { metric } = req.query;
  const data = await queryService.queryInstant(metric);
  res.json({ status: 'success', data });
});

app.listen(3000, () => {
  console.log('Metrics API listening on port 3000');
});
```

## Step 4: Complete Pipeline Example

### Full Pipeline Implementation

```python
import asyncio
import aioredis
import time
import random
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class Metric:
    name: str
    value: float
    tags: Dict[str, str]
    timestamp: Optional[int] = None

class MetricsPipeline:
    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis_url = redis_url
        self.redis = None
        self.buffer = []
        self.buffer_size = 100
        self.flush_interval = 1.0

    async def connect(self):
        """Initialize Redis connection."""
        self.redis = await aioredis.from_url(self.redis_url)

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()

    async def collect(self, metric: Metric):
        """Add metric to buffer for batch processing."""
        if metric.timestamp is None:
            metric.timestamp = int(time.time() * 1000)

        self.buffer.append(metric)

        if len(self.buffer) >= self.buffer_size:
            await self.flush()

    async def flush(self):
        """Flush buffered metrics to Redis."""
        if not self.buffer:
            return

        metrics = self.buffer[:]
        self.buffer.clear()

        pipe = self.redis.pipeline()

        for metric in metrics:
            # Store in stream for processing
            stream_key = f"metrics:raw:{metric.name}"
            fields = {
                'value': str(metric.value),
                'timestamp': str(metric.timestamp),
                **{f'tag_{k}': v for k, v in metric.tags.items()}
            }
            pipe.xadd(stream_key, fields, maxlen=100000)

            # Store in sorted set for quick queries
            zset_key = f"metrics:latest:{metric.name}"
            member = f"{metric.timestamp}:{metric.value}"
            pipe.zadd(zset_key, {member: metric.timestamp})

            # Trim old data (keep last hour)
            cutoff = metric.timestamp - 3600000
            pipe.zremrangebyscore(zset_key, '-inf', cutoff)

        await pipe.execute()

    async def query(self, metric_name: str, start: int, end: int) -> List[Dict]:
        """Query metrics from sorted set."""
        key = f"metrics:latest:{metric_name}"
        results = await self.redis.zrangebyscore(
            key, start, end, withscores=True
        )

        return [
            {
                'timestamp': int(score),
                'value': float(member.split(':')[1])
            }
            for member, score in results
        ]

    async def get_latest(self, metric_name: str) -> Optional[Dict]:
        """Get the most recent value."""
        key = f"metrics:latest:{metric_name}"
        result = await self.redis.zrevrange(key, 0, 0, withscores=True)

        if not result:
            return None

        member, score = result[0]
        return {
            'timestamp': int(score),
            'value': float(member.split(':')[1])
        }

    async def start_auto_flush(self):
        """Start background flush task."""
        while True:
            await asyncio.sleep(self.flush_interval)
            await self.flush()

# Usage example
async def main():
    pipeline = MetricsPipeline()
    await pipeline.connect()

    # Start auto-flush in background
    flush_task = asyncio.create_task(pipeline.start_auto_flush())

    # Simulate metric collection
    for i in range(1000):
        await pipeline.collect(Metric(
            name='cpu_usage',
            value=50 + random.random() * 30,
            tags={'host': 'server1', 'region': 'us-east'}
        ))

        await pipeline.collect(Metric(
            name='memory_usage',
            value=60 + random.random() * 20,
            tags={'host': 'server1', 'region': 'us-east'}
        ))

        await asyncio.sleep(0.01)

    # Final flush
    await pipeline.flush()

    # Query data
    now = int(time.time() * 1000)
    data = await pipeline.query('cpu_usage', now - 60000, now)
    print(f"Retrieved {len(data)} data points")

    latest = await pipeline.get_latest('cpu_usage')
    print(f"Latest value: {latest}")

    flush_task.cancel()
    await pipeline.close()

if __name__ == '__main__':
    asyncio.run(main())
```

## Best Practices

### 1. Use Connection Pooling

```python
import redis
from redis import ConnectionPool

pool = ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=20,
    decode_responses=True
)

r = redis.Redis(connection_pool=pool)
```

### 2. Implement Backpressure

```python
class BackpressureCollector:
    def __init__(self, max_buffer_size=10000):
        self.buffer = []
        self.max_buffer_size = max_buffer_size

    async def collect(self, metric):
        if len(self.buffer) >= self.max_buffer_size:
            # Drop oldest metrics or apply sampling
            self.buffer = self.buffer[1000:]  # Keep recent 90%

        self.buffer.append(metric)
```

### 3. Monitor Pipeline Health

```python
class PipelineMetrics:
    def __init__(self):
        self.metrics_collected = 0
        self.metrics_flushed = 0
        self.flush_errors = 0
        self.buffer_high_water = 0

    def record_collection(self, count=1):
        self.metrics_collected += count

    def record_flush(self, count, error=False):
        if error:
            self.flush_errors += 1
        else:
            self.metrics_flushed += count

    def record_buffer_size(self, size):
        self.buffer_high_water = max(self.buffer_high_water, size)
```

## Conclusion

Building a metrics pipeline with Redis provides a flexible, high-performance foundation for observability systems. The combination of streams for collection, automated aggregation with RedisTimeSeries, and sorted sets for quick queries creates a robust architecture that scales from small applications to large distributed systems.

Key takeaways:

- Use Redis Streams for reliable metric ingestion with consumer groups
- Leverage RedisTimeSeries for automatic downsampling and retention
- Implement buffering and batching for high-throughput scenarios
- Design your query API around common access patterns
- Monitor your pipeline's health with internal metrics
