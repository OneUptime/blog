# Validation Summary: How to Deploy Redis Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Spotahome Redis Operator
- Redis Sentinel
- Kubernetes
- Flux CD
- HelmRelease and HelmRepository resources
- Kustomize
- Prometheus Redis exporter
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Flux HelmRelease API v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository and HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization API v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Spotahome Redis Operator README: https://github.com/spotahome/redis-operator
- Spotahome Redis Operator Helm chart index: https://spotahome.github.io/redis-operator/index.yaml
- Spotahome Redis Operator chart values and templates: https://github.com/spotahome/redis-operator/tree/master/charts/redisoperator
- Spotahome RedisFailover examples and CRD schema: https://github.com/spotahome/redis-operator/tree/master/example/redisfailover
- Spotahome Redis Operator service generation code: https://github.com/spotahome/redis-operator/blob/master/operator/redisfailover/service/generator.go
- Prometheus Redis exporter README: https://github.com/oliver006/redis_exporter

## Issues Found
- The post described the Spotahome operator as managing Redis Cluster deployments. The operator manages RedisFailover resources with Sentinel-based failover, so the description, introduction, and conclusion were corrected to say Redis failover deployments.
- The Helm values included `rbac.create`, which is not a value used by the Spotahome chart. Removed the ignored field and clarified that RBAC is created with `serviceAccount.create`.
- The repository tree omitted files that later steps referenced. Added `redis-kustomization.yaml`, `service.yaml`, and `monitoring.yaml` to the tree.
- The custom `redis-master` Service selected all Redis pods, not only the master. Added the operator's `redisfailovers-role: master` selector and `app.kubernetes.io/part-of: redis-failover` label selector.
- The custom Sentinel Service selector was incomplete. Added `app.kubernetes.io/part-of: redis-failover` to match the operator-generated Sentinel labels.
- The Redis exporter comment incorrectly said it connected through Sentinel while the configuration pointed at a Redis service. Updated the comment to match the actual Redis master service connection.
- Verification and troubleshooting commands used pod names that the operator does not create, such as `redis-cluster-sentinel-0` and `redis-cluster-redis-0`. Updated the Sentinel commands to discover a Sentinel pod by label and corrected the Redis StatefulSet pod name to `rfr-redis-cluster-0`.

## Review Notes
The Flux API versions used in the post are current. The Spotahome chart version range `3.3.x` currently resolves to chart `3.3.0`, whose app version is Redis Operator `1.3.0`; that chart is older but still matches the upstream chart repository and Kubernetes version constraint.
