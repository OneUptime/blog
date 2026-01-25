# How to Monitor RabbitMQ with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Prometheus, Monitoring, Grafana, Observability, DevOps, Metrics

Description: A comprehensive guide to monitoring RabbitMQ with Prometheus and Grafana, including essential metrics, alerting rules, and dashboard configuration.

---

Monitoring RabbitMQ is not optional in production. You need to know when queues back up, when consumers fall behind, and when resource limits approach. Prometheus provides the metrics collection, and Grafana gives you visibility. This guide covers setting up both, along with the alerts that will save you from 3 AM incidents.

## Enabling the Prometheus Plugin

RabbitMQ includes a native Prometheus exporter. Enable it on all nodes:

```bash
# Enable the prometheus plugin
rabbitmq-plugins enable rabbitmq_prometheus

# Verify it's enabled
rabbitmq-plugins list | grep prometheus

# Test the endpoint
curl http://localhost:15692/metrics
```

The metrics endpoint runs on port 15692 by default.

## Prometheus Configuration

Add RabbitMQ to your Prometheus scrape configuration:

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'rabbitmq'
    static_configs:
      - targets:
          - 'rabbitmq-node1:15692'
          - 'rabbitmq-node2:15692'
          - 'rabbitmq-node3:15692'
    metrics_path: /metrics

  # Optional: per-object metrics (more detailed but more cardinality)
  - job_name: 'rabbitmq-detailed'
    static_configs:
      - targets:
          - 'rabbitmq-node1:15692'
    metrics_path: /metrics/detailed
    params:
      family: ['queue_coarse_metrics', 'queue_metrics']
```

### Kubernetes ServiceMonitor

For Prometheus Operator on Kubernetes:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: rabbitmq
  namespaceSelector:
    matchNames:
      - messaging
  endpoints:
    - port: prometheus
      interval: 15s
      path: /metrics
```

## Essential Metrics to Monitor

### Queue Metrics

```promql
# Messages ready to be delivered
rabbitmq_queue_messages_ready

# Messages being processed (unacked)
rabbitmq_queue_messages_unacked

# Total messages in queue
rabbitmq_queue_messages

# Message publish rate
rate(rabbitmq_queue_messages_published_total[5m])

# Message delivery rate
rate(rabbitmq_queue_messages_delivered_total[5m])

# Consumer count per queue
rabbitmq_queue_consumers
```

### Connection and Channel Metrics

```promql
# Total connections
rabbitmq_connections

# Connections by state
rabbitmq_connection_state

# Total channels
rabbitmq_channels

# Channels per connection
rabbitmq_channels / rabbitmq_connections
```

### Resource Metrics

```promql
# Memory used by RabbitMQ
rabbitmq_process_resident_memory_bytes

# Memory limit (alarm threshold)
rabbitmq_resident_memory_limit_bytes

# Memory usage percentage
rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes

# Disk space free
rabbitmq_disk_space_available_bytes

# File descriptors used
rabbitmq_process_open_fds

# Erlang process count
rabbitmq_erlang_processes_used
```

### Cluster Metrics

```promql
# Number of running nodes
rabbitmq_cluster_up

# Partitions (should be 0)
rabbitmq_cluster_partitions

# Queue leader/follower distribution (quorum queues)
rabbitmq_queue_leader
```

## Grafana Dashboard

Create a comprehensive dashboard with these panels.

### Dashboard JSON

```json
{
  "title": "RabbitMQ Overview",
  "panels": [
    {
      "title": "Messages Ready",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rabbitmq_queue_messages_ready) by (queue)",
          "legendFormat": "{{ queue }}"
        }
      ]
    },
    {
      "title": "Message Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(rabbitmq_queue_messages_published_total[5m]))",
          "legendFormat": "Published"
        },
        {
          "expr": "sum(rate(rabbitmq_queue_messages_delivered_total[5m]))",
          "legendFormat": "Delivered"
        }
      ]
    },
    {
      "title": "Memory Usage",
      "type": "gauge",
      "targets": [
        {
          "expr": "rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes * 100"
        }
      ],
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "green", "value": null},
          {"color": "yellow", "value": 60},
          {"color": "red", "value": 80}
        ]
      }
    },
    {
      "title": "Connections",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(rabbitmq_connections)"
        }
      ]
    },
    {
      "title": "Consumer Lag",
      "type": "graph",
      "targets": [
        {
          "expr": "rabbitmq_queue_messages_ready / (rate(rabbitmq_queue_messages_delivered_total[5m]) + 0.001) / 60",
          "legendFormat": "{{ queue }} minutes behind"
        }
      ]
    }
  ]
}
```

### Install Pre-built Dashboard

Import the official RabbitMQ dashboard:

```bash
# Grafana Dashboard ID: 10991 (RabbitMQ-Overview)
# Or use: 11340 (RabbitMQ Cluster Monitoring)
```

In Grafana:
1. Go to Dashboards > Import
2. Enter dashboard ID: 10991
3. Select your Prometheus data source

## Alert Rules

Configure alerts for critical conditions.

### Prometheus Alert Rules

```yaml
# rabbitmq-alerts.yml

groups:
  - name: rabbitmq
    rules:
      # Memory alarm triggered
      - alert: RabbitMQMemoryAlarm
        expr: rabbitmq_alarms_memory_used_watermark == 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ memory alarm triggered"
          description: "Memory usage exceeded threshold on {{ $labels.instance }}"

      # Disk alarm triggered
      - alert: RabbitMQDiskAlarm
        expr: rabbitmq_alarms_free_disk_space_watermark == 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ disk alarm triggered"
          description: "Disk space below threshold on {{ $labels.instance }}"

      # High memory usage (warning before alarm)
      - alert: RabbitMQMemoryHigh
        expr: rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ memory usage high"
          description: "Memory at {{ $value | humanizePercentage }} on {{ $labels.instance }}"

      # Queue messages backing up
      - alert: RabbitMQQueueBacklog
        expr: rabbitmq_queue_messages_ready > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ queue has large backlog"
          description: "Queue {{ $labels.queue }} has {{ $value }} messages waiting"

      # No consumers on queue
      - alert: RabbitMQNoConsumers
        expr: rabbitmq_queue_consumers == 0 and rabbitmq_queue_messages_ready > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ queue has no consumers"
          description: "Queue {{ $labels.queue }} has messages but no consumers"

      # Too many connections
      - alert: RabbitMQTooManyConnections
        expr: rabbitmq_connections > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ has too many connections"
          description: "{{ $value }} connections on {{ $labels.instance }}"

      # Node down
      - alert: RabbitMQNodeDown
        expr: up{job="rabbitmq"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ node is down"
          description: "Node {{ $labels.instance }} is not responding"

      # Cluster partition
      - alert: RabbitMQClusterPartition
        expr: rabbitmq_cluster_partitions > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ cluster partition detected"
          description: "Network partition detected in RabbitMQ cluster"

      # Unacked messages piling up
      - alert: RabbitMQUnackedMessages
        expr: rabbitmq_queue_messages_unacked > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ has many unacked messages"
          description: "Queue {{ $labels.queue }} has {{ $value }} unacked messages"

      # File descriptors running low
      - alert: RabbitMQFileDescriptorsLow
        expr: rabbitmq_process_open_fds / rabbitmq_process_max_fds > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ file descriptors running low"
          description: "Using {{ $value | humanizePercentage }} of available file descriptors"
```

## Custom Recording Rules

Pre-compute frequently used metrics:

```yaml
# rabbitmq-recording-rules.yml

groups:
  - name: rabbitmq_recording
    rules:
      # Total messages across all queues
      - record: rabbitmq:queue_messages:total
        expr: sum(rabbitmq_queue_messages)

      # Message publish rate
      - record: rabbitmq:messages_published:rate5m
        expr: sum(rate(rabbitmq_queue_messages_published_total[5m]))

      # Message delivery rate
      - record: rabbitmq:messages_delivered:rate5m
        expr: sum(rate(rabbitmq_queue_messages_delivered_total[5m]))

      # Memory usage percentage
      - record: rabbitmq:memory_usage:percentage
        expr: rabbitmq_process_resident_memory_bytes / rabbitmq_resident_memory_limit_bytes

      # Consumer lag in seconds
      - record: rabbitmq:queue_lag:seconds
        expr: rabbitmq_queue_messages_ready / (rate(rabbitmq_queue_messages_delivered_total[5m]) + 0.001)
```

## Python Monitoring Script

For custom monitoring outside Prometheus:

```python
import requests
import time

class RabbitMQMonitor:
    def __init__(self, host, port=15692):
        self.metrics_url = f"http://{host}:{port}/metrics"

    def get_metrics(self):
        """Fetch and parse Prometheus metrics"""
        response = requests.get(self.metrics_url)
        metrics = {}

        for line in response.text.split('\n'):
            if line and not line.startswith('#'):
                parts = line.split(' ')
                if len(parts) >= 2:
                    metric_name = parts[0]
                    metric_value = float(parts[1])
                    metrics[metric_name] = metric_value

        return metrics

    def check_health(self):
        """Check overall RabbitMQ health"""
        metrics = self.get_metrics()

        checks = {
            'memory_ok': metrics.get('rabbitmq_alarms_memory_used_watermark', 0) == 0,
            'disk_ok': metrics.get('rabbitmq_alarms_free_disk_space_watermark', 0) == 0,
            'connections': metrics.get('rabbitmq_connections', 0),
            'channels': metrics.get('rabbitmq_channels', 0),
        }

        return checks

    def get_queue_stats(self):
        """Get detailed queue statistics"""
        # Use management API for detailed per-queue stats
        response = requests.get(
            f"http://{self.host}:15672/api/queues",
            auth=('admin', 'password')
        )
        return response.json()

# Usage
monitor = RabbitMQMonitor('localhost')
health = monitor.check_health()
print(f"Memory OK: {health['memory_ok']}")
print(f"Disk OK: {health['disk_ok']}")
print(f"Connections: {health['connections']}")
```

## Metric Labels and Cardinality

Be aware of label cardinality to avoid overwhelming Prometheus:

```yaml
# High cardinality - use sparingly
rabbitmq_queue_messages{queue="queue-name"}  # One series per queue

# Lower cardinality - aggregated
rabbitmq_queue_messages_total  # Single series

# Configure detailed metrics carefully
# prometheus.yml
scrape_configs:
  - job_name: 'rabbitmq-detailed'
    metrics_path: /metrics/detailed
    params:
      # Only scrape specific metric families
      family:
        - queue_coarse_metrics  # Less detailed
        # Avoid queue_metrics for large queue counts
```

## Troubleshooting Metrics Collection

### Metrics Not Appearing

```bash
# Check plugin is enabled
rabbitmq-plugins list | grep prometheus

# Test endpoint directly
curl -v http://localhost:15692/metrics | head -50

# Check firewall/network
nc -zv rabbitmq-host 15692
```

### Missing Queue Metrics

```bash
# Ensure detailed metrics are enabled if needed
curl "http://localhost:15692/metrics/detailed?family=queue_metrics"
```

### Prometheus Target Down

```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="rabbitmq")'
```

## Best Practices

1. **Start with essential metrics**: Queue depth, message rates, memory
2. **Set up alerts before incidents**: Memory, disk, queue backlog
3. **Use recording rules**: Pre-compute expensive queries
4. **Watch cardinality**: Limit per-queue metrics in large deployments
5. **Correlate with app metrics**: Compare publish rates with app throughput
6. **Retain history**: Keep metrics for capacity planning
7. **Document thresholds**: Explain why alert values were chosen

## Conclusion

Prometheus monitoring gives you visibility into RabbitMQ health and performance. Enable the plugin, configure Prometheus scraping, set up essential alerts, and build a Grafana dashboard. The investment in monitoring pays off when you catch issues before they become outages, and when you have the data to diagnose problems quickly.
