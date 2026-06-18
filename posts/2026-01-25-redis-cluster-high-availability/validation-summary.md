# Validation Summary: How to Use Redis Cluster for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster
- Redis CLI cluster management
- Redis configuration
- Docker Compose
- Python
- redis-py

## Sources Consulted
- Redis documentation: Scale with Redis Cluster - https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification - https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis command reference: CLUSTER NODES - https://redis.io/docs/latest/commands/cluster-nodes/
- Redis command reference: CLUSTER FAILOVER - https://redis.io/docs/latest/commands/cluster-failover/
- redis-py clustering documentation - https://redis.readthedocs.io/en/stable/clustering.html
- redis-py API/source documentation for RedisCluster - https://redis.readthedocs.io/en/stable/_modules/redis/cluster.html
- redis-py retry documentation - https://redis.readthedocs.io/en/stable/retry.html

## Issues Found
- The Docker Compose example used host port mapping with Redis Cluster nodes listening on port 6379 inside each container. Redis Cluster does not work reliably with remapped/NATted ports because nodes advertise their own addresses and also require a cluster bus port. Changed the example to use host networking with unique Redis ports 7000-7005, matching Redis' official Docker guidance for Cluster.
- The Python examples used dict-based `startup_nodes` and `skip_full_coverage_check`, which are not the current redis-py 8 API shape. Updated examples to use `ClusterNode` objects or `host`/`port`, and removed the obsolete option.
- The failover example used deprecated `cluster_error_retry_attempts`. Replaced it with a `Retry(ExponentialBackoff(), 3)` object as recommended by redis-py documentation.
- The transaction example used a non-transactional cluster pipeline while describing transactions. Updated it to `rc.pipeline(transaction=True)` so the example matches the claim.
- The hash-slot example used `cluster_keyslot`; redis-py documents `keyslot` for calculating a key's slot. Updated the example to use `rc.keyslot(...)`.
- The monitoring example treated `cluster_nodes()` as parsed structured node data. Redis documents `CLUSTER NODES` as a serialized text response, and redis-py exposes client topology through `get_nodes()` and slot mapping through `cluster_slots()`. Updated the example to use those APIs.

## Review Notes
- The local environment did not have `redis-cli`, so Redis CLI commands were checked against official Redis documentation rather than local help output.
- The setup snippets disable protected mode and bind broadly in the non-Docker example, which can be acceptable for a local tutorial but should be tightened for production deployments with private networking, authentication, and firewall rules.
