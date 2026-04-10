# Validation Summary: Redis Cluster vs Redis Sentinel: When to Use Which

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Redis Sentinel
- Redis Cluster
- redis-py (Python Redis client)
- redis-cli

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster tutorial: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/clustering.html
- redis-py Sentinel documentation: https://redis-py.readthedocs.io/en/stable/sentinel.html

## Issues Found

1. **Failover flow diagram incorrectly showed Sentinel in the data path** (line 51): The original diagram showed `App -> Sentinel -> Primary`, implying Sentinel proxies traffic between the application and Redis. This is incorrect -- Sentinel only provides service discovery and monitoring. Clients connect directly to Redis primary/replica nodes after discovering their addresses from Sentinel. Fixed the diagram to show discovery-then-direct-connection flow.

2. **RedisCluster startup_nodes used plain dicts instead of ClusterNode objects** (lines 81-86): The original code passed `{"host": "127.0.0.1", "port": 7000}` dicts to `startup_nodes`. In redis-py 4.x and 5.x, `startup_nodes` requires `ClusterNode` objects, not plain dicts. Fixed by importing `ClusterNode` from `redis.cluster` and using `ClusterNode("127.0.0.1", 7000)`.

3. **Minimum Sentinel nodes listed as 2 instead of 3** (line 124): The feature comparison table stated the minimum Sentinel setup requires "1 primary + 2 sentinels". Redis documentation explicitly states that a robust Sentinel deployment requires at least 3 Sentinel instances. Additionally, the blog's own Python code example shows 3 sentinel instances. Fixed the table to show "1 primary + 3 sentinels".

## Review Notes
- The Sentinel minimum nodes entry could arguably also include "1 replica" since without a replica Sentinel has nothing to failover to, but the current format is consistent with the Cluster column which also separates base nodes from HA nodes.
- The `sentinel failover-timeout` of 10000ms (10 seconds) is quite aggressive compared to the default of 180000ms, but it is syntactically valid and acceptable for a demo configuration.
- The `socket_timeout=0.5` (500ms) in the Python Sentinel code is quite low for production use but acceptable for demonstration purposes.
- The `slave_for` method used in the Sentinel Python example is the legacy name; `replica_for` is the newer alias available in redis-py 4.x+. Both work, so this was not changed.
