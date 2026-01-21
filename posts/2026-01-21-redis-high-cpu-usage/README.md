# How to Troubleshoot Redis High CPU Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Troubleshooting, CPU, Optimization

Description: A comprehensive guide to diagnosing and resolving Redis high CPU usage issues, including command profiling, slow query identification, and optimization techniques.

---

Redis is designed to be CPU-efficient, handling hundreds of thousands of operations per second on a single core. When Redis exhibits high CPU usage, it usually indicates either problematic commands, poor data modeling, or configuration issues. This guide walks through systematic troubleshooting steps to identify and resolve CPU bottlenecks.

## Understanding Redis CPU Usage

Redis is primarily single-threaded for command execution. High CPU usage typically means:

1. **Expensive commands** - Commands with O(N) complexity on large datasets
2. **High command rate** - Processing too many commands per second
3. **Serialization overhead** - Large values requiring significant encoding/decoding
4. **Background processes** - RDB saves, AOF rewrites, or key expiration

## Step 1: Establish Baseline Metrics

### Check Current CPU Usage

```bash
# System CPU for Redis process
top -p $(pgrep -x redis-server)

# Or using ps
ps aux | grep redis-server

# Redis internal stats
redis-cli INFO cpu
```

Key metrics from INFO cpu:

```
used_cpu_sys:1234.56
used_cpu_user:5678.90
used_cpu_sys_children:12.34
used_cpu_user_children:56.78
```

### Calculate Operations Per Second

```bash
# Get instantaneous ops/sec
redis-cli INFO stats | grep instantaneous_ops_per_sec

# Watch over time
watch -n 1 "redis-cli INFO stats | grep ops_per_sec"
```

## Step 2: Identify Expensive Commands

### Analyze Slow Log

```bash
# Check slow log entries
redis-cli SLOWLOG GET 50

# Slow log configuration
redis-cli CONFIG GET slowlog-log-slower-than
# Default: 10000 microseconds (10ms)

# Lower threshold for more detailed analysis
redis-cli CONFIG SET slowlog-log-slower-than 1000  # 1ms
```

### Parse Slow Log Programmatically

```python
import redis
from collections import Counter

def analyze_slow_log(host='localhost', port=6379, count=1000):
    """Analyze slow log for CPU-intensive commands"""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    entries = r.slowlog_get(count)

    # Count command types
    command_counts = Counter()
    command_times = {}

    for entry in entries:
        cmd = entry['command'][0].upper() if entry['command'] else 'UNKNOWN'
        duration_us = entry['duration']

        command_counts[cmd] += 1
        if cmd not in command_times:
            command_times[cmd] = []
        command_times[cmd].append(duration_us)

    print("Slow Commands by Frequency:")
    print("-" * 50)
    for cmd, count in command_counts.most_common(10):
        avg_time = sum(command_times[cmd]) / len(command_times[cmd])
        max_time = max(command_times[cmd])
        print(f"{cmd}: {count} calls, avg={avg_time/1000:.2f}ms, max={max_time/1000:.2f}ms")

analyze_slow_log()
```

### Real-Time Command Monitoring

```bash
# Monitor all commands (use briefly - impacts performance)
redis-cli MONITOR | head -1000

# Count command types in real-time
redis-cli MONITOR | awk '{print $4}' | sort | uniq -c | sort -rn | head -20
```

## Step 3: Identify CPU-Intensive Command Patterns

### Commands That Commonly Cause High CPU

| Command | Complexity | Issue |
|---------|------------|-------|
| KEYS * | O(N) | Scans entire keyspace |
| SMEMBERS | O(N) | Returns entire set |
| HGETALL | O(N) | Returns entire hash |
| LRANGE 0 -1 | O(N) | Returns entire list |
| SORT | O(N+M*log(M)) | Sorting large datasets |
| ZRANGEBYSCORE | O(log(N)+M) | Large range queries |
| SCAN | O(1) per call | But full scan is O(N) |

### Check Command Statistics

```bash
# Get detailed command stats
redis-cli INFO commandstats

# Output shows calls, usec, usec_per_call for each command
# Look for high usec_per_call values
```

### Parse Command Stats

```python
import redis

def analyze_command_stats(host='localhost', port=6379):
    """Analyze command statistics for CPU usage"""
    r = redis.Redis(host=host, port=port)
    info = r.info('commandstats')

    commands = []
    for key, stats in info.items():
        # Parse cmdstat_GET: calls=1234,usec=5678,usec_per_call=4.60
        cmd_name = key.replace('cmdstat_', '')
        commands.append({
            'command': cmd_name,
            'calls': stats['calls'],
            'total_usec': stats['usec'],
            'usec_per_call': stats['usec_per_call']
        })

    # Sort by total CPU time
    commands.sort(key=lambda x: x['total_usec'], reverse=True)

    print("Commands by Total CPU Time:")
    print("-" * 60)
    for cmd in commands[:15]:
        print(f"{cmd['command']:15} calls={cmd['calls']:>10} "
              f"total={cmd['total_usec']/1000000:.2f}s "
              f"avg={cmd['usec_per_call']:.2f}us")

analyze_command_stats()
```

## Step 4: Optimize Problematic Commands

### Replace KEYS with SCAN

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# BAD - blocks Redis, O(N) on entire keyspace
def find_keys_bad(pattern):
    return r.keys(pattern)

# GOOD - iterative, non-blocking
def find_keys_good(pattern, count=1000):
    cursor = 0
    keys = []
    while True:
        cursor, batch = r.scan(cursor=cursor, match=pattern, count=count)
        keys.extend(batch)
        if cursor == 0:
            break
    return keys
```

### Optimize Large Collection Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# BAD - retrieves all members at once
def get_all_members_bad(set_key):
    return r.smembers(set_key)

# GOOD - paginate with SSCAN
def get_members_paginated(set_key, page_size=1000):
    cursor = 0
    while True:
        cursor, members = r.sscan(set_key, cursor=cursor, count=page_size)
        for member in members:
            yield member
        if cursor == 0:
            break

# For sorted sets - use pagination
def get_leaderboard_page(key, start=0, count=100):
    # Only get what you need
    return r.zrevrange(key, start, start + count - 1, withscores=True)
```

### Optimize Hash Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# BAD - gets entire hash
def get_user_bad(user_id):
    return r.hgetall(f'user:{user_id}')

# GOOD - get only needed fields
def get_user_good(user_id, fields):
    return r.hmget(f'user:{user_id}', fields)

# Example: Only get name and email
user_data = get_user_good(123, ['name', 'email'])
```

## Step 5: Handle Background CPU Usage

### Optimize RDB Saves

```bash
# Check RDB configuration
redis-cli CONFIG GET save

# Reduce save frequency for high-write workloads
redis-cli CONFIG SET save "900 1"  # Save every 15 min if 1 change

# Or disable RDB, use AOF only
redis-cli CONFIG SET save ""
```

### Optimize AOF Rewrites

```bash
# Check AOF settings
redis-cli INFO persistence | grep aof

# Adjust auto-rewrite thresholds
redis-cli CONFIG SET auto-aof-rewrite-percentage 100
redis-cli CONFIG SET auto-aof-rewrite-min-size 128mb

# Use RDB preamble for faster rewrites
redis-cli CONFIG SET aof-use-rdb-preamble yes
```

### Tune Key Expiration

```bash
# Check expired keys stats
redis-cli INFO stats | grep expired

# Active expiration uses CPU - tune if needed
redis-cli CONFIG SET hz 10  # Default, can lower to reduce CPU
redis-cli CONFIG SET active-expire-effort 1  # 1-10, default 1
```

## Step 6: Use Pipelining to Reduce Overhead

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

# BAD - individual commands, high overhead
def write_many_bad(data):
    for key, value in data.items():
        r.set(key, value)

# GOOD - pipeline reduces round trips and CPU overhead
def write_many_good(data, batch_size=1000):
    items = list(data.items())
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        pipe = r.pipeline(transaction=False)
        for key, value in batch:
            pipe.set(key, value)
        pipe.execute()

# Benchmark
data = {f'key:{i}': f'value:{i}' for i in range(10000)}

start = time.time()
write_many_bad(data)
print(f"Without pipeline: {time.time() - start:.2f}s")

start = time.time()
write_many_good(data)
print(f"With pipeline: {time.time() - start:.2f}s")
```

## Step 7: Monitor Client Connections

High connection churn increases CPU usage:

```bash
# Check connected clients
redis-cli INFO clients

# Look for:
# connected_clients: Number currently connected
# blocked_clients: Clients in blocking operations
# client_recent_max_input_buffer: Largest input buffer
# client_recent_max_output_buffer: Largest output buffer

# List all clients
redis-cli CLIENT LIST

# Check for connection rate
watch -n 1 "redis-cli INFO stats | grep connections"
```

### Optimize Connection Handling

```python
import redis
from redis import ConnectionPool

# Use connection pooling instead of creating new connections
pool = ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50,  # Limit max connections
    socket_keepalive=True,
    socket_connect_timeout=5
)

r = redis.Redis(connection_pool=pool)

# Reuse the same connection
for i in range(10000):
    r.get(f'key:{i}')
```

## Step 8: Implement Caching Strategies

Reduce command volume with local caching:

```python
import redis
from functools import lru_cache
import time

r = redis.Redis(host='localhost', port=6379)

class CachedRedis:
    def __init__(self, redis_client, local_ttl=60):
        self.redis = redis_client
        self.local_ttl = local_ttl
        self._cache = {}
        self._cache_times = {}

    def get(self, key):
        """Get with local cache"""
        now = time.time()

        # Check local cache
        if key in self._cache:
            if now - self._cache_times[key] < self.local_ttl:
                return self._cache[key]

        # Fetch from Redis
        value = self.redis.get(key)

        # Update local cache
        self._cache[key] = value
        self._cache_times[key] = now

        return value

    def set(self, key, value, **kwargs):
        """Set with local cache invalidation"""
        result = self.redis.set(key, value, **kwargs)
        self._cache[key] = value
        self._cache_times[key] = time.time()
        return result

# Usage
cached_redis = CachedRedis(r, local_ttl=30)
value = cached_redis.get('frequently:accessed:key')  # First call hits Redis
value = cached_redis.get('frequently:accessed:key')  # Subsequent calls use local cache
```

## Step 9: Configure Redis for Multi-Core Systems

### Use Redis IO Threads (Redis 6.0+)

```bash
# Enable IO threading for better CPU utilization
# redis.conf

# Number of IO threads (0 = disabled)
io-threads 4

# Enable threaded reads (in addition to writes)
io-threads-do-reads yes
```

### Use Redis Cluster for Horizontal Scaling

If single-instance Redis is CPU-bound, consider clustering:

```bash
# Create cluster with 3 masters
redis-cli --cluster create \
    192.168.1.101:6379 \
    192.168.1.102:6379 \
    192.168.1.103:6379 \
    --cluster-replicas 0
```

## Step 10: Set Up CPU Monitoring

### Prometheus Metrics

```python
import redis
import time
from prometheus_client import Gauge, start_http_server

redis_cpu_user = Gauge('redis_cpu_user_seconds_total', 'Redis user CPU seconds')
redis_cpu_sys = Gauge('redis_cpu_sys_seconds_total', 'Redis system CPU seconds')
redis_ops_per_sec = Gauge('redis_instantaneous_ops_per_sec', 'Redis ops per second')
redis_slow_commands = Gauge('redis_slowlog_length', 'Number of slow log entries')

def collect_metrics(host='localhost', port=6379):
    r = redis.Redis(host=host, port=port)

    while True:
        try:
            # CPU metrics
            info_cpu = r.info('cpu')
            redis_cpu_user.set(info_cpu['used_cpu_user'])
            redis_cpu_sys.set(info_cpu['used_cpu_sys'])

            # Ops per second
            info_stats = r.info('stats')
            redis_ops_per_sec.set(info_stats['instantaneous_ops_per_sec'])

            # Slow log
            slowlog_len = r.slowlog_len()
            redis_slow_commands.set(slowlog_len)

        except Exception as e:
            print(f"Error collecting metrics: {e}")

        time.sleep(15)

if __name__ == '__main__':
    start_http_server(9091)
    collect_metrics()
```

### Alerting Rules

```yaml
groups:
  - name: redis-cpu
    rules:
      - alert: RedisCPUHigh
        expr: rate(redis_cpu_user_seconds_total[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis CPU usage is high"
          description: "Redis is using more than 80% CPU"

      - alert: RedisSlowCommands
        expr: rate(redis_slowlog_length[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis slow commands increasing"
          description: "More than 10 slow commands per minute"
```

## CPU Optimization Checklist

1. **Check slow log** for expensive commands
2. **Replace KEYS** with SCAN
3. **Paginate large collections** instead of fetching all
4. **Use pipelining** for bulk operations
5. **Implement connection pooling**
6. **Review RDB/AOF settings**
7. **Enable IO threads** (Redis 6.0+)
8. **Consider clustering** for horizontal scaling
9. **Add local caching** for frequently accessed data
10. **Set up monitoring** and alerting

## Common CPU Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Constant high CPU | Too many commands | Add caching, batch operations |
| CPU spikes | KEYS, HGETALL, SMEMBERS | Use SCAN, paginate results |
| CPU during saves | RDB/AOF operations | Adjust save frequency, use AOF |
| High client overhead | Connection churn | Use connection pooling |
| Single core maxed | Single-threaded design | Enable IO threads or cluster |

## Conclusion

High CPU usage in Redis is usually a symptom of suboptimal command patterns or configuration issues rather than a Redis limitation. By systematically analyzing slow logs, command statistics, and client behavior, you can identify and resolve most CPU bottlenecks.

Key takeaways:
- Profile before optimizing - use slow log and command stats
- Avoid O(N) commands on large datasets
- Use pipelining and connection pooling
- Consider IO threads for high-throughput scenarios
- Monitor continuously to catch issues early

With these techniques, your Redis instance should maintain low CPU usage while handling high throughput efficiently.
