# Validation Summary: How to Set Up a Redis Cluster with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.2 (Cluster mode)
- Docker Compose
- Python redis-py client library

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis Cluster tutorial: https://redis.io/docs/management/scaling/
- redis-py documentation (RedisCluster API): https://redis-py.readthedocs.io/en/stable/clustering.html
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Redis CLI `--cluster` subcommands: https://redis.io/docs/management/cli/#redis-cli-cluster-support

## Issues Found
1. **Python client `startup_nodes` format was incorrect.** The code used plain dictionaries (`{"host": "127.0.0.1", "port": "7001"}`) for `startup_nodes`. In redis-py >= 4.1.0, `startup_nodes` expects a list of `ClusterNode` objects, not dictionaries. Additionally, the port values were strings (`"7001"`) instead of integers (`7001`). Fixed by importing `ClusterNode` from `redis.cluster` and using `ClusterNode("127.0.0.1", 7001)` instances.

## Review Notes
- The `version: "3.9"` key in the Docker Compose file is ignored by Docker Compose V2 (which is now the default). It does not cause errors but is unnecessary. This is cosmetic and not a technical error.
- All Redis Cluster configuration flags (`--cluster-enabled`, `--cluster-config-file`, `--cluster-node-timeout`, `--cluster-announce-ip`, `--cluster-announce-port`, `--cluster-announce-bus-port`) are correct.
- The bus port convention (client port + 10000) is correctly applied across all six nodes.
- The `--cluster-replicas 1` flag correctly produces 3 primaries and 3 replicas from 6 nodes.
- The 16384 hash slot count is correct.
- The hash tag example (`{user}:1001`) correctly demonstrates key colocation for multi-key commands.
- The static IP approach with a custom bridge network and defined subnet is the standard pattern for Redis Cluster in Docker Compose.
