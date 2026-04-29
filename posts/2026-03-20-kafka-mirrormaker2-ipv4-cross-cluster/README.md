# How to Configure Kafka MirrorMaker 2 for IPv4 Cross-Cluster Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, MirrorMaker 2, IPv4, Cross-Cluster, Replication, Disaster Recovery, Configuration

Description: Learn how to configure Kafka MirrorMaker 2 to replicate topics between Kafka clusters over IPv4 networks for disaster recovery and multi-datacenter deployments.

---

MirrorMaker 2 (MM2) is Kafka's built-in tool for cross-cluster replication. It uses Kafka Connect under the hood to continuously replicate topics, consumer group offsets, and topic configurations from a source cluster to a destination cluster.

## Architecture

```mermaid
graph LR
    A[Source Cluster\n10.0.0.10:9092] -->|MirrorMaker 2| B[Destination Cluster\n10.1.0.10:9092]
    B -->|Replication Lag Metrics| C[Monitoring]
```

## MirrorMaker 2 Configuration File

```properties
# /etc/kafka/mm2.properties

# --- Cluster aliases ---

clusters = source, destination

# --- Source cluster: DC A ---
source.bootstrap.servers = 10.0.0.10:9092,10.0.0.11:9092

# --- Destination cluster: DC B ---
destination.bootstrap.servers = 10.1.0.10:9092,10.1.0.11:9092

# --- Replication flows ---
# Enable replication from source to destination
source->destination.enabled = true

# --- Topic selection ---
# Replicate all topics matching this pattern
source->destination.topics = .*
# source->destination.topics = orders.*, payments.*

# Exclude internal and replica topics
source->destination.topics.exclude = mm2.*\\.internal, .*\\.replica, __.*, .*_replica

# --- Consumer group offset replication ---
# Replicate all consumer groups
source->destination.groups = .*
source->destination.emit.checkpoints.enabled = true
source->destination.sync.group.offsets.enabled = true

# --- Replication factor for replicated topics on destination ---
replication.factor = 3

# --- MirrorMaker 2 internal topics replication factor ---
checkpoints.topic.replication.factor = 3
heartbeats.topic.replication.factor = 3
offset-syncs.topic.replication.factor = 3

# --- Connect worker settings ---
offset.storage.replication.factor = 3
config.storage.replication.factor = 3
status.storage.replication.factor = 3
```

## Starting MirrorMaker 2

```bash
# Start MM2 in dedicated mode
connect-mirror-maker.sh /etc/kafka/mm2.properties > /var/log/kafka/mirrormaker.log 2>&1 &

# Check logs
tail -f /var/log/kafka/mirrormaker.log
```

## Monitoring Replication Lag

MirrorMaker 2 emits heartbeats to the destination cluster. Use the Connect REST API to inspect the MM2 connectors, the heartbeat topic to verify the replication flow, and MM2 JMX metrics such as `replication-latency-ms` and `checkpoint-latency-ms` to measure lag:

```bash
# Inspect the MM2 connectors via the Connect REST API
curl -s http://10.0.0.20:8083/connectors | python3 -m json.tool

# Monitor the heartbeat topic for replication health
kafka-console-consumer.sh \
  --bootstrap-server 10.1.0.10:9092 \
  --topic heartbeats \
  --from-beginning
```

## Topic Naming Convention

MM2 renames replicated topics on the destination with the source alias prefix:

| Source Topic | Destination Topic |
|------------|-----------------|
| `orders` | `source.orders` |
| `payments` | `source.payments` |

## Failover: Using Replicated Offsets

```bash
# After failover, restart consumers against the destination cluster with the same group.id.
# If MM2 has synced translated offsets, verify them on the destination cluster:
kafka-consumer-groups.sh \
  --bootstrap-server 10.1.0.10:9092 \
  --command-config /etc/kafka/client.properties \
  --describe \
  --group my-consumer-group
```

## Key Takeaways

- MM2 can sync translated consumer group offsets to the destination cluster to support failover.
- Topics are renamed with the source alias prefix (e.g., `source.orders`) to avoid naming conflicts.
- `source->destination.sync.group.offsets.enabled = true` periodically writes translated offsets to the destination cluster while the group is inactive there.
- Run multiple MM2 processes for HA; dedicated mode is simpler to operate.
