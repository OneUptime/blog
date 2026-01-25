# How to Monitor Redis with RedisInsight and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, RedisInsight, Grafana, Prometheus, Observability, Performance

Description: Learn how to set up comprehensive Redis monitoring using RedisInsight for real-time debugging and Grafana with Prometheus for long-term metrics visualization. This guide covers installation, configuration, and essential dashboards.

---

> Monitoring Redis is essential for maintaining performance and preventing outages. RedisInsight provides real-time visibility into your Redis instances, while Grafana with Prometheus offers long-term metrics storage and alerting. Together, they form a complete observability solution for Redis deployments.

This guide walks through setting up both tools, configuring essential metrics, and building dashboards that surface the information you need to keep Redis running smoothly.

---

## RedisInsight Setup

RedisInsight is a free GUI tool from Redis that provides real-time monitoring, database browsing, and debugging capabilities.

### Installation with Docker

```bash
# Run RedisInsight in Docker
docker run -d --name redisinsight \
  -p 5540:5540 \
  -v redisinsight:/data \
  redis/redisinsight:latest

# Access at http://localhost:5540
```

### Installation on Linux/macOS

```bash
# Download from Redis website or use package manager
# macOS with Homebrew
brew install redis/tap/redisinsight

# Start RedisInsight
redisinsight
```

### Connecting to Redis

Once RedisInsight is running, add your Redis instances:

1. Open http://localhost:5540 in your browser
2. Click "Add Redis Database"
3. Enter connection details:
   - Host: your-redis-host
   - Port: 6379
   - Password: (if configured)
   - TLS: Enable if using encryption

---

## RedisInsight Features

### Browser

The Browser tab lets you explore your data:

```
# View keys matching a pattern
# Use the search bar with patterns like:
user:*
session:*:data
cache:product:*
```

### Profiler

The Profiler shows real-time command execution:

```bash
# This is similar to running redis-cli MONITOR
# but with better visualization and filtering

# Filter commands by:
# - Pattern (e.g., GET, SET, HGET)
# - Client IP
# - Database number
```

### Slowlog Analysis

View slow queries directly in the UI:

```bash
# RedisInsight reads from Redis SLOWLOG
# Configure slow log threshold in redis.conf:
slowlog-log-slower-than 10000  # 10ms in microseconds
slowlog-max-len 128
```

---

## Prometheus and Redis Exporter Setup

For long-term metrics and alerting, use Prometheus with the Redis exporter.

### Deploy Redis Exporter

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}

  redis-exporter:
    image: oliver006/redis_exporter:latest
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - redis

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}

volumes:
  prometheus_data:
  grafana_data:
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'redis-primary'

  # For multiple Redis instances
  - job_name: 'redis-cluster'
    static_configs:
      - targets:
        - 'redis-exporter-1:9121'
        - 'redis-exporter-2:9121'
        - 'redis-exporter-3:9121'
```

---

## Essential Redis Metrics

Configure alerts for these critical metrics:

```yaml
# prometheus-rules.yml
groups:
  - name: redis_alerts
    rules:
      # Memory usage alert
      - alert: RedisHighMemoryUsage
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage above 90%"
          description: "Redis instance {{ $labels.instance }} memory usage is {{ $value | humanizePercentage }}"

      # Connection limit alert
      - alert: RedisConnectionsHigh
        expr: redis_connected_clients / redis_config_maxclients > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis connections above 80% of max"

      # Replication lag alert
      - alert: RedisReplicationLag
        expr: redis_connected_slave_lag_seconds > 30
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Redis replication lag is high"

      # No replicas connected
      - alert: RedisNoReplicas
        expr: redis_connected_slaves == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis has no connected replicas"

      # High eviction rate
      - alert: RedisHighEvictionRate
        expr: rate(redis_evicted_keys_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis eviction rate is high"
```

---

## Grafana Dashboard Configuration

Import or create a Redis dashboard in Grafana:

### Key Panels to Include

```json
{
  "dashboard": {
    "title": "Redis Overview",
    "panels": [
      {
        "title": "Memory Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
            "legendFormat": "Memory %"
          }
        ]
      },
      {
        "title": "Commands per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(redis_commands_processed_total[1m])",
            "legendFormat": "Commands/s"
          }
        ]
      },
      {
        "title": "Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100",
            "legendFormat": "Hit Rate %"
          }
        ]
      },
      {
        "title": "Connected Clients",
        "type": "graph",
        "targets": [
          {
            "expr": "redis_connected_clients",
            "legendFormat": "Clients"
          }
        ]
      }
    ]
  }
}
```

### Complete Dashboard Queries

Here are PromQL queries for essential Redis metrics:

```promql
# Memory metrics
redis_memory_used_bytes
redis_memory_max_bytes
redis_memory_used_rss_bytes

# Performance metrics
rate(redis_commands_processed_total[5m])
rate(redis_keyspace_hits_total[5m])
rate(redis_keyspace_misses_total[5m])

# Hit ratio
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)

# Connection metrics
redis_connected_clients
redis_blocked_clients
redis_rejected_connections_total

# Replication metrics
redis_connected_slaves
redis_master_repl_offset
redis_connected_slave_offset_bytes

# Persistence metrics
redis_rdb_last_save_timestamp_seconds
redis_aof_last_rewrite_duration_sec

# Command latency (requires command stats)
redis_commands_duration_seconds_total / redis_commands_total
```

---

## Python Monitoring Script

Create custom monitoring with the Redis INFO command:

```python
import redis
import time
from typing import Dict, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class RedisMetrics:
    """Container for Redis metrics."""
    timestamp: datetime
    memory_used_mb: float
    memory_max_mb: float
    memory_percent: float
    connected_clients: int
    commands_per_second: float
    hit_rate: float
    evicted_keys: int
    keyspace_size: int
    replication_lag: int


class RedisMonitor:
    """
    Monitor Redis instances and collect metrics.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.prev_stats = None
        self.prev_time = None

    def collect_metrics(self) -> RedisMetrics:
        """
        Collect current Redis metrics.
        """
        info = self.redis.info()
        current_time = time.time()

        # Calculate rates if we have previous data
        commands_per_second = 0
        if self.prev_stats and self.prev_time:
            time_delta = current_time - self.prev_time
            if time_delta > 0:
                commands_delta = (
                    info['total_commands_processed'] -
                    self.prev_stats.get('total_commands_processed', 0)
                )
                commands_per_second = commands_delta / time_delta

        # Calculate hit rate
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        hit_rate = (hits / total * 100) if total > 0 else 0

        # Calculate memory percentage
        memory_used = info.get('used_memory', 0)
        memory_max = info.get('maxmemory', 0)
        memory_percent = (memory_used / memory_max * 100) if memory_max > 0 else 0

        # Get keyspace size
        keyspace_size = sum(
            info.get(f'db{i}', {}).get('keys', 0)
            for i in range(16)
        )

        # Get replication lag
        replication_lag = 0
        if info.get('role') == 'slave':
            replication_lag = info.get('master_link_down_since_seconds', 0)

        # Store for next calculation
        self.prev_stats = info
        self.prev_time = current_time

        return RedisMetrics(
            timestamp=datetime.now(),
            memory_used_mb=memory_used / 1024 / 1024,
            memory_max_mb=memory_max / 1024 / 1024,
            memory_percent=memory_percent,
            connected_clients=info.get('connected_clients', 0),
            commands_per_second=commands_per_second,
            hit_rate=hit_rate,
            evicted_keys=info.get('evicted_keys', 0),
            keyspace_size=keyspace_size,
            replication_lag=replication_lag
        )

    def check_health(self) -> Dict[str, Any]:
        """
        Perform health checks and return status.
        """
        try:
            metrics = self.collect_metrics()

            issues = []

            # Check memory
            if metrics.memory_percent > 90:
                issues.append(f"Memory usage critical: {metrics.memory_percent:.1f}%")
            elif metrics.memory_percent > 75:
                issues.append(f"Memory usage high: {metrics.memory_percent:.1f}%")

            # Check hit rate
            if metrics.hit_rate < 80:
                issues.append(f"Low cache hit rate: {metrics.hit_rate:.1f}%")

            # Check replication
            if metrics.replication_lag > 10:
                issues.append(f"High replication lag: {metrics.replication_lag}s")

            return {
                'healthy': len(issues) == 0,
                'issues': issues,
                'metrics': metrics
            }

        except redis.ConnectionError as e:
            return {
                'healthy': False,
                'issues': [f"Connection failed: {str(e)}"],
                'metrics': None
            }

    def get_slow_queries(self, count: int = 10) -> list:
        """
        Get recent slow queries from Redis slowlog.
        """
        slowlog = self.redis.slowlog_get(count)

        return [
            {
                'id': entry['id'],
                'timestamp': datetime.fromtimestamp(entry['start_time']),
                'duration_ms': entry['duration'] / 1000,
                'command': ' '.join(str(arg) for arg in entry['command'][:5]),
                'client': entry.get('client_address', 'unknown')
            }
            for entry in slowlog
        ]


# Flask endpoint for health checks
from flask import Flask, jsonify

app = Flask(__name__)
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
monitor = RedisMonitor(redis_client)

@app.route('/health/redis')
def redis_health():
    """Health check endpoint for Redis."""
    health = monitor.check_health()

    status_code = 200 if health['healthy'] else 503

    response = {
        'status': 'healthy' if health['healthy'] else 'unhealthy',
        'issues': health['issues']
    }

    if health['metrics']:
        response['metrics'] = {
            'memory_percent': round(health['metrics'].memory_percent, 2),
            'hit_rate': round(health['metrics'].hit_rate, 2),
            'commands_per_second': round(health['metrics'].commands_per_second, 2),
            'connected_clients': health['metrics'].connected_clients
        }

    return jsonify(response), status_code

@app.route('/metrics/redis/slowlog')
def redis_slowlog():
    """Get slow queries."""
    slow_queries = monitor.get_slow_queries(20)
    return jsonify({'slow_queries': slow_queries})
```

---

## Dashboard Best Practices

When building Redis dashboards, organize panels by category:

### Overview Section
- Current memory usage (gauge)
- Commands per second (graph)
- Connected clients (stat)
- Cache hit rate (stat)

### Memory Section
- Memory usage over time (graph)
- Memory fragmentation ratio (stat)
- Evicted keys rate (graph)

### Performance Section
- Command latency percentiles (heatmap)
- Slow queries count (graph)
- Operations by command type (pie chart)

### Replication Section
- Connected replicas (stat)
- Replication offset lag (graph)
- Replication link status (stat)

### Persistence Section
- Last RDB save time (stat)
- AOF rewrite duration (graph)
- Persistence errors (counter)

---

## Alerting Configuration

Set up alerts in Grafana for critical conditions:

```yaml
# Grafana alert rules
alert_rules:
  - alert: RedisDown
    expr: redis_up == 0
    for: 1m
    severity: critical

  - alert: RedisMemoryCritical
    expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.95
    for: 5m
    severity: critical

  - alert: RedisReplicationBroken
    expr: redis_master_link_up == 0
    for: 2m
    severity: critical

  - alert: RedisSlowlogGrowing
    expr: rate(redis_slowlog_length[5m]) > 1
    for: 10m
    severity: warning
```

---

## Best Practices

1. **Use both tools**: RedisInsight for debugging, Grafana/Prometheus for long-term monitoring

2. **Set appropriate retention**: Keep detailed metrics for 30 days, aggregated data longer

3. **Monitor all instances**: Include masters, replicas, and Sentinel nodes

4. **Alert on trends, not spikes**: Use rate() and increase() functions to reduce noise

5. **Document thresholds**: Record why specific alert thresholds were chosen

Comprehensive Redis monitoring with RedisInsight and Grafana provides the visibility needed to maintain reliable, high-performance Redis deployments. Regular review of dashboards and alerts helps catch issues before they impact users.
