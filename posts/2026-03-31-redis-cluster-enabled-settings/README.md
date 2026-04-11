# How to Configure Redis cluster-enabled and Cluster Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Configuration, Scalability

Description: Enable Redis Cluster mode with cluster-enabled and related settings to horizontally scale your Redis deployment across multiple nodes with automatic sharding.

---

Redis Cluster distributes data across multiple nodes using hash slots, providing automatic sharding, high availability, and horizontal scalability. Enabling cluster mode requires setting `cluster-enabled yes` along with several related directives.

## Core Cluster Configuration

```text
# redis.conf - minimum cluster configuration
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000
```

- `cluster-enabled yes` - Enables cluster mode for this instance
- `cluster-config-file` - Path where the cluster topology is persisted (auto-managed by Redis)
- `cluster-node-timeout` - Milliseconds before a node is considered unavailable

## Full Recommended Cluster Configuration

```text
# redis.conf
cluster-enabled yes
cluster-config-file /var/lib/redis/nodes.conf
cluster-node-timeout 15000
cluster-announce-ip 192.168.1.10
cluster-announce-port 6379
cluster-announce-bus-port 16379
cluster-require-full-coverage yes
cluster-allow-reads-when-down no
```

`cluster-announce-ip` is critical in containerized or cloud environments where the advertised IP must differ from the bind address.

## Setting Up a Minimal Cluster

Prepare 6 nodes (3 primaries + 3 replicas), each with the configuration above (different IPs/ports):

```bash
# Start all 6 instances
for port in 7000 7001 7002 7003 7004 7005; do
  redis-server \
    --port $port \
    --cluster-enabled yes \
    --cluster-config-file /tmp/nodes-${port}.conf \
    --cluster-node-timeout 15000 \
    --daemonize yes \
    --logfile /tmp/redis-${port}.log
done
```

Create the cluster with 3 primaries and 1 replica per primary:

```bash
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

## Verifying Cluster Status

```bash
redis-cli -p 7000 CLUSTER INFO
```

```text
cluster_state:ok
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_known_nodes:6
cluster_size:3
```

Check node topology:

```bash
redis-cli -p 7000 CLUSTER NODES
```

## cluster-require-full-coverage

By default `cluster-require-full-coverage yes` means the cluster stops accepting writes if any hash slot is not covered (no node assigned to it):

```text
cluster-require-full-coverage no
```

Setting this to `no` allows the cluster to serve requests for available slots even when some slots are down. Useful for tolerating partial node failures, but clients must handle `CLUSTERDOWN` errors for missing slots.

## Applying Changes

Cluster configuration must be set in `redis.conf` before starting each node. You cannot dynamically enable cluster mode on a running standalone instance - you must start fresh.

To update `cluster-node-timeout` on running nodes:

```bash
redis-cli -p 7000 CONFIG SET cluster-node-timeout 10000
# Repeat for all nodes
```

## Summary

Enable Redis Cluster by setting `cluster-enabled yes` in `redis.conf` along with `cluster-config-file` and `cluster-node-timeout`. Use `redis-cli --cluster create` to initialize slot assignment across nodes. Configure `cluster-announce-ip` in containerized environments where the listen address differs from the advertised address. Monitor cluster health with `CLUSTER INFO` and `CLUSTER NODES`.
