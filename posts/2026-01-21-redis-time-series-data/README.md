# How to Store Time-Series Data in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Time-Series, Data Storage, Analytics, Performance

Description: A comprehensive guide to storing and querying time-series data in Redis using sorted sets, streams, and RedisTimeSeries module with practical code examples.

---

Time-series data is everywhere - from application metrics and IoT sensor readings to financial market data and user activity logs. Redis offers multiple approaches to store and query this data efficiently. In this guide, we will explore three main strategies: sorted sets, streams, and the RedisTimeSeries module.

## Understanding Time-Series Data Requirements

Before choosing an approach, consider your requirements:

- **Write throughput**: How many data points per second?
- **Query patterns**: Point queries, range queries, or aggregations?
- **Retention**: How long do you need to keep data?
- **Memory constraints**: How much data will you store?
- **Aggregation needs**: Do you need downsampling or rollups?

## Approach 1: Using Sorted Sets

Sorted sets are Redis's built-in data structure that works well for time-series data. The score represents the timestamp, and the member contains the data.

### Basic Implementation

```python
import redis
import time
import json

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

def store_metric(metric_name, value, timestamp=None):
    """Store a single metric data point."""
    if timestamp is None:
        timestamp = time.time()

    # Use timestamp as score, value as member
    # Include timestamp in member to allow duplicate values
    member = json.dumps({
        'value': value,
        'timestamp': timestamp
    })

    r.zadd(f'metrics:{metric_name}', {member: timestamp})

def get_metrics_range(metric_name, start_time, end_time):
    """Retrieve metrics within a time range."""
    results = r.zrangebyscore(
        f'metrics:{metric_name}',
        start_time,
        end_time,
        withscores=True
    )

    return [
        {
            **json.loads(member),
            'score': score
        }
        for member, score in results
    ]

# Store some sample data
for i in range(100):
    store_metric('cpu_usage', 50 + (i % 30), time.time() - (100 - i))

# Query last 60 seconds
end_time = time.time()
start_time = end_time - 60
metrics = get_metrics_range('cpu_usage', start_time, end_time)
print(f"Retrieved {len(metrics)} data points")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function storeMetric(metricName, value, timestamp = Date.now()) {
  const member = JSON.stringify({
    value,
    timestamp
  });

  await redis.zadd(`metrics:${metricName}`, timestamp, member);
}

async function getMetricsRange(metricName, startTime, endTime) {
  const results = await redis.zrangebyscore(
    `metrics:${metricName}`,
    startTime,
    endTime,
    'WITHSCORES'
  );

  // Parse results (alternating member, score)
  const metrics = [];
  for (let i = 0; i < results.length; i += 2) {
    metrics.push({
      ...JSON.parse(results[i]),
      score: parseFloat(results[i + 1])
    });
  }

  return metrics;
}

// Usage example
async function main() {
  const now = Date.now();

  // Store sample data
  for (let i = 0; i < 100; i++) {
    await storeMetric('cpu_usage', 50 + (i % 30), now - (100 - i) * 1000);
  }

  // Query last 60 seconds
  const metrics = await getMetricsRange('cpu_usage', now - 60000, now);
  console.log(`Retrieved ${metrics.length} data points`);
}

main().catch(console.error);
```

### Implementing TTL with Sorted Sets

```python
def store_metric_with_ttl(metric_name, value, retention_seconds=3600):
    """Store metric with automatic expiration using a Lua script."""
    timestamp = time.time()
    member = json.dumps({'value': value, 'timestamp': timestamp})
    key = f'metrics:{metric_name}'

    # Lua script to add data and remove old entries atomically
    lua_script = """
    local key = KEYS[1]
    local member = ARGV[1]
    local score = ARGV[2]
    local cutoff = ARGV[3]

    -- Add new data point
    redis.call('ZADD', key, score, member)

    -- Remove data older than cutoff
    redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

    return redis.call('ZCARD', key)
    """

    cutoff = timestamp - retention_seconds
    result = r.eval(lua_script, 1, key, member, timestamp, cutoff)
    return result
```

## Approach 2: Using Redis Streams

Redis Streams provide a log data structure that is perfect for time-series data, especially when you need consumer groups for processing.

### Basic Stream Operations

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def store_stream_metric(stream_name, fields):
    """Add a metric to a stream."""
    # '*' tells Redis to auto-generate the ID with timestamp
    message_id = r.xadd(stream_name, fields)
    return message_id

def get_stream_range(stream_name, start_time='-', end_time='+', count=None):
    """Get metrics from stream within a range."""
    if count:
        return r.xrange(stream_name, start_time, end_time, count=count)
    return r.xrange(stream_name, start_time, end_time)

def get_stream_by_timestamp(stream_name, start_ms, end_ms):
    """Query stream by millisecond timestamp range."""
    return r.xrange(stream_name, f'{start_ms}-0', f'{end_ms}-0')

# Store metrics
stream = 'metrics:server1:cpu'
for i in range(100):
    store_stream_metric(stream, {
        'value': str(50 + (i % 30)),
        'host': 'server1',
        'region': 'us-east-1'
    })
    time.sleep(0.01)  # Small delay for unique timestamps

# Query all entries
entries = get_stream_range(stream)
print(f"Total entries: {len(entries)}")

# Query last 50 entries
recent = get_stream_range(stream, '-', '+', count=50)
print(f"Recent entries: {len(recent)}")
```

### Stream with Consumer Groups for Processing

```python
def setup_consumer_group(stream_name, group_name):
    """Create a consumer group for stream processing."""
    try:
        r.xgroup_create(stream_name, group_name, id='0', mkstream=True)
    except redis.ResponseError as e:
        if 'BUSYGROUP' in str(e):
            pass  # Group already exists
        else:
            raise

def process_stream(stream_name, group_name, consumer_name, batch_size=10):
    """Process stream entries with a consumer group."""
    while True:
        # Read new entries
        entries = r.xreadgroup(
            group_name,
            consumer_name,
            {stream_name: '>'},
            count=batch_size,
            block=5000
        )

        if not entries:
            continue

        for stream, messages in entries:
            for message_id, fields in messages:
                # Process the message
                print(f"Processing {message_id}: {fields}")

                # Acknowledge the message
                r.xack(stream_name, group_name, message_id)

# Setup
setup_consumer_group('metrics:server1:cpu', 'metric_processors')
```

### Node.js Stream Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function storeStreamMetric(streamName, fields) {
  return await redis.xadd(streamName, '*', ...Object.entries(fields).flat());
}

async function getStreamRange(streamName, start = '-', end = '+', count = null) {
  if (count) {
    return await redis.xrange(streamName, start, end, 'COUNT', count);
  }
  return await redis.xrange(streamName, start, end);
}

async function trimStream(streamName, maxLen) {
  // Approximately trim to maxLen entries
  await redis.xtrim(streamName, 'MAXLEN', '~', maxLen);
}

// Usage
async function main() {
  const stream = 'metrics:server1:memory';

  // Store data
  for (let i = 0; i < 100; i++) {
    await storeStreamMetric(stream, {
      value: (60 + Math.random() * 20).toFixed(2),
      unit: 'percent'
    });
  }

  // Keep only last 1000 entries
  await trimStream(stream, 1000);

  // Query entries
  const entries = await getStreamRange(stream, '-', '+', 10);
  console.log('Sample entries:', entries);
}

main().catch(console.error);
```

## Approach 3: Using RedisTimeSeries Module

RedisTimeSeries is a Redis module specifically designed for time-series data with built-in downsampling, aggregation, and labeling.

### Installation

```bash
# Using Docker
docker run -p 6379:6379 redislabs/redistimeseries

# Or with Redis Stack
docker run -p 6379:6379 redis/redis-stack
```

### Basic RedisTimeSeries Operations

```python
from redis import Redis
from redis.commands.timeseries import TimeSeries

r = Redis(host='localhost', port=6379)
ts = r.ts()

# Create a time series with labels
ts.create(
    'sensor:temp:room1',
    retention_msecs=86400000,  # 24 hours
    labels={
        'sensor': 'temperature',
        'location': 'room1',
        'building': 'hq'
    }
)

# Add data points
import time

current_time = int(time.time() * 1000)
for i in range(100):
    ts.add(
        'sensor:temp:room1',
        current_time - (100 - i) * 1000,
        20.5 + (i % 10) * 0.5
    )

# Query range
results = ts.range(
    'sensor:temp:room1',
    current_time - 60000,  # Last 60 seconds
    current_time
)
print(f"Data points: {len(results)}")

# Query with aggregation
aggregated = ts.range(
    'sensor:temp:room1',
    current_time - 60000,
    current_time,
    aggregation_type='avg',
    bucket_size_msec=10000  # 10-second buckets
)
print(f"Aggregated points: {aggregated}")
```

### Creating Downsampling Rules

```python
# Create raw data series
ts.create('metrics:requests:raw', retention_msecs=3600000)  # 1 hour

# Create downsampled series
ts.create('metrics:requests:1m', retention_msecs=86400000)   # 24 hours
ts.create('metrics:requests:1h', retention_msecs=604800000)  # 7 days

# Create compaction rules
ts.createrule(
    'metrics:requests:raw',
    'metrics:requests:1m',
    aggregation_type='avg',
    bucket_size_msec=60000  # 1-minute buckets
)

ts.createrule(
    'metrics:requests:raw',
    'metrics:requests:1h',
    aggregation_type='avg',
    bucket_size_msec=3600000  # 1-hour buckets
)

# Now when you add to raw, downsampled series update automatically
current_time = int(time.time() * 1000)
for i in range(1000):
    ts.add('metrics:requests:raw', '*', 100 + i % 50)
```

### Querying by Labels

```python
# Create multiple series with labels
sensors = [
    ('sensor:temp:room1', {'type': 'temperature', 'location': 'room1'}),
    ('sensor:temp:room2', {'type': 'temperature', 'location': 'room2'}),
    ('sensor:humidity:room1', {'type': 'humidity', 'location': 'room1'}),
]

for key, labels in sensors:
    try:
        ts.create(key, labels=labels)
    except:
        pass  # Already exists

# Query all temperature sensors
temp_series = ts.mrange(
    '-',
    '+',
    filters=['type=temperature']
)

# Query all sensors in room1
room1_series = ts.mrange(
    '-',
    '+',
    filters=['location=room1']
)

# Query with aggregation across multiple series
aggregated = ts.mrange(
    '-',
    '+',
    filters=['type=temperature'],
    aggregation_type='avg',
    bucket_size_msec=60000
)
```

### Node.js RedisTimeSeries Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function createTimeSeries(key, retentionMs, labels = {}) {
  const labelArgs = Object.entries(labels).flatMap(([k, v]) => [k, v]);

  try {
    await redis.call(
      'TS.CREATE',
      key,
      'RETENTION',
      retentionMs,
      'LABELS',
      ...labelArgs
    );
  } catch (err) {
    if (!err.message.includes('already exists')) {
      throw err;
    }
  }
}

async function addDataPoint(key, timestamp, value) {
  // Use '*' for auto timestamp
  return await redis.call('TS.ADD', key, timestamp, value);
}

async function queryRange(key, fromTs, toTs, aggregation = null, bucketMs = null) {
  const args = ['TS.RANGE', key, fromTs, toTs];

  if (aggregation && bucketMs) {
    args.push('AGGREGATION', aggregation, bucketMs);
  }

  return await redis.call(...args);
}

async function queryByLabels(filters, fromTs = '-', toTs = '+') {
  const filterArgs = filters.map(f => f);
  return await redis.call('TS.MRANGE', fromTs, toTs, 'FILTER', ...filterArgs);
}

// Usage
async function main() {
  // Create series
  await createTimeSeries('metrics:api:latency', 86400000, {
    endpoint: '/api/users',
    method: 'GET'
  });

  // Add data points
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    await addDataPoint('metrics:api:latency', now - (100 - i) * 1000, 50 + Math.random() * 100);
  }

  // Query with 10-second average aggregation
  const data = await queryRange(
    'metrics:api:latency',
    now - 60000,
    now,
    'AVG',
    10000
  );

  console.log('Aggregated data:', data);
}

main().catch(console.error);
```

## Comparison: Which Approach to Choose?

| Feature | Sorted Sets | Streams | RedisTimeSeries |
|---------|-------------|---------|-----------------|
| Setup Complexity | Low | Low | Medium (module) |
| Built-in Aggregation | No | No | Yes |
| Downsampling | Manual | Manual | Automatic |
| Labels/Tags | Manual | Per-entry | Native |
| Memory Efficiency | Good | Good | Best |
| Consumer Groups | No | Yes | No |
| Range Queries | Yes | Yes | Yes |
| Best For | Simple metrics | Event logs | Production metrics |

## Best Practices

### 1. Use Appropriate Key Naming

```python
# Good: hierarchical naming with clear segments
key = "metrics:service:endpoint:measurement"
key = "ts:production:api:latency:p99"

# Include tenant for multi-tenant systems
key = f"ts:{tenant_id}:metrics:{metric_name}"
```

### 2. Implement Proper Retention

```python
def cleanup_old_data(metric_pattern, max_age_seconds):
    """Remove data older than max_age from all matching keys."""
    cutoff = time.time() - max_age_seconds

    for key in r.scan_iter(match=metric_pattern):
        r.zremrangebyscore(key, '-inf', cutoff)
```

### 3. Batch Writes for High Throughput

```python
def batch_store_metrics(metrics):
    """Store multiple metrics in a pipeline."""
    pipe = r.pipeline()

    for metric in metrics:
        key = f"metrics:{metric['name']}"
        member = json.dumps({
            'value': metric['value'],
            'timestamp': metric['timestamp']
        })
        pipe.zadd(key, {member: metric['timestamp']})

    pipe.execute()
```

### 4. Use Lua Scripts for Atomic Operations

```lua
-- atomic_increment_counter.lua
local key = KEYS[1]
local timestamp = ARGV[1]
local window_size = ARGV[2]

-- Increment counter
redis.call('ZINCRBY', key, 1, timestamp)

-- Clean old data
local cutoff = timestamp - window_size
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- Return current count
return redis.call('ZCARD', key)
```

## Conclusion

Redis provides flexible options for storing time-series data. Sorted sets work well for simple use cases, streams excel when you need consumer groups for processing, and RedisTimeSeries offers the most features for production metric storage with built-in downsampling and aggregation.

Choose your approach based on your specific requirements:

- **Sorted Sets**: Simple metrics with custom retention logic
- **Streams**: Event logs requiring consumer group processing
- **RedisTimeSeries**: Production metrics with downsampling and label-based queries

For most observability and monitoring use cases, RedisTimeSeries provides the best combination of features and performance. However, if you need to minimize dependencies, sorted sets can handle moderate time-series workloads effectively.
