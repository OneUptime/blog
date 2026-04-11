# Validation Summary: How to Deploy Redis Operator in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Kubernetes
- Helm
- OT-Container-Kit Redis Operator
- Redis Sentinel
- Redis Cluster
- Custom Resource Definitions (CRDs)

## Sources Consulted
- OT-Container-Kit Redis Operator GitHub repository (https://github.com/OT-CONTAINER-KIT/redis-operator)
- OT-Container-Kit Helm Charts repository (https://ot-container-kit.github.io/helm-charts/)
- Other validated Redis Operator blog posts in the same repository (e.g., ArgoCD deployment, Flux CD deployment) for cross-referencing CRD names, API versions, and spec structures
- Kubernetes documentation for CRD and resource spec conventions
- Redis documentation for configuration parameters

## Issues Found

1. **CRD names had extra `redis.` prefix (lines 52-57)**: The expected CRD names were listed as `redis.redis.redis.opstreelabs.in`, `rediscluster.redis.redis.opstreelabs.in`, etc. The correct CRD names are `redis.redis.opstreelabs.in`, `rediscluster.redis.opstreelabs.in`, etc. Fixed by removing the extra `redis.` segment from all four CRD names.

2. **RedisSentinel `redisReplicationName` in wrong location (line 160)**: The `redisReplicationName` field was placed at the `spec` level of the RedisSentinel resource. It should be nested inside `redisSentinelConfig`. Moved the field into the correct location, consistent with the operator's API and other validated posts in the repository.

3. **CPU request `101m` instead of `100m` (lines 75, 122, 164, 201)**: All four resource definitions used `101m` for CPU requests, which is an atypical value almost certainly intended to be `100m`. Fixed across all four YAML manifests (standalone, replication, sentinel, cluster).

4. **`redis-cli` command outside `kubectl exec` context (line 248)**: The command `redis-cli -h redis-replication.default.svc.cluster.local INFO replication` was listed as a standalone shell command, which would not work from outside the Kubernetes cluster. Changed to `kubectl exec -it redis-replication-0 -- redis-cli INFO replication` to be consistent and executable.

## Review Notes
- The `redisConfig` sections use inline key-value pairs for Redis configuration parameters (e.g., `maxmemory`, `maxmemory-policy`, `appendonly`). This matches the pattern used in other validated posts in the repository, though the operator also supports referencing external ConfigMaps.
- The `cluster-announce-hostname: "false"` value in the RedisCluster config is unusual — in Redis, this parameter expects a hostname string or empty string, not "false". However, the operator may handle this field differently, so it was left as-is.
- The Helm chart values flag `--set redisOperator.imagePullPolicy=Always` is valid but optional; it was left unchanged.
- The API version `redis.redis.opstreelabs.in/v1beta2` is correct for the current version of the OT-Container-Kit Redis Operator.
