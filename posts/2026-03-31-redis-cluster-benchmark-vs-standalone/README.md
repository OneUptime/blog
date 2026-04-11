# How to Benchmark Redis Cluster vs Standalone Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Benchmark, Performance, Standalone

Description: Learn how to benchmark Redis Cluster versus standalone Redis to measure throughput, latency, and overhead differences for your workload.

---

Redis Cluster adds overhead compared to standalone Redis: MOVED redirect handling, multi-key operation restrictions, and gossip traffic. Benchmarking both helps you quantify this overhead for your specific workload.

## Understanding the Overhead

```text
Standalone Redis:
  Client -> Redis (1 hop, no redirection)

Redis Cluster:
  Client -> Node A (may redirect with MOVED)
  Client -> Node B (correct node, execute)
  Extra: ~1ms per cross-slot redirect for naive clients
  Smart clients: pre-cache slot map, 0 redirects in steady state
```

## Benchmarking Standalone Redis

```bash
# Basic throughput test: 100k requests, 50 parallel clients, SET
redis-benchmark -h standalone-host -p 6379 \
  -n 100000 \
  -c 50 \
  -t set,get \
  --csv

# Pipeline mode (simulates batching)
redis-benchmark -h standalone-host -p 6379 \
  -n 100000 \
  -c 50 \
  -P 16 \
  -t set,get
```

## Benchmarking Redis Cluster

Use the `--cluster` flag to enable cluster mode in redis-benchmark:

```bash
redis-benchmark -h cluster-node-1 -p 7001 \
  --cluster \
  -n 100000 \
  -c 50 \
  -t set,get \
  --csv

# With pipelining (pipeline + cluster)
redis-benchmark -h cluster-node-1 -p 7001 \
  --cluster \
  -n 100000 \
  -c 50 \
  -P 16 \
  -t set,get
```

The `--cluster` flag makes redis-benchmark distribute keys across cluster nodes using hash slots, giving a realistic cluster benchmark.

## Measuring Latency Distribution

```bash
# Standalone latency percentiles (redis-benchmark reports percentiles by default)
redis-benchmark -h standalone-host -p 6379 \
  -n 1000000 -c 100 -t set

# Cluster latency percentiles
redis-benchmark -h cluster-node-1 -p 7001 \
  --cluster \
  -n 1000000 -c 100 -t set

# For detailed latency tracking over time, use redis-cli:
redis-cli -h standalone-host -p 6379 --latency-history
redis-cli -h standalone-host -p 6379 --latency-dist
```

## Comparing Multi-Key Operations

Multi-key operations are restricted in cluster mode. Compare pipeline performance:

```python
from redis import Redis
from redis.cluster import RedisCluster, ClusterNode
import time

# Standalone - pipelined SET
standalone = Redis(host='standalone', port=6379)
start = time.time()
pipe = standalone.pipeline()
for i in range(10000):
    pipe.set(f'key:{i}', i)
pipe.execute()
print(f"Standalone pipeline: {time.time() - start:.3f}s")

# Cluster - must use hash tags for multi-key
cluster = RedisCluster(
    startup_nodes=[ClusterNode("cluster-node-1", 7001)]
)
start = time.time()
pipe = cluster.pipeline()
for i in range(10000):
    pipe.set(f'{{batch}}:key:{i}', i)  # hash tag ensures same slot
pipe.execute()
print(f"Cluster pipeline: {time.time() - start:.3f}s")
```

## Typical Results

```text
Operation         Standalone    Cluster (3-node)
GET single key    ~100k req/s   ~90k req/s per node
                               ~270k req/s total cluster
SET single key    ~100k req/s   ~90k req/s per node
MGET 10 keys      works         CROSSSLOT without hash tags
Pipelined SET     ~500k req/s   ~450k req/s per node
```

Cluster throughput scales with the number of primary nodes for independent key operations.

## Key Findings from Benchmarking

```text
1. Single-key ops: ~5-10% overhead from cluster routing (smart clients)
2. Pipelining: similar overhead, but total throughput scales linearly
3. Multi-key ops: must use hash tags or client-side batching
4. Total cluster throughput: N * single-node throughput (for independent keys)
5. Latency P99: slightly higher in cluster due to routing and gossip
```

## Summary

Benchmark Redis Cluster with `redis-benchmark --cluster` to get realistic numbers. Single-node throughput is slightly lower than standalone (~5-10% overhead) due to routing, but total cluster throughput scales linearly with primary count. Use hash tags to enable pipelining for multi-key workloads in cluster mode.
