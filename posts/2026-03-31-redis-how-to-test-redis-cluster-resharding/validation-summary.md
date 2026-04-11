# Validation Summary: How to Test Redis Cluster Resharding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster (hash slots, resharding, rebalancing)
- redis-py (Python Redis client, RedisCluster class)
- redis-cli (cluster management subcommands: create, reshard, rebalance, info)
- Docker (container-based test cluster setup)
- Bash scripting (automated test scripts)

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis Cluster tutorial: https://redis.io/docs/management/scaling/
- redis-cli --cluster subcommands: https://redis.io/docs/management/cli/#cluster-mode
- redis-py RedisCluster documentation: https://redis-py.readthedocs.io/en/stable/clustering.html
- redis-py exceptions module: https://redis-py.readthedocs.io/en/stable/exceptions.html
- Redis CLUSTER NODES command: https://redis.io/commands/cluster-nodes/

## Issues Found

1. **Inaccurate description of key availability during resharding** (line 13): The post stated that "keys in migrating slots are temporarily unavailable, returning MOVED or ASK redirects." This is misleading — keys remain accessible throughout resharding. Clients receive MOVED or ASK redirects which cluster-aware clients handle transparently. Changed to: "clients accessing keys in migrating slots receive MOVED or ASK redirects, which cluster-aware clients handle automatically."

2. **Incorrect tool reference** (line 22): The post said "Use Docker Compose to create a 6-node cluster" but the code uses plain `docker run` commands, not Docker Compose (no docker-compose.yml is provided). Changed "Docker Compose" to "Docker."

3. **Misleading RedisCluster constructor parameters** (MOVED/ASK redirect test section): The example included `retry_on_error=[MovedError, AskError]` and `max_connections_per_node=10`. The `retry_on_error` parameter is redundant because RedisCluster handles MOVED and ASK redirects automatically via its internal routing logic — these don't need to be specified as retry-on-error exceptions. The `max_connections_per_node` parameter with a value of `10` is misleading as it's historically a boolean flag (not an integer connection count). Simplified the constructor to use only standard, necessary parameters.

## Review Notes
- The `cluster.dbsize()` call in the "Loading Test Data" section returns a dictionary keyed by node (not a single integer) in some versions of redis-py. The output will still be informative but may not display as a clean total number. This is a minor cosmetic concern, not a correctness issue.
- The `retry_on_error` parameter on RedisCluster is useful for other exception types like `ConnectionError` or `TimeoutError`, but MOVED/ASK redirects are part of the cluster protocol and handled at a lower level than the retry mechanism.
- All redis-cli cluster subcommands (`--cluster create`, `--cluster reshard`, `--cluster rebalance`, `--cluster info`) use correct flags and syntax for Redis 7.x.
- The automated test script's grep pattern `"7001.*master"` for parsing CLUSTER NODES output is correct — the port appears before the flags field in the output format.
