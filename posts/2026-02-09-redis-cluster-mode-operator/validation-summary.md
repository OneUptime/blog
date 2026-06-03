# Validation Summary: How to Deploy Redis Cluster Mode on Kubernetes with Redis Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Redis Cluster
- Redis Operator by OT-CONTAINER-KIT / Opstree
- Kubernetes custom resources, StatefulSets, Services, Secrets, PVCs, probes, affinity, tolerations, and ServiceMonitor
- Helm
- kubectl
- redis-cli
- ioredis for Node.js
- redis-py for Python
- Prometheus Redis exporter metrics

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster scaling documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Operator installation docs: https://ot-container-kit.github.io/redis-operator/guide/installation.html
- Redis Operator cluster configuration docs: https://ot-container-kit.github.io/redis-operator/guide/redis-cluster-config.html
- Redis Operator v0.15.0 CRD examples: https://github.com/OT-CONTAINER-KIT/redis-operator/tree/v0.15.0/example
- Redis Operator v0.15.0 RedisCluster API type definitions: https://github.com/OT-CONTAINER-KIT/redis-operator/blob/v0.15.0/api/v1beta1/rediscluster_types.go
- Redis Operator v0.15.0 common API type definitions: https://github.com/OT-CONTAINER-KIT/redis-operator/blob/v0.15.0/api/v1beta1/common_types.go
- Redis Operator v0.15.0 service and label generation code: https://github.com/OT-CONTAINER-KIT/redis-operator/blob/v0.15.0/k8sutils/redis-cluster.go and https://github.com/OT-CONTAINER-KIT/redis-operator/blob/v0.15.0/k8sutils/labels.go
- ioredis cluster client documentation: https://github.com/redis/ioredis#cluster
- redis-py cluster documentation: https://redis-py.readthedocs.io/en/stable/clustering.html

## Issues Found
- The Helm install command used `redisOperator.image.tag`, but the chart value is `redisOperator.imageTag`. Updated the command and pinned `--version 0.15.0` so the chart, image tag, and v1beta1 CRD examples are aligned.
- The manifest install instructions applied local directories after cloning the default branch, which can drift from the v0.15.0 API used in the article. Updated the commands to apply v0.15.0 manifest URLs directly.
- The RedisCluster examples used unsupported top-level fields such as `redisConfig`, `securityContext`, `podDisruptionBudget`, `affinity`, `tolerations`, `livenessProbe`, and `readinessProbe`. Moved these to the supported `redisLeader`, `redisFollower`, and `podSecurityContext` fields according to the v0.15.0 API.
- The Redis config examples used a map-style `redisConfig`, but Redis Operator v0.15.0 expects external Redis configuration through a ConfigMap referenced by `additionalRedisConfig`. Added ConfigMaps and changed Redis directives to Redis config-file syntax.
- The cluster storage examples omitted `nodeConfVolumeClaimTemplate`, which the operator examples include for Redis Cluster node configuration persistence. Added the node-conf PVC template.
- The production service config used `type`; the operator CRD field is `serviceType`. Updated the field name.
- The production `clusterSize: 6` comment said it created six masters only. Updated it to clarify that `clusterSize` controls both leader and follower counts by default.
- The client examples and rebalance command used pod DNS names under `redis-prod.redis.svc.cluster.local`; the operator creates headless services named `<cluster>-leader-headless`. Updated the DNS names to `redis-prod-leader-*.redis-prod-leader-headless.redis.svc.cluster.local`.
- The ServiceMonitor selected `app: redis-cluster`, but generated services are labeled with role-specific app names and a shared `redis_setup_type: cluster` label. Updated the selector to use `redis_setup_type: cluster`.
- The backup script selected pods with `app=$CLUSTER_NAME`, but generated leader pods use `app=<cluster>-leader`. Updated the selector to `app=${CLUSTER_NAME}-leader`.

## Review Notes
- The Redis Cluster architecture claims are consistent with Redis documentation: 16,384 hash slots, client redirection/topology awareness, same-slot multi-key operations through hash tags, and replica promotion for failover.
- The Node.js and Python snippets were checked for syntax. The backup script was checked with `bash -n`, and all YAML snippets were parsed successfully.
- The post still uses Redis Operator v0.15.0 and Redis 7.0.12 examples. They are internally consistent after the fixes, but newer Redis Operator releases exist and may use newer CRD versions.
