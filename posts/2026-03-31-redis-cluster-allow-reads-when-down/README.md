# How to Configure Redis cluster-allow-reads-when-down

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Configuration, Availability

Description: Configure cluster-allow-reads-when-down to let Redis Cluster nodes serve stale read requests during partial outages, trading consistency for availability.

---

When a Redis Cluster detects that it cannot guarantee consistency (for example, when hash slots are not fully covered), it stops serving all requests by default. The `cluster-allow-reads-when-down` directive lets nodes continue serving read requests even in a degraded state.

## Default Behavior

By default:

```text
# redis.conf
cluster-allow-reads-when-down no
```

With `no`, if a node detects that the cluster is down or it cannot confirm cluster state, it returns:

```text
(error) CLUSTERDOWN The cluster is down
```

This is the safe default - it prevents serving stale or inconsistent data.

## Enabling Reads When Down

```text
# redis.conf
cluster-allow-reads-when-down yes
```

Or at runtime:

```bash
redis-cli CONFIG SET cluster-allow-reads-when-down yes
redis-cli CONFIG GET cluster-allow-reads-when-down
```

With this enabled, nodes will:

- Continue serving GET, MGET, LRANGE, and other read commands for slots they own
- Return `CLUSTERDOWN` only for write commands and for slots not assigned to them
- Serve potentially stale data if they were recently promoted

## When to Use It

Enable `cluster-allow-reads-when-down yes` when:

- Your application can tolerate reading slightly stale data during failover windows
- Availability is more important than strict consistency (e.g., product catalog, configuration data)
- You have monitoring in place to detect cluster degradation and alert operators

Keep it `no` when:

- Data must be strictly consistent (financial balances, inventory counts)
- You prefer clear errors over silent staleness

## Understanding Cluster States

Cluster state is visible via `CLUSTER INFO`:

```bash
redis-cli CLUSTER INFO | grep cluster_state
```

```text
cluster_state:ok          # All slots covered
cluster_state:fail        # One or more slots unavailable
```

When `cluster_state:fail`, with `cluster-allow-reads-when-down no`, all commands fail. With `yes`, reads for locally assigned slots still succeed.

## Application-Level Handling

In Python with `redis-py`:

```python
from redis.cluster import RedisCluster, ClusterNode

startup_nodes = [
    ClusterNode("192.168.1.10", 7000),
    ClusterNode("192.168.1.11", 7001),
]

rc = RedisCluster(
    startup_nodes=startup_nodes,
    decode_responses=True,
    require_full_coverage=False,  # allows connection even if cluster incomplete
)

try:
    value = rc.get("product:1234")
except Exception as e:
    # Log and return cached or default value
    print(f"Redis unavailable: {e}")
    value = None
```

## Relationship to cluster-require-full-coverage

These two settings work together:

```text
# Allow reads during partial outage
cluster-allow-reads-when-down yes

# Allow writes for available slots even when others are down
cluster-require-full-coverage no
```

Using both together gives maximum availability at the cost of potential inconsistency. Use only with applications designed to handle eventual consistency.

## Summary

`cluster-allow-reads-when-down yes` lets Redis Cluster nodes continue serving read requests even when the cluster is in a degraded state, providing higher availability at the cost of possible stale reads. Enable it for read-heavy applications where availability outweighs strict consistency. Pair with `cluster-require-full-coverage no` to also permit writes to available slots during partial failures.
