# How to Build Redis Dashboards in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Grafana, Monitoring, Dashboard, Observability

Description: Learn how to build comprehensive Redis monitoring dashboards in Grafana using Prometheus metrics from redis_exporter, with key panels and alert rules.

---

## Prerequisites

Before building dashboards, you need:
1. Redis running and accessible
2. redis_exporter running and scraping Redis
3. Prometheus scraping redis_exporter
4. Grafana connected to Prometheus as a data source

If you haven't set up the metrics pipeline, see the guide on setting up redis_exporter for Prometheus first.

## Using the Official Community Dashboard

The fastest way to get started is importing dashboard ID `763` from Grafana.com:

1. In Grafana, click **Dashboards > Import**
2. Enter dashboard ID `763`
3. Select your Prometheus data source
4. Click **Import**

This gives you a pre-built dashboard with all essential Redis metrics.

## Building a Custom Dashboard

### Panel 1: Redis Up/Down Status

```text
# PromQL
redis_up
```

Use a **Stat** panel with thresholds:
- Value 1 = green (Up)
- Value 0 = red (Down)

### Panel 2: Memory Usage

```text
# Used memory in MB
redis_memory_used_bytes / 1024 / 1024

# Memory usage percentage
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

Use a **Gauge** panel with thresholds:
- 0-70% = green
- 70-90% = yellow
- 90-100% = red

### Panel 3: Cache Hit Rate

```text
# Hit rate as percentage
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

Use a **Time series** panel. A healthy cache should maintain > 90% hit rate.

### Panel 4: Operations Per Second

```text
redis_instantaneous_ops_per_sec
```

Or calculate from the counter for more accuracy:
```text
rate(redis_commands_processed_total[1m])
```

### Panel 5: Connected Clients

```text
redis_connected_clients
```

Add a threshold annotation at your `maxclients` value (typically 10,000).

### Panel 6: Eviction Rate

```text
rate(redis_evicted_keys_total[5m])
```

Zero evictions is ideal for a full cache. Non-zero evictions are expected when maxmemory is set and the cache is full.

### Panel 7: Replication Lag

```text
# Only show for replicas (role = slave)
redis_replication_lag_seconds
```

Alert if lag exceeds 30 seconds.

### Panel 8: Memory Fragmentation Ratio

```text
redis_mem_fragmentation_ratio
```

Add reference lines at 1.5 (warning) and 2.0 (critical).

### Panel 9: Slow Log Length

```text
redis_slowlog_length
```

A rising value indicates slow commands are accumulating in the slow log buffer.

## Grafana Dashboard JSON Structure

Create a minimal dashboard programmatically:
```python
import requests
import json

GRAFANA_URL = "http://localhost:3000"
GRAFANA_TOKEN = "your-api-token"

dashboard = {
    "dashboard": {
        "title": "Redis Overview",
        "refresh": "30s",
        "time": {"from": "now-1h", "to": "now"},
        "panels": [
            {
                "id": 1,
                "title": "Redis Up",
                "type": "stat",
                "targets": [{"expr": "redis_up", "legendFormat": "Status"}],
                "gridPos": {"h": 4, "w": 4, "x": 0, "y": 0},
                "fieldConfig": {
                    "defaults": {
                        "thresholds": {
                            "steps": [
                                {"color": "red", "value": 0},
                                {"color": "green", "value": 1}
                            ]
                        }
                    }
                }
            },
            {
                "id": 2,
                "title": "Memory Usage %",
                "type": "gauge",
                "targets": [{
                    "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
                    "legendFormat": "Memory %"
                }],
                "gridPos": {"h": 4, "w": 6, "x": 4, "y": 0},
                "fieldConfig": {
                    "defaults": {
                        "max": 100,
                        "thresholds": {
                            "steps": [
                                {"color": "green", "value": 0},
                                {"color": "yellow", "value": 70},
                                {"color": "red", "value": 90}
                            ]
                        }
                    }
                }
            }
        ]
    },
    "folderId": 0,
    "overwrite": True
}

response = requests.post(
    f"{GRAFANA_URL}/api/dashboards/db",
    headers={
        "Authorization": f"Bearer {GRAFANA_TOKEN}",
        "Content-Type": "application/json"
    },
    json=dashboard
)
print(response.json())
```

## Setting Up Grafana Alerts

Create alert rules directly from dashboard panels:

In the panel editor for cache hit rate:
1. Go to the **Alert** tab
2. Set condition: `WHEN avg() OF query(A, 5m, now) IS BELOW 85`
3. Set notification channel (Slack, PagerDuty, etc.)

For memory alerts using Grafana 9+ unified alerting:
```yaml
# alerting/rules/redis.yaml
groups:
  - name: redis
    interval: 1m
    rules:
      - alert: RedisLowCacheHitRate
        condition: A
        data:
          - refId: A
            queryType: ''
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus
            model:
              expr: >
                rate(redis_keyspace_hits_total[5m]) /
                (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
              instant: true
        noDataState: NoData
        execErrState: Error
        for: 5m
        annotations:
          summary: "Redis cache hit rate below 85%"
        labels:
          severity: warning
```

## Dashboard Variables for Multi-Instance

Add a variable to switch between Redis instances:

In Dashboard Settings > Variables:
- Name: `instance`
- Type: Query
- Query: `label_values(redis_up, instance)`

Then use `$instance` in panel queries:
```text
redis_memory_used_bytes{instance="$instance"} / 1024 / 1024
```

## Summary

A good Redis Grafana dashboard covers six core areas: availability (redis_up), memory usage and fragmentation, cache hit rate, operations throughput, connected clients, and eviction rate. Start with the community dashboard (ID 763) as a baseline and add custom panels for your specific metrics like slow log rate and per-command statistics. Set up alerts on hit rate, memory usage percentage, and eviction rate to catch degradation early.
