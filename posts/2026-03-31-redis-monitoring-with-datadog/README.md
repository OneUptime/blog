# How to Set Up Redis Monitoring with Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Datadog, Monitoring, Observability, Integration

Description: Set up Redis monitoring with Datadog Agent, configure the Redis integration, and build dashboards and alerts for memory, latency, and throughput metrics.

---

Datadog provides a first-class Redis integration that collects over 60 metrics out of the box. This guide walks through installing the agent, enabling the Redis check, and setting up meaningful monitors.

## Prerequisites

- Datadog Agent 7+ installed on the Redis host or a Docker container with access to Redis
- A Datadog API key

## Enabling the Redis Integration

The Redis integration ships with Datadog Agent. Create or edit the configuration file:

```bash
sudo nano /etc/datadog-agent/conf.d/redisdb.d/conf.yaml
```

Minimal configuration:

```yaml
init_config:

instances:
  - host: localhost
    port: 6379
    password: ""
    collect_client_metrics: true
    command_stats: true
    keys:
      - "*"
    warn_on_missing_keys: false
```

Restart the agent to apply:

```bash
sudo systemctl restart datadog-agent
```

Verify the check is running:

```bash
sudo datadog-agent check redisdb
```

## Key Metrics Collected

| Metric | Description |
|---|---|
| `redis.net.instantaneous_ops_per_sec` | Commands processed per second |
| `redis.mem.used` | Bytes of memory used |
| `redis.mem.fragmentation_ratio` | Memory fragmentation |
| `redis.stats.keyspace_hits` | Cache hit count |
| `redis.stats.keyspace_misses` | Cache miss count |
| `redis.replication.master_link_down_since_seconds` | Replication lag |
| `redis.info.latency_ms` | Latest fork latency in milliseconds |

## Building a Dashboard

Create a dashboard in Datadog with these widgets:

- Timeseries: `redis.net.instantaneous_ops_per_sec` grouped by host
- Query Value: `redis.mem.used` / `redis.mem.maxmemory` as a percentage
- Timeseries: cache hit ratio = `redis.stats.keyspace_hits / (redis.stats.keyspace_hits + redis.stats.keyspace_misses)`

## Setting Up Monitors

Create a monitor for high memory usage via Terraform or the API:

```python
import datadog
datadog.initialize(api_key="YOUR_API_KEY", app_key="YOUR_APP_KEY")

datadog.api.Monitor.create(
    type="metric alert",
    query="avg(last_5m):avg:redis.mem.used{*} / avg:redis.mem.maxmemory{*} * 100 > 85",
    name="Redis Memory Usage > 85%",
    message="Redis memory usage is above 85%. @pagerduty-on-call",
    tags=["service:redis", "env:production"],
    options={"thresholds": {"critical": 85, "warning": 75}},
)
```

## Monitoring with Docker

If Redis runs in a container, use the agent Docker image and pass the Redis host:

```yaml
version: "3"
services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:7
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_SITE=datadoghq.com
    volumes:
      - ./redisdb.yaml:/etc/datadog-agent/conf.d/redisdb.d/conf.yaml
```

## Summary

Datadog's Redis integration requires only a YAML configuration file to start collecting over 60 Redis metrics automatically. Combine the built-in dashboard templates with custom monitors on memory usage, cache hit ratio, and replication lag to get production-grade observability without writing custom collectors.
