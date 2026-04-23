# How to Configure Redis Cluster on IPv4 Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, IPv4, Sharding, High Availability, Distributed Cache

Description: Set up a Redis Cluster across multiple IPv4 nodes for horizontal scaling and automatic sharding, configure cluster bus ports, and connect applications using cluster-aware clients.

## Introduction

Redis Cluster distributes data across multiple nodes using hash slots (16384 slots total). A minimum of 3 primary nodes is required, each with an optional replica. Cluster nodes communicate on two ports: the standard port (6379) for client connections and the cluster bus port (6379+10000 = 16379) for inter-node communication.

## Per-Node Configuration

```bash
# /etc/redis/redis.conf (apply to each node, adjust bind per node)

# Node-specific bind address

bind 127.0.0.1 10.0.0.1      # Node 1 IP

port 6379

# Enable cluster mode
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000

# For persistence
appendonly yes

# Authentication (same password on all nodes)
requirepass "ClusterPassword123"
masterauth "ClusterPassword123"

protected-mode no
```

```bash
# Node 2: bind 127.0.0.1 10.0.0.2
# Node 3: bind 127.0.0.1 10.0.0.3
# (etc. for 6 nodes with replicas)
```

## Firewall Rules for Cluster

```bash
# Open client port AND cluster bus port (client port + 10000)
CLUSTER_NODES="10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5 10.0.0.6"

for node in $CLUSTER_NODES; do
  # Between cluster nodes: both ports
  sudo iptables -A INPUT -p tcp --dport 6379 -s $node -j ACCEPT
  sudo iptables -A INPUT -p tcp --dport 16379 -s $node -j ACCEPT
done

# From app servers:
sudo iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/24 -j ACCEPT

# Block all other access
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
sudo iptables -A INPUT -p tcp --dport 16379 -j DROP
```

## Creating the Cluster

```bash
# Start Redis on all 6 nodes first
for node in 10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5 10.0.0.6; do
  ssh $node "sudo systemctl restart redis-server"
done

# Create cluster with 3 primaries and 3 replicas
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1 \
  -a ClusterPassword123

# Type 'yes' to accept the cluster layout
```

## Verifying the Cluster

```bash
# Check cluster status
redis-cli -h 10.0.0.1 -a 'ClusterPassword123' cluster info

# View cluster nodes and slot assignments
redis-cli -h 10.0.0.1 -a 'ClusterPassword123' cluster nodes

# Check which hash slot a specific key maps to
redis-cli -h 10.0.0.1 -a 'ClusterPassword123' cluster keyslot mykey
```

## Connecting Applications

```bash
# Applications must use a cluster-aware Redis client

# Python (redis-py cluster):
from redis.cluster import ClusterNode, RedisCluster
r = RedisCluster(
    startup_nodes=[
        ClusterNode("10.0.0.1", 6379),
        ClusterNode("10.0.0.2", 6379),
    ],
    password="ClusterPassword123"
)
r.set("key", "value")

# Node.js (ioredis cluster):
const Redis = require('ioredis');
const cluster = new Redis.Cluster([
  { host: '10.0.0.1', port: 6379 },
  { host: '10.0.0.2', port: 6379 },
], { redisOptions: { password: 'ClusterPassword123' } });
```

## Conclusion

Redis Cluster requires cluster-enabled mode on each node, open ports for both the client port (6379) and the cluster bus port (16379). Create the cluster with `redis-cli --cluster create` specifying all node IPs. Applications must use cluster-aware clients that handle key hash slot routing and automatic redirection (MOVED responses) transparently.
