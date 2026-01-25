# How to Monitor Redis Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Performance, Observability, DevOps

Description: Learn how to monitor Redis performance effectively using built-in commands, metrics collection, alerting strategies, and visualization tools.

---

Redis is fast, but that does not mean you can ignore its performance. Monitoring Redis helps you catch issues before they become outages, optimize resource usage, and plan capacity. Let us explore the essential metrics and tools for Redis monitoring.

## Built-in Monitoring Commands

### INFO Command

The INFO command provides comprehensive statistics:

```bash
# Get all statistics
redis-cli INFO

# Get specific section
redis-cli INFO memory
redis-cli INFO stats
redis-cli INFO replication
redis-cli INFO clients
redis-cli INFO persistence
```

### Key Metrics to Monitor

```bash
# Memory metrics
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"

# used_memory_human:3.50G       # Memory used by Redis
# maxmemory_human:4.00G         # Memory limit
# mem_fragmentation_ratio:1.15  # Fragmentation (>1.5 is concerning)

# Performance metrics
redis-cli INFO stats | grep -E "instantaneous_ops_per_sec|total_commands_processed|keyspace_hits|keyspace_misses"

# instantaneous_ops_per_sec:15000  # Current throughput
# keyspace_hits:1000000            # Cache hits
# keyspace_misses:50000            # Cache misses

# Client metrics
redis-cli INFO clients | grep -E "connected_clients|blocked_clients|maxclients"

# Persistence metrics
redis-cli INFO persistence | grep -E "rdb_last_bgsave_status|aof_last_bgrewrite_status"
```

### SLOWLOG

Track slow commands:

```bash
# Configure slow log (microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 10000  # 10ms
redis-cli CONFIG SET slowlog-max-len 128

# View slow commands
redis-cli SLOWLOG GET 10

# Get slow log length
redis-cli SLOWLOG LEN

# Reset slow log
redis-cli SLOWLOG RESET
```

### MONITOR Command

Watch all commands in real-time (use carefully in production):

```bash
# Watch all commands (high overhead)
redis-cli MONITOR

# Better: Use for short debugging sessions only
timeout 10 redis-cli MONITOR
```

### CLIENT LIST

View connected clients:

```bash
redis-cli CLIENT LIST

# Output includes:
# id=123 addr=192.168.1.10:54321 name= age=3600 idle=5 flags=N ...
```

## Essential Metrics Dashboard

### Memory Metrics

```python
import redis

def get_memory_metrics(redis_client):
    """Get memory-related metrics."""
    info = redis_client.info('memory')

    return {
        'used_memory_mb': info['used_memory'] / 1024 / 1024,
        'max_memory_mb': info.get('maxmemory', 0) / 1024 / 1024,
        'memory_usage_percent': (
            info['used_memory'] / info['maxmemory'] * 100
            if info.get('maxmemory', 0) > 0 else 0
        ),
        'fragmentation_ratio': info['mem_fragmentation_ratio'],
        'evicted_keys': redis_client.info('stats')['evicted_keys'],
    }

r = redis.Redis()
metrics = get_memory_metrics(r)
print(f"Memory usage: {metrics['memory_usage_percent']:.1f}%")
print(f"Fragmentation: {metrics['fragmentation_ratio']:.2f}")
```

### Performance Metrics

```python
def get_performance_metrics(redis_client):
    """Get performance-related metrics."""
    info = redis_client.info('stats')
    client_info = redis_client.info('clients')

    # Calculate hit rate
    hits = info['keyspace_hits']
    misses = info['keyspace_misses']
    hit_rate = hits / (hits + misses) * 100 if (hits + misses) > 0 else 0

    return {
        'ops_per_sec': info['instantaneous_ops_per_sec'],
        'total_commands': info['total_commands_processed'],
        'hit_rate_percent': hit_rate,
        'connected_clients': client_info['connected_clients'],
        'blocked_clients': client_info['blocked_clients'],
        'rejected_connections': info['rejected_connections'],
    }

metrics = get_performance_metrics(r)
print(f"Ops/sec: {metrics['ops_per_sec']}")
print(f"Hit rate: {metrics['hit_rate_percent']:.1f}%")
```

### Replication Metrics

```python
def get_replication_metrics(redis_client):
    """Get replication-related metrics."""
    info = redis_client.info('replication')

    metrics = {
        'role': info['role'],
        'connected_slaves': info.get('connected_slaves', 0),
    }

    if info['role'] == 'slave':
        metrics.update({
            'master_link_status': info.get('master_link_status', 'unknown'),
            'master_last_io_seconds_ago': info.get('master_last_io_seconds_ago', -1),
            'master_sync_in_progress': info.get('master_sync_in_progress', 0),
            'slave_repl_offset': info.get('slave_repl_offset', 0),
        })

    return metrics
```

## Prometheus Integration

### Redis Exporter

Use redis_exporter for Prometheus metrics:

```yaml
# docker-compose.yml
services:
  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      REDIS_ADDR: redis://redis:6379
      REDIS_PASSWORD: your-password
    ports:
      - "9121:9121"
```

### Key Prometheus Metrics

```promql
# Memory usage percentage
(redis_memory_used_bytes / redis_memory_max_bytes) * 100

# Operations per second
rate(redis_commands_total[1m])

# Cache hit rate
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100

# Connected clients
redis_connected_clients

# Replication lag (for replicas)
redis_connected_slave_lag_seconds
```

### Alert Rules

```yaml
groups:
- name: redis_alerts
  rules:
  - alert: RedisHighMemoryUsage
    expr: (redis_memory_used_bytes / redis_memory_max_bytes) * 100 > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Redis memory usage above 80%"

  - alert: RedisHighMemoryUsageCritical
    expr: (redis_memory_used_bytes / redis_memory_max_bytes) * 100 > 95
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Redis memory usage above 95%"

  - alert: RedisLowHitRate
    expr: redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) < 0.9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Redis cache hit rate below 90%"

  - alert: RedisHighClientConnections
    expr: redis_connected_clients > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High number of Redis client connections"

  - alert: RedisPersistenceFailed
    expr: redis_rdb_last_bgsave_status != 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Redis persistence is failing"

  - alert: RedisReplicationBroken
    expr: redis_connected_slaves < 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Redis has no connected replicas"
```

## Custom Monitoring Script

```python
import redis
import time
import json
from datetime import datetime

class RedisMonitor:
    def __init__(self, redis_client, output_file=None):
        self.r = redis_client
        self.output_file = output_file
        self.previous_stats = {}

    def collect_metrics(self):
        """Collect all relevant metrics."""
        info_memory = self.r.info('memory')
        info_stats = self.r.info('stats')
        info_clients = self.r.info('clients')
        info_persistence = self.r.info('persistence')
        info_replication = self.r.info('replication')

        # Calculate rates
        current_commands = info_stats['total_commands_processed']
        prev_commands = self.previous_stats.get('total_commands', current_commands)
        commands_rate = current_commands - prev_commands
        self.previous_stats['total_commands'] = current_commands

        # Calculate hit rate
        hits = info_stats['keyspace_hits']
        misses = info_stats['keyspace_misses']
        hit_rate = hits / (hits + misses) * 100 if (hits + misses) > 0 else 100

        return {
            'timestamp': datetime.now().isoformat(),

            # Memory
            'memory_used_mb': info_memory['used_memory'] / 1024 / 1024,
            'memory_max_mb': info_memory.get('maxmemory', 0) / 1024 / 1024,
            'memory_fragmentation': info_memory['mem_fragmentation_ratio'],

            # Performance
            'ops_per_sec': info_stats['instantaneous_ops_per_sec'],
            'commands_processed_delta': commands_rate,
            'hit_rate_percent': hit_rate,

            # Clients
            'connected_clients': info_clients['connected_clients'],
            'blocked_clients': info_clients['blocked_clients'],

            # Persistence
            'rdb_last_save_time': info_persistence.get('rdb_last_save_time', 0),
            'rdb_last_bgsave_status': info_persistence.get('rdb_last_bgsave_status', 'ok'),
            'aof_enabled': info_persistence.get('aof_enabled', 0),

            # Replication
            'role': info_replication['role'],
            'connected_slaves': info_replication.get('connected_slaves', 0),
        }

    def check_health(self, metrics):
        """Check metrics against thresholds."""
        alerts = []

        # Memory checks
        if metrics['memory_max_mb'] > 0:
            usage_pct = metrics['memory_used_mb'] / metrics['memory_max_mb'] * 100
            if usage_pct > 90:
                alerts.append(('CRITICAL', f"Memory usage at {usage_pct:.1f}%"))
            elif usage_pct > 75:
                alerts.append(('WARNING', f"Memory usage at {usage_pct:.1f}%"))

        # Fragmentation check
        if metrics['memory_fragmentation'] > 1.5:
            alerts.append(('WARNING', f"High fragmentation: {metrics['memory_fragmentation']:.2f}"))

        # Hit rate check
        if metrics['hit_rate_percent'] < 90:
            alerts.append(('WARNING', f"Low hit rate: {metrics['hit_rate_percent']:.1f}%"))

        # Persistence check
        if metrics['rdb_last_bgsave_status'] != 'ok':
            alerts.append(('CRITICAL', "RDB persistence failing"))

        return alerts

    def run(self, interval=10):
        """Run continuous monitoring."""
        print("Starting Redis monitoring...")

        while True:
            try:
                metrics = self.collect_metrics()
                alerts = self.check_health(metrics)

                # Print status
                print(f"\n[{metrics['timestamp']}]")
                print(f"  Ops/sec: {metrics['ops_per_sec']}")
                print(f"  Memory: {metrics['memory_used_mb']:.1f}MB")
                print(f"  Hit rate: {metrics['hit_rate_percent']:.1f}%")
                print(f"  Clients: {metrics['connected_clients']}")

                for level, message in alerts:
                    print(f"  {level}: {message}")

                # Save to file if configured
                if self.output_file:
                    with open(self.output_file, 'a') as f:
                        f.write(json.dumps(metrics) + '\n')

            except redis.ConnectionError as e:
                print(f"Connection error: {e}")

            time.sleep(interval)

# Usage
r = redis.Redis()
monitor = RedisMonitor(r, output_file='/var/log/redis-metrics.jsonl')
monitor.run(interval=10)
```

## Visualization with Grafana

### Sample Dashboard Panels

```json
{
  "panels": [
    {
      "title": "Memory Usage",
      "type": "gauge",
      "targets": [
        {
          "expr": "(redis_memory_used_bytes / redis_memory_max_bytes) * 100"
        }
      ],
      "thresholds": {
        "steps": [
          {"color": "green", "value": null},
          {"color": "yellow", "value": 75},
          {"color": "red", "value": 90}
        ]
      }
    },
    {
      "title": "Operations per Second",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(redis_commands_total[1m])"
        }
      ]
    },
    {
      "title": "Cache Hit Rate",
      "type": "stat",
      "targets": [
        {
          "expr": "redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100"
        }
      ]
    }
  ]
}
```

## Best Practices

1. **Monitor memory continuously** - Redis performance degrades as memory fills
2. **Track hit rates** - Low hit rates indicate cache inefficiency
3. **Watch slow log** - Identify problematic commands
4. **Set up alerts** - Do not wait for users to report issues
5. **Monitor replication lag** - Critical for read replicas
6. **Track persistence status** - Failed saves mean data loss risk

---

Effective Redis monitoring combines built-in commands, external tools like Prometheus and Grafana, and custom scripts for your specific needs. Start with the essential metrics (memory, ops/sec, hit rate, persistence status), set up alerts for critical thresholds, and expand your monitoring as you learn more about your workload patterns.
