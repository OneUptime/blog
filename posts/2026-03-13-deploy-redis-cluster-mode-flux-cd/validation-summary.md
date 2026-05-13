# Validation Summary: How to Deploy Redis Cluster Mode with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- OpsTree Redis Operator
- Kubernetes custom resources, Secrets, ConfigMaps, StatefulSets, PodDisruptionBudgets, and PVCs
- Flux CD Kustomization
- kubectl
- redis-cli

## Sources Consulted
- Redis Cluster scaling documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- OpsTree Redis Operator cluster documentation: https://docs.opstreelabs.in/redis-operator/setup/cluster
- OpsTree Redis Operator RedisCluster CRD and v1beta2 example manifests: https://github.com/OT-CONTAINER-KIT/redis-operator
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- Redis Cluster was described as using consistent hashing. Redis documentation says Redis Cluster uses hash-slot sharding with 16,384 hash slots, so the introduction now uses that terminology.
- The RedisCluster manifest placed `additionalRedisConfig` under top-level `spec.redisConfig`. In the current OpsTree Redis Operator cluster implementation, external ConfigMaps are mounted from `redisLeader.redisConfig.additionalRedisConfig` and `redisFollower.redisConfig.additionalRedisConfig`, so the manifest now sets the ConfigMap in both role sections.
- The RedisCluster manifest did not include a persistent node configuration volume. The current v1beta2 OpsTree example includes `storage.nodeConfVolume` with `nodeConfVolumeClaimTemplate`, so the snippet now includes it to persist cluster node configuration.
- A comment labeled `clusterVersion` as "Replicas per primary shard." The comment now correctly identifies it as the Redis major version.
- The verification command selected pods with `app=redis-cluster`, but the operator labels leader and follower pods with role-specific `app` values and a shared `cluster=redis-cluster` label. The command now uses `-l cluster=redis-cluster`.

## Review Notes
The Flux `Kustomization` fields, Kubernetes Secret and PVC syntax, Redis configuration directives, and `redis-cli` cluster commands are valid. The post assumes the Redis Operator is installed in the `redis` namespace; that can work, but many OpsTree examples install the operator into `redis-operator`, so the namespace should match the reader's installation.
