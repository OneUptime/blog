# How to Profile Redis Performance with SLOWLOG and LATENCY

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, SLOWLOG, LATENCY, Profiling, Monitoring, Debugging, Production

Description: A comprehensive guide to profiling Redis performance using SLOWLOG and LATENCY commands. Learn to identify slow commands, measure latency distribution, and diagnose performance bottlenecks.

---

> Redis is fast, but slow commands can still hurt your application. SLOWLOG captures commands exceeding a threshold, while LATENCY provides detailed timing analysis. Together, they form a powerful toolkit for identifying and fixing Redis performance issues.

This guide covers how to configure, query, and interpret SLOWLOG and LATENCY data to optimize Redis performance.

---

## Understanding SLOWLOG

### What SLOWLOG Captures

SLOWLOG records commands that exceed a configurable execution time threshold. It captures:
- Command and arguments
- Execution time (in microseconds)
- Timestamp
- Client information (Redis 4.0+)

### Configuration

```bash
# redis.conf
slowlog-log-slower-than 10000    # Log commands slower than 10ms (in microseconds)
slowlog-max-len 1024             # Keep last 1024 slow commands

# Dynamic configuration
redis-cli CONFIG SET slowlog-log-slower-than 10000
redis-cli CONFIG SET slowlog-max-len 1024

# Set to 0 to log every command (useful for debugging)
redis-cli CONFIG SET slowlog-log-slower-than 0

# Set to -1 to disable
redis-cli CONFIG SET slowlog-log-slower-than -1
```

### Reading SLOWLOG

```bash
# Get last 10 slow commands
redis-cli SLOWLOG GET 10

# Example output:
# 1) 1) (integer) 14              # Entry ID
#    2) (integer) 1615847200      # Unix timestamp
#    3) (integer) 15234           # Execution time (microseconds)
#    4) 1) "KEYS"                 # Command
#       2) "*"                    # Arguments
#    5) "127.0.0.1:52342"        # Client address
#    6) "myapp"                   # Client name

# Get slowlog length
redis-cli SLOWLOG LEN

# Clear slowlog
redis-cli SLOWLOG RESET
```

### Python SLOWLOG Analysis

```python
import redis
from datetime import datetime
from collections import Counter

def analyze_slowlog(r, count=100):
    """Analyze SLOWLOG entries"""
    entries = r.slowlog_get(count)

    if not entries:
        print("No slow commands found")
        return

    # Statistics
    commands = Counter()
    total_time = 0
    max_time = 0
    max_entry = None

    for entry in entries:
        cmd = entry['command'].decode() if isinstance(entry['command'], bytes) else str(entry['command'])
        cmd_name = cmd.split()[0].upper() if cmd else 'UNKNOWN'

        commands[cmd_name] += 1
        total_time += entry['duration']

        if entry['duration'] > max_time:
            max_time = entry['duration']
            max_entry = entry

    print(f"Analyzed {len(entries)} slow commands\n")

    print("Commands by frequency:")
    for cmd, count in commands.most_common(10):
        print(f"  {cmd}: {count}")

    print(f"\nTotal execution time: {total_time / 1000:.2f}ms")
    print(f"Average execution time: {total_time / len(entries) / 1000:.2f}ms")

    if max_entry:
        ts = datetime.fromtimestamp(max_entry['start_time'])
        print(f"\nSlowest command ({max_time / 1000:.2f}ms):")
        print(f"  Time: {ts}")
        print(f"  Command: {max_entry['command']}")

# Usage
r = redis.Redis(host='localhost', password='password')
analyze_slowlog(r, count=1000)
```

### Common Slow Commands

```bash
# Commands that are often slow:

# 1. KEYS - Scans entire keyspace (never use in production)
KEYS *            # O(N) - blocks Redis

# 2. SMEMBERS - Returns all set members
SMEMBERS large_set    # O(N) for large sets

# 3. HGETALL - Returns all hash fields
HGETALL large_hash    # O(N) for large hashes

# 4. SORT - Sorts list/set/zset
SORT large_list       # O(N+M*log(M))

# 5. LRANGE with large ranges
LRANGE list 0 -1      # O(N) for full list

# Better alternatives:
SCAN 0 MATCH pattern* COUNT 100    # Instead of KEYS
SSCAN set 0 COUNT 100              # Instead of SMEMBERS
HSCAN hash 0 COUNT 100             # Instead of HGETALL
LRANGE list 0 99                   # Paginated instead of full
```

---

## Understanding LATENCY

### LATENCY Subsystem

Redis LATENCY tracks various latency sources:
- Command execution
- Fork operations
- AOF fsync
- Expiration cycles

### Enable Latency Monitoring

```bash
# Set latency threshold (microseconds)
# Commands faster than this won't be tracked
redis-cli CONFIG SET latency-monitor-threshold 100

# In redis.conf
latency-monitor-threshold 100
```

### LATENCY Commands

```bash
# Get latest latency spike for each event
redis-cli LATENCY LATEST

# Example output:
# 1) 1) "command"                 # Event name
#    2) (integer) 1615847200      # Unix timestamp of latest event
#    3) (integer) 15              # Latency in ms
#    4) (integer) 20              # Max latency ever recorded

# Get latency history for specific event
redis-cli LATENCY HISTORY command

# Get latency histogram
redis-cli LATENCY HISTOGRAM [command...]

# Human-readable latency report
redis-cli LATENCY DOCTOR

# Reset latency data
redis-cli LATENCY RESET
```

### Latency Events

```bash
# Key latency events:
# command          - Slow command execution
# fast-command     - O(1) and O(log N) commands
# fork             - Fork for BGSAVE/BGREWRITEAOF
# aof-write        - AOF file writes
# aof-fsync-always - fsync with appendfsync=always
# aof-write-pending-fsync - Write with pending fsync
# aof-write-active-child - Write during BGSAVE
# rdb-unlink-temp-file - Unlink temp RDB file
# expire-cycle     - Active expiration cycle
# eviction-cycle   - Eviction when maxmemory reached
# eviction-del     - DEL during eviction
```

### LATENCY DOCTOR

```bash
redis-cli LATENCY DOCTOR

# Example output:
# Dave, I have observed latency spikes in this Redis instance.
# After careful analysis, I can provide the following advices:
#
# 1. command: 5 latency spikes (average 1045us, mean deviation 180us,
#    period 2.67 sec). Worst ever latency is 1234us.
#
#    I have a few advices for you:
#    - Check your SLOWLOG for slow commands
#    - Consider using pipelining to reduce round-trips
```

---

## Latency Histogram

### Understanding Histograms

```bash
# Get histogram for specific commands
redis-cli LATENCY HISTOGRAM get set hget

# Output shows distribution of call latencies:
# get:
#   calls: 1000000
#   latency-percentile-50: 0.001ms
#   latency-percentile-99: 0.023ms
#   latency-percentile-99.9: 0.156ms
```

### Python Latency Analysis

```python
import redis
import time

def measure_latency(r, commands, iterations=10000):
    """Measure command latency distribution"""
    results = {}

    for cmd_name, cmd_func in commands.items():
        latencies = []

        for _ in range(iterations):
            start = time.perf_counter()
            cmd_func()
            elapsed = (time.perf_counter() - start) * 1000  # ms

            latencies.append(elapsed)

        latencies.sort()

        results[cmd_name] = {
            'min': latencies[0],
            'max': latencies[-1],
            'avg': sum(latencies) / len(latencies),
            'p50': latencies[int(len(latencies) * 0.50)],
            'p99': latencies[int(len(latencies) * 0.99)],
            'p999': latencies[int(len(latencies) * 0.999)],
        }

    return results

# Usage
r = redis.Redis(host='localhost', password='password')

# Prepare test data
r.set('test_key', 'x' * 100)
r.hset('test_hash', mapping={str(i): f'value{i}' for i in range(100)})

commands = {
    'GET': lambda: r.get('test_key'),
    'SET': lambda: r.set('test_key', 'value'),
    'HGET': lambda: r.hget('test_hash', '50'),
    'HGETALL': lambda: r.hgetall('test_hash'),
}

results = measure_latency(r, commands, iterations=10000)

print(f"{'Command':<12} {'Min':>8} {'Avg':>8} {'P50':>8} {'P99':>8} {'P99.9':>8} {'Max':>8}")
print("-" * 70)
for cmd, stats in results.items():
    print(f"{cmd:<12} {stats['min']:>7.3f}ms {stats['avg']:>7.3f}ms "
          f"{stats['p50']:>7.3f}ms {stats['p99']:>7.3f}ms "
          f"{stats['p999']:>7.3f}ms {stats['max']:>7.3f}ms")
```

---

## Continuous Monitoring

### Prometheus Integration

```python
from prometheus_client import Gauge, Counter, Histogram, start_http_server
import redis
import time

# Metrics
slowlog_commands = Counter(
    'redis_slowlog_commands_total',
    'Slow commands by type',
    ['command']
)

slowlog_duration = Histogram(
    'redis_slowlog_duration_seconds',
    'Slow command duration',
    ['command'],
    buckets=[.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10]
)

latency_spikes = Gauge(
    'redis_latency_spike_milliseconds',
    'Latest latency spike',
    ['event']
)

def monitor_slowlog(r, last_id=[0]):
    """Monitor slowlog for new entries"""
    entries = r.slowlog_get(100)

    for entry in entries:
        if entry['id'] > last_id[0]:
            cmd = entry['command']
            if isinstance(cmd, bytes):
                cmd = cmd.decode()
            cmd_name = cmd.split()[0].upper() if cmd else 'UNKNOWN'

            slowlog_commands.labels(command=cmd_name).inc()
            slowlog_duration.labels(command=cmd_name).observe(
                entry['duration'] / 1000000  # Convert to seconds
            )

    if entries:
        last_id[0] = entries[0]['id']

def monitor_latency(r):
    """Monitor latency events"""
    try:
        latest = r.execute_command('LATENCY', 'LATEST')

        for event in latest:
            event_name = event[0].decode() if isinstance(event[0], bytes) else event[0]
            latency_ms = event[2]

            latency_spikes.labels(event=event_name).set(latency_ms)

    except redis.ResponseError:
        pass  # Latency monitoring may not be enabled

def monitor_loop(host, password):
    r = redis.Redis(host=host, password=password)

    while True:
        try:
            monitor_slowlog(r)
            monitor_latency(r)
        except Exception as e:
            print(f"Error: {e}")

        time.sleep(5)

if __name__ == '__main__':
    start_http_server(8000)
    monitor_loop('localhost', 'password')
```

### Grafana Dashboard Queries

```
# Slow commands per second
rate(redis_slowlog_commands_total[5m])

# 99th percentile slow command duration
histogram_quantile(0.99, rate(redis_slowlog_duration_seconds_bucket[5m]))

# Latest latency spikes
redis_latency_spike_milliseconds
```

---

## Diagnosing Common Issues

### High Command Latency

```python
def diagnose_command_latency(r):
    """Diagnose high command latency"""
    print("=== Command Latency Diagnosis ===\n")

    # Check slowlog
    slow = r.slowlog_get(10)
    if slow:
        print("Recent slow commands:")
        for entry in slow[:5]:
            print(f"  {entry['duration']/1000:.2f}ms - {entry['command']}")
        print()

    # Check INFO stats
    info = r.info()

    # Check for blocking commands
    blocked = info.get('blocked_clients', 0)
    if blocked > 0:
        print(f"WARNING: {blocked} blocked clients")

    # Check command stats
    cmdstats = r.info('commandstats')
    slow_cmds = []

    for cmd, stats in cmdstats.items():
        if 'usec_per_call' in stats:
            avg_usec = stats['usec_per_call']
            if avg_usec > 1000:  # > 1ms average
                slow_cmds.append((cmd, avg_usec, stats['calls']))

    if slow_cmds:
        print("Commands with high average latency:")
        for cmd, usec, calls in sorted(slow_cmds, key=lambda x: -x[1])[:10]:
            print(f"  {cmd}: {usec/1000:.2f}ms avg ({calls} calls)")

# Usage
diagnose_command_latency(r)
```

### Fork Latency

```bash
# Check fork latency
redis-cli INFO persistence | grep fork

# latest_fork_usec: Time of last fork in microseconds

# High fork latency causes:
# 1. Large dataset (more memory to copy-on-write)
# 2. Transparent Huge Pages (THP)
# 3. Insufficient memory

# Solutions:
# 1. Disable THP
echo never > /sys/kernel/mm/transparent_hugepage/enabled

# 2. Use smaller RDB saves
# 3. Schedule saves during low traffic
```

### Memory Pressure

```python
def check_memory_pressure(r):
    """Check for memory-related latency issues"""
    info = r.info('memory')

    used = info['used_memory']
    max_mem = info.get('maxmemory', 0)
    fragmentation = info.get('mem_fragmentation_ratio', 1)

    print(f"Used memory: {used / 1024**3:.2f}GB")
    print(f"Fragmentation ratio: {fragmentation:.2f}")

    if max_mem > 0:
        usage = used / max_mem * 100
        print(f"Memory usage: {usage:.1f}%")

        if usage > 90:
            print("WARNING: Memory usage > 90% - eviction may cause latency")

    if fragmentation > 1.5:
        print("WARNING: High fragmentation - consider enabling activedefrag")
    elif fragmentation < 1.0:
        print("CRITICAL: Fragmentation < 1.0 - Redis may be swapping!")
```

---

## Best Practices

### 1. Set Appropriate Thresholds

```bash
# Development: Log everything > 1ms
slowlog-log-slower-than 1000
latency-monitor-threshold 1

# Production: Log > 10ms
slowlog-log-slower-than 10000
latency-monitor-threshold 10

# High-performance: Log > 1ms
slowlog-log-slower-than 1000
```

### 2. Regular Analysis

```python
# Run daily/weekly analysis
def weekly_performance_report(r):
    """Generate weekly performance report"""
    # Analyze slowlog patterns
    # Check latency trends
    # Compare with baseline
    pass
```

### 3. Alert on Anomalies

```yaml
# Prometheus alerting rules
groups:
  - name: redis-latency
    rules:
      - alert: RedisSlowCommands
        expr: rate(redis_slowlog_commands_total[5m]) > 10
        for: 5m
        annotations:
          summary: "High rate of slow Redis commands"

      - alert: RedisHighLatency
        expr: redis_latency_spike_milliseconds{event="command"} > 100
        for: 1m
        annotations:
          summary: "Redis command latency spike > 100ms"
```

---

## Conclusion

SLOWLOG and LATENCY provide visibility into Redis performance:

- **SLOWLOG**: Captures slow command details
- **LATENCY**: Tracks system-level latency sources
- **LATENCY DOCTOR**: Provides actionable recommendations

Key takeaways:
- Configure appropriate thresholds for your workload
- Monitor slowlog continuously in production
- Investigate KEYS, SMEMBERS, and other O(N) commands
- Check fork latency if using persistence

---

*Need comprehensive Redis performance monitoring? [OneUptime](https://oneuptime.com) provides real-time slowlog analysis, latency tracking, and automated alerting for Redis deployments.*
