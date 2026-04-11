# How to Set Up a Redis Cluster with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Docker Compose, Local Development, High Availability, Sharding

Description: Spin up a 6-node Redis Cluster (3 primary, 3 replica) locally using Docker Compose for development and testing of cluster-aware Redis workloads.

---

Redis Cluster distributes data across multiple primary nodes using hash slots, providing horizontal scalability and automatic failover. Running a local cluster with Docker Compose lets you develop and test cluster-aware client code before deploying to a managed cloud service or production Kubernetes environment.

## Docker Compose File

Create `docker-compose.yml`:

```yaml
version: "3.9"

x-redis-common: &redis-common
  image: redis:7.2-alpine
  restart: unless-stopped
  networks:
    - redis-cluster-net

services:
  redis-node-1:
    <<: *redis-common
    container_name: redis-node-1
    ports:
      - "7001:7001"
      - "17001:17001"
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --cluster-announce-ip 172.20.0.11
      --cluster-announce-port 7001
      --cluster-announce-bus-port 17001
      --appendonly yes
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.11

  redis-node-2:
    <<: *redis-common
    container_name: redis-node-2
    ports:
      - "7002:7002"
      - "17002:17002"
    command: >
      redis-server
      --port 7002
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --cluster-announce-ip 172.20.0.12
      --cluster-announce-port 7002
      --cluster-announce-bus-port 17002
      --appendonly yes
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.12

  redis-node-3:
    <<: *redis-common
    container_name: redis-node-3
    ports:
      - "7003:7003"
      - "17003:17003"
    command: >
      redis-server
      --port 7003
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --cluster-announce-ip 172.20.0.13
      --cluster-announce-port 7003
      --cluster-announce-bus-port 17003
      --appendonly yes
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.13

  redis-node-4:
    <<: *redis-common
    container_name: redis-node-4
    ports:
      - "7004:7004"
      - "17004:17004"
    command: >
      redis-server
      --port 7004
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --cluster-announce-ip 172.20.0.14
      --cluster-announce-port 7004
      --cluster-announce-bus-port 17004
      --appendonly yes
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.14

  redis-node-5:
    <<: *redis-common
    container_name: redis-node-5
    ports:
      - "7005:7005"
      - "17005:17005"
    command: >
      redis-server
      --port 7005
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --cluster-announce-ip 172.20.0.15
      --cluster-announce-port 7005
      --cluster-announce-bus-port 17005
      --appendonly yes
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.15

  redis-node-6:
    <<: *redis-common
    container_name: redis-node-6
    ports:
      - "7006:7006"
      - "17006:17006"
    command: >
      redis-server
      --port 7006
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --cluster-announce-ip 172.20.0.16
      --cluster-announce-port 7006
      --cluster-announce-bus-port 17006
      --appendonly yes
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.16

networks:
  redis-cluster-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
```

## Start the Nodes

```bash
docker compose up -d
```

## Initialize the Cluster

After all nodes are running, initialize the cluster with 3 primaries and 3 replicas:

```bash
docker exec -it redis-node-1 redis-cli \
  --cluster create \
  172.20.0.11:7001 \
  172.20.0.12:7002 \
  172.20.0.13:7003 \
  172.20.0.14:7004 \
  172.20.0.15:7005 \
  172.20.0.16:7006 \
  --cluster-replicas 1 \
  --cluster-yes
```

## Verify the Cluster

```bash
docker exec -it redis-node-1 redis-cli -p 7001 cluster info
docker exec -it redis-node-1 redis-cli -p 7001 cluster nodes
```

Expected output for `cluster_state`: `ok`, and `cluster_slots_assigned`: `16384`.

## Connect with a Cluster-Aware Client (Python)

```python
from redis.cluster import RedisCluster, ClusterNode

rc = RedisCluster(
    startup_nodes=[
        ClusterNode("127.0.0.1", 7001),
        ClusterNode("127.0.0.1", 7002),
        ClusterNode("127.0.0.1", 7003),
    ],
    decode_responses=True,
)

rc.set("user:1001", "Alice")
print(rc.get("user:1001"))  # Alice

# Multi-key commands require hash tags to colocate keys
rc.mset({"{user}:1001": "Alice", "{user}:1002": "Bob"})
```

## Tear Down

```bash
docker compose down -v
```

## Summary

A 6-node Redis Cluster (3 primaries + 3 replicas) running in Docker Compose is the fastest way to develop and test cluster-aware applications locally. The key configuration points are static IP addresses for announce addresses, separate bus ports (+10000 offset), and the `--cluster-replicas 1` flag during initialization. Once your code works locally, the same patterns apply to managed Redis clusters on AWS ElastiCache, Azure Cache for Redis, or Kubernetes.
