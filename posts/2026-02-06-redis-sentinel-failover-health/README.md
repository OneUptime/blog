# How to Monitor Redis Sentinel Failover Events, Quorum Status, and Health with the Redis Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Redis, Sentinel, Failover Monitoring

Description: Monitor Redis Sentinel failover events, quorum status, and overall health using the OpenTelemetry Collector Redis receiver for high-availability oversight.

Redis Sentinel provides high availability for Redis by monitoring master instances, detecting failures, and performing automatic failover. Monitoring Sentinel itself is critical because if Sentinel fails, your automatic failover stops working. The OpenTelemetry Collector's Redis receiver can collect Sentinel metrics, and the filelog receiver can capture failover events from Sentinel logs.

## Collector Configuration for Sentinel

```yaml
receivers:
  redis/sentinel-1:
    endpoint: "sentinel-1:26379"
    collection_interval: 15s
    # Sentinel uses the standard Redis protocol
    metrics:
      redis.clients.connected:
        enabled: true
      redis.commands.processed:
        enabled: true
      redis.uptime:
        enabled: true

  redis/sentinel-2:
    endpoint: "sentinel-2:26379"
    collection_interval: 15s

  redis/sentinel-3:
    endpoint: "sentinel-3:26379"
    collection_interval: 15s

  # Also monitor the Redis master
  redis/master:
    endpoint: "redis-master:6379"
    collection_interval: 15s
    password: "${REDIS_PASSWORD}"

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: redis-sentinel
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [redis/sentinel-1, redis/sentinel-2, redis/sentinel-3, redis/master]
      processors: [resource, batch]
      exporters: [otlp]
```

## Querying Sentinel for Status

Sentinel exposes status information through Redis commands. Use a script to collect these and send to the Collector:

```python
import redis
import time
import json

# Connect to Sentinel
sentinel = redis.Redis(host='sentinel-1', port=26379)

def collect_sentinel_metrics():
    """Collect Sentinel-specific metrics."""
    metrics = {}

    # Get master status
    masters = sentinel.sentinel_masters()
    for name, info in masters.items():
        metrics[f"sentinel.master.{name}.status"] = info['flags']
        metrics[f"sentinel.master.{name}.num_slaves"] = info['num-slaves']
        metrics[f"sentinel.master.{name}.num_sentinels"] = info['num-other-sentinels']
        metrics[f"sentinel.master.{name}.quorum"] = info['quorum']
        metrics[f"sentinel.master.{name}.down_after_ms"] = info['down-after-milliseconds']
        metrics[f"sentinel.master.{name}.failover_timeout"] = info['failover-timeout']

    # Check if master is reachable
    try:
        master_addr = sentinel.sentinel_get_master_addr_by_name('mymaster')
        metrics["sentinel.master.address"] = f"{master_addr[0]}:{master_addr[1]}"
        metrics["sentinel.master.reachable"] = 1
    except redis.exceptions.ConnectionError:
        metrics["sentinel.master.reachable"] = 0

    # Get replica status
    replicas = sentinel.sentinel_slaves('mymaster')
    for i, replica in enumerate(replicas):
        metrics[f"sentinel.replica.{i}.status"] = replica['flags']
        metrics[f"sentinel.replica.{i}.master_link_status"] = replica['master-link-status']

    return metrics

# Collect and print metrics every 15 seconds
while True:
    metrics = collect_sentinel_metrics()
    print(json.dumps(metrics, indent=2))
    time.sleep(15)
```

## Collecting Sentinel Logs for Failover Events

Sentinel logs failover events. Collect them with the filelog receiver:

```yaml
receivers:
  filelog/sentinel:
    include:
      - /var/log/redis/sentinel.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<pid>\d+):X (?P<timestamp>\d+ \w+ \d{4} \d{2}:\d{2}:\d{2}\.\d+) (?P<level>[#*+\-]) (?P<message>.*)'
        severity:
          parse_from: attributes.level
          mapping:
            warn: "#"
            info: "*"
            info2: "+"
            debug: "-"
      - type: move
        from: attributes.message
        to: body
      # Filter for important events
      - type: filter
        expr: 'body contains "failover" or body contains "switch-master" or body contains "+sdown" or body contains "-sdown" or body contains "+odown"'
```

Key Sentinel log events:

```
+sdown master mymaster 10.0.0.1 6379    - Subjectively down (one Sentinel thinks it is down)
+odown master mymaster 10.0.0.1 6379    - Objectively down (quorum reached)
+failover-state-reconf-slaves master mymaster - Failover started
+switch-master mymaster 10.0.0.1 6379 10.0.0.2 6379 - Master changed
-sdown master mymaster 10.0.0.2 6379    - No longer considered down
```

## Alert Conditions

```yaml
# Master is subjectively down
- alert: RedisSentinelMasterSDown
  condition: log contains "+sdown master"
  severity: warning
  message: "Sentinel detected master as subjectively down"

# Master is objectively down (quorum reached)
- alert: RedisSentinelMasterODown
  condition: log contains "+odown master"
  severity: critical
  message: "Sentinel quorum agrees master is down. Failover will begin."

# Failover completed
- alert: RedisSentinelFailoverComplete
  condition: log contains "+switch-master"
  severity: info
  message: "Redis master failover completed. New master: {{ new_master }}"

# Sentinel instance down
- alert: RedisSentinelDown
  condition: redis.uptime{instance=~"sentinel.*"} == 0
  for: 1m
  severity: critical
  message: "Sentinel instance {{ instance }} is down. Quorum at risk."

# Not enough Sentinels for quorum
- alert: RedisSentinelQuorumRisk
  condition: count(redis.uptime{instance=~"sentinel.*"} > 0) < 2
  severity: critical
  message: "Only {{ value }} Sentinels are up. Quorum requires at least 2."
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  redis-master:
    image: redis:latest
    ports:
      - "6379:6379"

  redis-replica:
    image: redis:latest
    command: redis-server --slaveof redis-master 6379

  sentinel-1:
    image: redis:latest
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
```

Sentinel configuration:

```
# sentinel.conf
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

## Summary

Monitoring Redis Sentinel requires tracking both metrics (uptime, connected clients) and events (failovers, sdown/odown state changes). The Redis receiver collects basic metrics from each Sentinel instance, while the filelog receiver captures failover events from Sentinel logs. Alert on quorum status, failover events, and Sentinel instance availability to ensure your Redis high-availability setup remains operational.
