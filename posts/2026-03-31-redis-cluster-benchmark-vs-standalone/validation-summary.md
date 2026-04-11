# Validation Summary: How to Benchmark Redis Cluster vs Standalone Performance

## Status
validated

## Post Type
Tutorial / Benchmarking Guide

## Technologies Covered
- Redis (standalone and cluster modes)
- redis-benchmark CLI tool
- redis-cli (latency monitoring)
- redis-py Python client (Redis, RedisCluster, ClusterNode)
- Redis Cluster hash slots and hash tags

## Sources Consulted
- redis-benchmark --help output (confirmed valid flags: --cluster, -P, -t, -n, -c, --csv, -h, -p)
- redis-cli --help output (confirmed --latency-history and --latency-dist are redis-cli flags, not redis-benchmark flags)
- redis-py source code and documentation (RedisCluster and ClusterNode API, confirmed startup_nodes requires ClusterNode objects, not dicts)
- Redis official documentation on CLUSTER commands and MOVED/ASK redirections

## Issues Found

### Issue 1: Invalid redis-benchmark flags (latency section)
**What was wrong:** The "Measuring Latency Distribution" section used `--latency-history` and `--latency-dist` flags with `redis-benchmark`. These are `redis-cli` flags and do not exist in `redis-benchmark`.
**What was changed:** Removed the invalid flags from redis-benchmark commands (redis-benchmark reports latency percentiles by default). Added separate redis-cli examples for detailed latency tracking.
**Why:** Using these flags with redis-benchmark would produce an error. redis-benchmark already reports latency percentiles in its default output.

### Issue 2: Incorrect RedisCluster constructor usage
**What was wrong:** The Python code used `redis.cluster.RedisCluster(startup_nodes=[{"host": "cluster-node-1", "port": 7001}])`, passing a dictionary to `startup_nodes`. In redis-py 4.x+, `startup_nodes` requires `ClusterNode` objects, not dicts. Passing a dict raises `AttributeError`.
**What was changed:** Updated imports to `from redis.cluster import RedisCluster, ClusterNode` and changed to `RedisCluster(startup_nodes=[ClusterNode("cluster-node-1", 7001)])`.
**Why:** The dict-based API was from the old `redis-py-cluster` package. Since redis-py 4.1+, RedisCluster is built into redis-py and requires ClusterNode objects.

### Issue 3: Misleading "MSET" label
**What was wrong:** The standalone benchmark print statement said "Standalone MSET" but the code performs pipelined individual SET commands, not the MSET command (which sets multiple keys in a single command).
**What was changed:** Renamed to "Standalone pipeline" to accurately reflect what the code does.
**Why:** MSET and pipelined SET are different operations with different semantics. Mislabeling could confuse readers about what is being benchmarked.

## Review Notes
- The typical benchmark numbers (~100k req/s standalone, ~90k per cluster node, ~5-10% overhead) are reasonable ballpark figures but will vary significantly with hardware, network, and payload size. The post appropriately uses "~" to indicate approximations.
- The cluster pipeline example uses hash tags (`{batch}:key:N`) to force all keys to the same slot. While this is correct for demonstrating hash tags, readers should note this sends all pipeline commands to a single node, which doesn't reflect real multi-node cluster throughput. The post could note this in the future.
- redis-py's `ClusterPipeline` can handle cross-slot operations by splitting commands into per-node pipelines automatically — hash tags are not strictly required for pipelines to work, only for multi-key commands like MSET/MGET that must execute atomically on a single node.
