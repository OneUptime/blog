# Validation Summary: How to Set Up Redis Cluster for Horizontal Scaling

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Redis Cluster
- Redis CLI cluster manager
- Redis configuration
- Docker Compose
- Python redis-py
- Node.js ioredis
- Go go-redis
- Prometheus Python client

## Sources Consulted
- Redis Cluster scaling guide: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py connection API documentation: https://redis.readthedocs.io/en/stable/connections.html
- redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- ioredis documentation: https://ioredis.readthedocs.io/en/stable/README/
- go-redis connection documentation: https://redis.io/docs/latest/develop/clients/go/connect/

## Issues Found
- The hash-slot example for `user:1000` was incorrect. Redis Cluster uses CRC16/XMODEM modulo 16384; `user:1000` maps to slot `1649`, not `7186`, so the destination master in the example was changed from Master 2 to Master 1.
- The Docker Compose example mounted one shared Redis config with `port 7000` while the cluster creation command advertised nodes on ports `7001` through `7005`. The node commands were updated to override the port per container and set the matching cluster announce IP, client port, and bus port; unused `REDIS_PORT` environment variables were removed because the official Redis image does not use them to rewrite `redis.conf`.
- The Python heading referred to `redis-py-cluster`, but the code imports `RedisCluster` from modern `redis-py`. The heading was corrected to `redis-py`.
- The redis-py connection example used deprecated `read_from_replicas` and `cluster_error_retry_attempts` options. These were replaced with `load_balancing_strategy=LoadBalancingStrategy.ROUND_ROBIN` and `retry=Retry(ExponentialBackoff(), 3)`.
- The pipeline comment implied hash tags are required for all cluster pipelines. It was narrowed to describe related keys in the same slot, which matches Redis Cluster's same-slot requirement for multi-key commands and transactions without overstating pipeline behavior.
- The monitoring script imported `Counter` but did not use it. The unused import was removed.
- A Python CROSSSLOT example caught `redis.exceptions.RedisClusterException` without importing `redis`. The import was added.
- The MOVED/ASK retry example was updated to use current redis-py retry configuration and include the necessary imports.

## Review Notes
- Redis documentation notes that Redis Cluster requires both the client port and cluster bus port to be reachable between nodes. The Docker Compose example now explicitly announces both.
- The Docker Compose `version` key is accepted by many Compose setups but is considered obsolete by newer Docker Compose implementations; it was left unchanged because it does not affect the Redis Cluster technical correctness of the example.
- The post uses Redis' traditional `master` / `slave` terminology in some CLI flags and client options where those exact names remain part of documented command or library APIs.
