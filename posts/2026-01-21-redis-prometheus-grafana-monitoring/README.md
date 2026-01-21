# How to Monitor Redis with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Prometheus, Grafana, Monitoring, Observability, Metrics, Alerting

Description: A comprehensive guide to monitoring Redis with Prometheus and Grafana, covering redis_exporter setup, key metrics to track, dashboard creation, and alerting configuration for production environments.

---

Redis is often a critical component in modern applications, serving as a cache, message broker, or data store. Monitoring Redis health and performance is essential to prevent outages and maintain optimal performance. In this guide, we will explore how to set up comprehensive Redis monitoring using Prometheus and Grafana.

## Architecture Overview

The monitoring stack consists of:

1. **Redis Exporter**: Collects metrics from Redis and exposes them in Prometheus format
2. **Prometheus**: Scrapes and stores metrics time-series data
3. **Grafana**: Visualizes metrics and provides alerting

```
Redis --> Redis Exporter --> Prometheus --> Grafana
          (port 9121)       (port 9090)    (port 3000)
```

## Setting Up Redis Exporter

### Docker Deployment

```bash
# Run redis_exporter
docker run -d \
  --name redis-exporter \
  -p 9121:9121 \
  -e REDIS_ADDR=redis://redis:6379 \
  oliver006/redis_exporter:latest
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  redis-exporter:
    image: oliver006/redis_exporter:latest
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    depends_on:
      - redis

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus

volumes:
  redis-data:
  prometheus-data:
  grafana-data:
```

### Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'redis:6379'
```

### Redis Exporter with Authentication

```bash
# With password
docker run -d \
  --name redis-exporter \
  -p 9121:9121 \
  -e REDIS_ADDR=redis://redis:6379 \
  -e REDIS_PASSWORD=your_password \
  oliver006/redis_exporter:latest

# With ACL user
docker run -d \
  --name redis-exporter \
  -p 9121:9121 \
  -e REDIS_ADDR=redis://redis:6379 \
  -e REDIS_USER=exporter \
  -e REDIS_PASSWORD=exporter_password \
  oliver006/redis_exporter:latest
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
        - name: redis-exporter
          image: oliver006/redis_exporter:latest
          ports:
            - containerPort: 9121
          env:
            - name: REDIS_ADDR
              value: "redis://redis-master.default.svc.cluster.local:6379"
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-exporter
  namespace: monitoring
  labels:
    app: redis-exporter
spec:
  ports:
    - port: 9121
      targetPort: 9121
  selector:
    app: redis-exporter
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: redis-exporter
  endpoints:
    - port: "9121"
      interval: 15s
```

## Key Redis Metrics to Monitor

### Memory Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `redis_memory_used_bytes` | Total memory used | > 80% of maxmemory |
| `redis_memory_max_bytes` | Maximum memory configured | - |
| `redis_memory_fragmentation_ratio` | Memory fragmentation | < 1 or > 1.5 |
| `redis_mem_fragmentation_bytes` | Fragmentation in bytes | - |

### Connection Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `redis_connected_clients` | Current client connections | > 80% of maxclients |
| `redis_blocked_clients` | Clients blocked on lists | > 10 |
| `redis_rejected_connections_total` | Rejected connections | Any increase |
| `redis_connected_slaves` | Number of replicas | < expected |

### Performance Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `redis_commands_processed_total` | Total commands processed | - |
| `redis_commands_duration_seconds_total` | Command execution time | - |
| `redis_instantaneous_ops_per_sec` | Operations per second | - |
| `redis_slowlog_length` | Slow log entries | > 100 |

### Persistence Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `redis_rdb_last_save_timestamp_seconds` | Last RDB save time | > 1 hour ago |
| `redis_rdb_changes_since_last_save` | Changes since last save | > 10000 |
| `redis_aof_rewrite_in_progress` | AOF rewrite status | - |
| `redis_aof_last_rewrite_duration_sec` | Last AOF rewrite time | > 60s |

### Replication Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `redis_master_link_up` | Replica connected to master | != 1 |
| `redis_master_last_io_seconds_ago` | Time since last master IO | > 10s |
| `redis_master_repl_offset` | Master replication offset | - |
| `redis_slave_repl_offset` | Replica replication offset | Lag > threshold |

## Grafana Dashboard Configuration

### Dashboard JSON

Create a comprehensive Redis dashboard:

```json
{
  "dashboard": {
    "title": "Redis Monitoring",
    "tags": ["redis", "database"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Memory Usage",
        "type": "gauge",
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
            "legendFormat": "Memory %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "max": 100,
            "min": 0,
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 85}
              ]
            },
            "unit": "percent"
          }
        }
      },
      {
        "title": "Connected Clients",
        "type": "stat",
        "gridPos": {"h": 4, "w": 3, "x": 6, "y": 0},
        "targets": [
          {
            "expr": "redis_connected_clients",
            "legendFormat": "Clients"
          }
        ]
      },
      {
        "title": "Operations/sec",
        "type": "stat",
        "gridPos": {"h": 4, "w": 3, "x": 9, "y": 0},
        "targets": [
          {
            "expr": "rate(redis_commands_processed_total[1m])",
            "legendFormat": "ops/sec"
          }
        ]
      },
      {
        "title": "Hit Rate",
        "type": "gauge",
        "gridPos": {"h": 4, "w": 3, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100",
            "legendFormat": "Hit %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "max": 100,
            "min": 0,
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 80},
                {"color": "green", "value": 95}
              ]
            },
            "unit": "percent"
          }
        }
      },
      {
        "title": "Memory Usage Over Time",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "redis_memory_used_bytes",
            "legendFormat": "Used Memory"
          },
          {
            "expr": "redis_memory_max_bytes",
            "legendFormat": "Max Memory"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "bytes"
          }
        }
      },
      {
        "title": "Commands Per Second",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "targets": [
          {
            "expr": "rate(redis_commands_processed_total[1m])",
            "legendFormat": "Commands/sec"
          }
        ]
      },
      {
        "title": "Network I/O",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16},
        "targets": [
          {
            "expr": "rate(redis_net_input_bytes_total[1m])",
            "legendFormat": "Input"
          },
          {
            "expr": "rate(redis_net_output_bytes_total[1m])",
            "legendFormat": "Output"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "Bps"
          }
        }
      },
      {
        "title": "Connection Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16},
        "targets": [
          {
            "expr": "rate(redis_connections_received_total[1m])",
            "legendFormat": "New Connections/sec"
          },
          {
            "expr": "redis_connected_clients",
            "legendFormat": "Current Clients"
          }
        ]
      }
    ]
  }
}
```

### Essential Grafana Queries

```promql
# Memory usage percentage
redis_memory_used_bytes / redis_memory_max_bytes * 100

# Cache hit ratio
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100

# Commands per second
rate(redis_commands_processed_total[1m])

# Average command latency
rate(redis_commands_duration_seconds_total[1m]) / rate(redis_commands_processed_total[1m])

# Evicted keys per second
rate(redis_evicted_keys_total[1m])

# Expired keys per second
rate(redis_expired_keys_total[1m])

# Memory fragmentation ratio
redis_memory_fragmentation_ratio

# Replication lag (bytes)
redis_master_repl_offset - on(instance) redis_slave_repl_offset

# Client connections
redis_connected_clients

# Blocked clients
redis_blocked_clients

# Keys by database
redis_db_keys{db="db0"}

# Slow log length
redis_slowlog_length
```

## Alerting Configuration

### Prometheus Alert Rules

Create `redis-alerts.yml`:

```yaml
groups:
  - name: redis-alerts
    rules:
      # Memory Alerts
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis instance {{ $labels.instance }} memory usage is {{ $value | printf \"%.1f\" }}%"

      - alert: RedisMemoryCritical
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 90
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Redis memory usage critical"
          description: "Redis instance {{ $labels.instance }} memory usage is {{ $value | printf \"%.1f\" }}%"

      # Connection Alerts
      - alert: RedisConnectionsHigh
        expr: redis_connected_clients > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis connections high"
          description: "Redis instance {{ $labels.instance }} has {{ $value }} connections"

      - alert: RedisRejectedConnections
        expr: increase(redis_rejected_connections_total[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Redis rejecting connections"
          description: "Redis instance {{ $labels.instance }} is rejecting connections"

      # Performance Alerts
      - alert: RedisCacheHitRateLow
        expr: >
          rate(redis_keyspace_hits_total[5m]) /
          (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100 < 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis cache hit rate low"
          description: "Redis instance {{ $labels.instance }} cache hit rate is {{ $value | printf \"%.1f\" }}%"

      - alert: RedisSlowLogGrowing
        expr: redis_slowlog_length > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis slow log growing"
          description: "Redis instance {{ $labels.instance }} slow log has {{ $value }} entries"

      # Replication Alerts
      - alert: RedisReplicationBroken
        expr: redis_master_link_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis replication broken"
          description: "Redis replica {{ $labels.instance }} lost connection to master"

      - alert: RedisReplicationLag
        expr: redis_master_last_io_seconds_ago > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis replication lag"
          description: "Redis replica {{ $labels.instance }} is {{ $value }}s behind master"

      # Persistence Alerts
      - alert: RedisRDBSaveFailed
        expr: redis_rdb_last_bgsave_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis RDB save failed"
          description: "Redis instance {{ $labels.instance }} RDB save failed"

      - alert: RedisAOFRewriteFailed
        expr: redis_aof_last_rewrite_status == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Redis AOF rewrite failed"
          description: "Redis instance {{ $labels.instance }} AOF rewrite failed"

      # Instance Health
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis down"
          description: "Redis instance {{ $labels.instance }} is down"

      - alert: RedisEvictingKeys
        expr: rate(redis_evicted_keys_total[1m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis evicting keys"
          description: "Redis instance {{ $labels.instance }} is evicting {{ $value | printf \"%.1f\" }} keys/sec"

      # Memory Fragmentation
      - alert: RedisMemoryFragmentationHigh
        expr: redis_memory_fragmentation_ratio > 1.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory fragmentation high"
          description: "Redis instance {{ $labels.instance }} fragmentation ratio is {{ $value | printf \"%.2f\" }}"
```

### Grafana Alert Configuration

```yaml
apiVersion: 1
groups:
  - orgId: 1
    name: Redis Alerts
    folder: Redis
    interval: 1m
    rules:
      - uid: redis-memory-high
        title: Redis Memory High
        condition: B
        data:
          - refId: A
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus
            model:
              expr: redis_memory_used_bytes / redis_memory_max_bytes * 100
              instant: true
          - refId: B
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params:
                      - 80
                    type: gt
                  operator:
                    type: and
                  query:
                    params:
                      - A
                  reducer:
                    params: []
                    type: avg
              refId: B
              type: classic_conditions
        noDataState: NoData
        execErrState: Error
        for: 5m
        annotations:
          summary: Redis memory usage is above 80%
        labels:
          severity: warning
```

## Python Monitoring Script

Create a custom monitoring script for additional insights:

```python
import redis
import time
import json
from prometheus_client import start_http_server, Gauge, Counter, Histogram
from datetime import datetime

# Define custom metrics
CUSTOM_METRICS = {
    'big_keys_count': Gauge('redis_custom_big_keys_count', 'Number of keys over 1MB'),
    'expired_ratio': Gauge('redis_custom_expired_ratio', 'Ratio of expired to total keys'),
    'command_latency': Histogram('redis_custom_command_latency', 'Command latency distribution',
                                  buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]),
}

class RedisMonitor:
    def __init__(self, host='localhost', port=6379, password=None):
        self.redis = redis.Redis(host=host, port=port, password=password, decode_responses=True)

    def get_info(self):
        """Get Redis INFO."""
        return self.redis.info()

    def get_memory_stats(self):
        """Get detailed memory statistics."""
        return self.redis.memory_stats()

    def get_slow_log(self, count=10):
        """Get slow log entries."""
        return self.redis.slowlog_get(count)

    def get_client_list(self):
        """Get connected clients."""
        return self.redis.client_list()

    def find_big_keys(self, sample_size=1000):
        """Find keys larger than threshold."""
        big_keys = []
        cursor = 0
        threshold = 1024 * 1024  # 1MB

        for _ in range(sample_size // 100):
            cursor, keys = self.redis.scan(cursor, count=100)
            for key in keys:
                try:
                    memory = self.redis.memory_usage(key)
                    if memory and memory > threshold:
                        big_keys.append({
                            'key': key,
                            'size': memory,
                            'type': self.redis.type(key)
                        })
                except:
                    pass
            if cursor == 0:
                break

        return big_keys

    def get_key_distribution(self):
        """Get key distribution by type."""
        distribution = {'string': 0, 'list': 0, 'set': 0, 'zset': 0, 'hash': 0, 'stream': 0}
        cursor = 0
        sample = 0

        while sample < 1000:
            cursor, keys = self.redis.scan(cursor, count=100)
            for key in keys:
                try:
                    key_type = self.redis.type(key)
                    if key_type in distribution:
                        distribution[key_type] += 1
                except:
                    pass
                sample += 1
            if cursor == 0:
                break

        return distribution

    def check_replication_health(self):
        """Check replication status."""
        info = self.redis.info('replication')
        health = {
            'role': info.get('role'),
            'connected_slaves': info.get('connected_slaves', 0),
            'master_link_status': info.get('master_link_status'),
            'master_last_io_seconds_ago': info.get('master_last_io_seconds_ago'),
        }

        if health['role'] == 'master':
            health['slaves'] = []
            for i in range(health['connected_slaves']):
                slave_info = info.get(f'slave{i}')
                if slave_info:
                    health['slaves'].append(slave_info)

        return health

    def measure_latency(self, iterations=100):
        """Measure command latency."""
        latencies = []
        for _ in range(iterations):
            start = time.perf_counter()
            self.redis.ping()
            latencies.append(time.perf_counter() - start)
        return {
            'min': min(latencies) * 1000,
            'max': max(latencies) * 1000,
            'avg': sum(latencies) / len(latencies) * 1000,
            'p99': sorted(latencies)[int(len(latencies) * 0.99)] * 1000
        }


def main():
    # Start Prometheus metrics server
    start_http_server(9122)

    monitor = RedisMonitor()

    while True:
        try:
            # Update custom metrics
            big_keys = monitor.find_big_keys(100)
            CUSTOM_METRICS['big_keys_count'].set(len(big_keys))

            # Measure and record latency
            latency = monitor.measure_latency(10)
            CUSTOM_METRICS['command_latency'].observe(latency['avg'] / 1000)

            # Print status
            info = monitor.get_info()
            print(f"\n[{datetime.now().isoformat()}] Redis Status:")
            print(f"  Memory: {info['used_memory_human']}")
            print(f"  Clients: {info['connected_clients']}")
            print(f"  Ops/sec: {info['instantaneous_ops_per_sec']}")
            print(f"  Latency: {latency['avg']:.2f}ms (p99: {latency['p99']:.2f}ms)")

            # Check for issues
            if info['used_memory'] / info.get('maxmemory', float('inf')) > 0.8:
                print("  WARNING: Memory usage > 80%")

            if big_keys:
                print(f"  WARNING: Found {len(big_keys)} big keys")

            repl = monitor.check_replication_health()
            if repl['role'] == 'slave' and repl['master_link_status'] != 'up':
                print("  CRITICAL: Replication broken!")

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(30)


if __name__ == '__main__':
    main()
```

## Best Practices

### 1. Monitor What Matters

Focus on metrics that impact your application:

```yaml
# For caching workloads
- Hit rate
- Memory usage
- Eviction rate
- Latency

# For message queues
- List lengths
- Processing rate
- Blocked clients
- Memory usage

# For session stores
- Connection count
- Operations per second
- Key expiration rate
```

### 2. Set Appropriate Alert Thresholds

```yaml
# Adjust based on your workload
memory_warning: 70%   # Leave room for growth
memory_critical: 85%  # Before evictions start
connections: 80% of maxclients
hit_rate: Based on expected cache effectiveness
```

### 3. Use Labels for Multi-Instance Monitoring

```yaml
# Prometheus relabeling for multiple Redis instances
relabel_configs:
  - source_labels: [__address__]
    regex: '(.+):9121'
    target_label: redis_instance
    replacement: '$1'
```

### 4. Monitor Redis Cluster Specifically

```yaml
# Additional cluster metrics
- redis_cluster_state
- redis_cluster_slots_assigned
- redis_cluster_slots_ok
- redis_cluster_slots_pfail
- redis_cluster_slots_fail
- redis_cluster_known_nodes
```

## Conclusion

Effective Redis monitoring with Prometheus and Grafana requires:

1. **Proper exporter setup**: Configure redis_exporter with authentication and appropriate scrape intervals
2. **Key metrics tracking**: Memory, connections, performance, persistence, and replication
3. **Meaningful dashboards**: Visualize trends and current state
4. **Proactive alerting**: Alert on conditions before they become critical
5. **Regular review**: Adjust thresholds based on actual workload patterns

With this monitoring stack in place, you can ensure Redis reliability, quickly identify issues, and maintain optimal performance for your applications.
