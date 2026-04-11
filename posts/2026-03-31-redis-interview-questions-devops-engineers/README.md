# Top Redis Interview Questions for DevOps Engineers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Interview, DevOps, Kubernetes, Monitoring

Description: Key Redis interview questions for DevOps roles covering deployment, replication, clustering, monitoring, and production operations.

---

DevOps engineers working with Redis are expected to know how to deploy, scale, secure, and monitor it in production. Here are the most common interview questions for DevOps roles.

## Deployment and Configuration

**Q: How do you secure a Redis instance?**

```bash
# In redis.conf
requirepass your-strong-password
bind 127.0.0.1
protected-mode yes
rename-command FLUSHALL ""    # disable dangerous commands
rename-command CONFIG ""
```

Also enable TLS for connections in Redis 6+:

```bash
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
```

**Q: How do you tune Redis memory?**

```bash
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru

# Check current memory usage
redis-cli INFO memory | grep used_memory_human
```

## Replication and High Availability

**Q: How does Redis replication work?**

A replica connects to the primary, receives a full RDB snapshot, then streams ongoing writes. Replicas are read-only by default. If the primary fails, a replica can be promoted manually or automatically via Sentinel.

**Q: What is Redis Sentinel?**

Sentinel monitors Redis primaries and replicas. If the primary goes down, Sentinel promotes a replica and updates clients. It also provides service discovery via a named master:

```bash
redis-sentinel /etc/redis/sentinel.conf

# In sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
```

## Clustering

**Q: What is Redis Cluster and when do you use it?**

Redis Cluster shards data across multiple nodes using 16384 hash slots. Use it when a single node cannot hold all data or handle all traffic. Each primary can have replicas for HA.

```bash
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

**Q: What are hash tags in Redis Cluster?**

Hash tags force keys to land on the same slot. Keys with `{user:42}:profile` and `{user:42}:sessions` both hash on `user:42` and end up on the same node, enabling multi-key operations.

## Monitoring

**Q: What metrics do you watch in production?**

```bash
redis-cli INFO stats | grep -E "(keyspace_hits|keyspace_misses|total_commands_processed)"
redis-cli INFO memory | grep -E "(used_memory_human|mem_fragmentation_ratio)"
redis-cli INFO clients | grep connected_clients
redis-cli INFO replication
```

Key metrics:
- Hit rate (`keyspace_hits / (keyspace_hits + keyspace_misses)`) should be above 95%
- `mem_fragmentation_ratio` should be 1.0 to 1.5
- `connected_clients` vs `maxclients`
- Replication lag on replicas

**Q: How do you deploy Redis on Kubernetes?**

Use the Bitnami Helm chart or the Redis Operator. Always use StatefulSets, PersistentVolumeClaims for data persistence, and resource limits:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-redis bitnami/redis \
  --set auth.password=secretpassword \
  --set master.persistence.size=8Gi \
  --set replica.replicaCount=2
```

## Summary

DevOps Redis interview questions focus on securing and configuring instances, setting up replication and Sentinel for HA, deploying Redis Cluster for horizontal scaling, and monitoring key metrics in production. Kubernetes deployment knowledge using Helm charts is increasingly common in modern DevOps interviews.
