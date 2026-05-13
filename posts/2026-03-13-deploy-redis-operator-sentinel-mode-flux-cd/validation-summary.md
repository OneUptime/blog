# Validation Summary: How to Deploy Redis Operator with Sentinel Mode via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Kustomization resources
- OpsTree Redis Operator
- RedisReplication CRD
- Redis Sentinel
- Redis configuration and persistence

## Sources Consulted
- OpsTree Redis Operator installation documentation: https://ot-container-kit.github.io/redis-operator/guide/installation.html
- OpsTree Redis Operator Helm chart index: https://ot-container-kit.github.io/helm-charts/index.yaml
- OpsTree Redis Operator v0.24.0 Helm chart and CRDs: https://github.com/OT-CONTAINER-KIT/helm-charts/releases/download/redis-operator-0.24.0/redis-operator-0.24.0.tgz
- OpsTree Redis Operator source code for RedisReplication embedded Sentinel behavior: https://github.com/OT-CONTAINER-KIT/redis-operator
- Flux HelmRelease documentation: https://v2-0.docs.fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found
- The `redis-operator` Helm chart version `0.15.1` is not present in the official OpsTree Helm repository. Updated the example to use chart version `0.24.0`, which is present in the repository.
- The RedisReplication Sentinel example used `redisSentinel.replicas` and a nested `sentinelConfig` block. The current OpsTree RedisReplication CRD uses `spec.sentinel.size` with Sentinel fields directly under `spec.sentinel`, so the YAML was corrected.
- The embedded RedisReplication Sentinel implementation uses the master group name `mymaster` and computes quorum from the Sentinel size. Removed unsupported or misleading `masterGroupName`, `redisPort`, and explicit `quorum` fields from the embedded Sentinel example.
- The verification commands referenced `redis-replication-sentinel-0`, but the embedded Sentinel StatefulSet name is generated as `<redisreplication-name>-s`. Updated the commands to use `redis-replication-s-0`.
- The additional Redis ConfigMap used the key `redis-config`, but the operator's default external include path expects `redis-additional.conf` when `additionalRedisConfig` mounts the ConfigMap. Updated the ConfigMap key accordingly.
- The best-practices text referenced `redisSentinel.replicas` and a manual quorum field. Updated it to reference `sentinel.size` and the operator's computed quorum behavior.

## Review Notes
YAML snippets were parsed successfully after the fixes. The Flux examples use current `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1` APIs. The `dependsOn` example assumes a separate Flux Kustomization named `redis-operator-install` is present to install the operator before the RedisReplication resource is applied.
