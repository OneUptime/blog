# How to Monitor Redis Cluster Node Status, Slot Coverage, and Replication with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Redis Cluster, Node Status, Replication

Description: Monitor Redis Cluster node status, hash slot coverage, and replication health using the OpenTelemetry Collector Redis receiver for cluster visibility.

Redis Cluster distributes data across multiple nodes using hash slots. Each node owns a subset of the 16,384 hash slots, and each slot can have replicas on other nodes. Monitoring node status, slot coverage, and replication lag is essential for detecting data availability issues before they impact your application.

## Collector Configuration

Monitor each Redis Cluster node with a separate receiver instance:

```yaml
receivers:
  redis/node-1:
    endpoint: "redis-node-1:6379"
    collection_interval: 15s
    password: "${REDIS_PASSWORD}"
    metrics:
      redis.clients.connected:
        enabled: true
      redis.memory.used:
        enabled: true
      redis.memory.peak:
        enabled: true
      redis.keyspace.hits:
        enabled: true
      redis.keyspace.misses:
        enabled: true
      redis.commands.processed:
        enabled: true
      redis.connections.received:
        enabled: true
      redis.replication.offset:
        enabled: true

  redis/node-2:
    endpoint: "redis-node-2:6379"
    collection_interval: 15s
    password: "${REDIS_PASSWORD}"

  redis/node-3:
    endpoint: "redis-node-3:6379"
    collection_interval: 15s
    password: "${REDIS_PASSWORD}"

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: redis-cluster
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [redis/node-1, redis/node-2, redis/node-3]
      processors: [resource, batch]
      exporters: [otlp]
```

## Cluster Health Script

The Redis receiver collects standard Redis metrics. For cluster-specific metrics (slot coverage, node roles), use a script that runs `CLUSTER INFO` and `CLUSTER NODES`:

```python
import redis
import json
import time

def collect_cluster_metrics(nodes):
    """Collect Redis Cluster specific metrics from all nodes."""
    cluster_metrics = {
        "total_nodes": 0,
        "master_nodes": 0,
        "replica_nodes": 0,
        "slots_assigned": 0,
        "slots_ok": 0,
        "slots_pfail": 0,
        "slots_fail": 0,
        "known_nodes": 0,
        "cluster_state": "unknown",
    }

    for node_addr in nodes:
        host, port = node_addr.split(':')
        try:
            r = redis.Redis(host=host, port=int(port))

            # Get CLUSTER INFO
            info = r.cluster_info()
            cluster_metrics["cluster_state"] = info.get("cluster_state", "unknown")
            cluster_metrics["slots_assigned"] = int(info.get("cluster_slots_assigned", 0))
            cluster_metrics["slots_ok"] = int(info.get("cluster_slots_ok", 0))
            cluster_metrics["slots_pfail"] = int(info.get("cluster_slots_pfail", 0))
            cluster_metrics["slots_fail"] = int(info.get("cluster_slots_fail", 0))
            cluster_metrics["known_nodes"] = int(info.get("cluster_known_nodes", 0))

            # Get CLUSTER NODES for role information
            nodes_info = r.cluster_nodes()
            for node_id, node_data in nodes_info.items():
                cluster_metrics["total_nodes"] += 1
                if "master" in node_data.get("flags", ""):
                    cluster_metrics["master_nodes"] += 1
                elif "slave" in node_data.get("flags", ""):
                    cluster_metrics["replica_nodes"] += 1

            break  # Only need to query one node for cluster-wide info

        except redis.exceptions.ConnectionError:
            print(f"Cannot connect to {node_addr}")
            continue

    return cluster_metrics

# Collect metrics
nodes = ["redis-node-1:6379", "redis-node-2:6379", "redis-node-3:6379"]
metrics = collect_cluster_metrics(nodes)
print(json.dumps(metrics, indent=2))
```

## Key Metrics to Monitor

### Cluster State

```
cluster_state: ok | fail
```

If `cluster_state` is `fail`, the cluster cannot serve requests for some hash slots.

### Slot Coverage

```
cluster_slots_assigned: 16384   - All slots should be assigned
cluster_slots_ok: 16384         - All slots should be OK
cluster_slots_pfail: 0          - No slots in PFAIL state
cluster_slots_fail: 0           - No slots in FAIL state
```

If `cluster_slots_assigned` is less than 16384, some slots are not covered and those keys are inaccessible.

### Replication Lag

For each replica node, monitor the replication offset:

```
redis.replication.offset - Current replication offset
```

Compare the master's offset with the replica's offset to calculate lag:

```
replication_lag = master_offset - replica_offset
```

Growing lag means the replica is falling behind, which increases the risk of data loss during failover.

## Alert Conditions

```yaml
# Cluster state is not OK
- alert: RedisClusterNotOK
  condition: cluster_state != "ok"
  severity: critical
  message: "Redis Cluster state is {{ state }}. Some slots may be unavailable."

# Slots not fully covered
- alert: RedisClusterSlotsNotCovered
  condition: cluster_slots_assigned < 16384
  severity: critical
  message: "Only {{ value }} of 16384 slots are assigned."

# Node down
- alert: RedisClusterNodeDown
  condition: redis_up{node=~"redis-node-.*"} == 0
  for: 1m
  severity: critical
  message: "Redis Cluster node {{ node }} is down."

# High replication lag
- alert: RedisClusterReplicationLag
  condition: replication_lag > 10000
  for: 5m
  severity: warning
  message: "Replica {{ node }} is {{ value }} operations behind master."

# Slot in PFAIL state
- alert: RedisClusterSlotPfail
  condition: cluster_slots_pfail > 0
  severity: warning
  message: "{{ value }} slots in PFAIL state."
```

## Docker Compose Cluster Setup

```yaml
version: "3.8"

services:
  redis-node-1:
    image: redis:latest
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000
    ports:
      - "6379:6379"

  redis-node-2:
    image: redis:latest
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --port 6380
    ports:
      - "6380:6380"

  redis-node-3:
    image: redis:latest
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --port 6381
    ports:
      - "6381:6381"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
```

## Summary

Redis Cluster monitoring focuses on three areas: node availability, slot coverage, and replication health. Use the OpenTelemetry Collector Redis receiver for per-node metrics (memory, commands, connections) and a custom script for cluster-specific metrics (slot coverage, cluster state, node roles). Alert on cluster state changes, incomplete slot coverage, and high replication lag to ensure your cluster remains fully operational.
