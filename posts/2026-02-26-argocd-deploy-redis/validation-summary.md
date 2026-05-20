# Validation Summary: How to Deploy Redis with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis Cluster
- Kubernetes Deployments, StatefulSets, Services, PersistentVolumeClaims, ConfigMaps, and Jobs
- Argo CD Applications, sync waves, hooks, automated sync, and sync options
- Helm
- Bitnami Redis Helm chart
- Prometheus Redis Exporter

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Bitnami Redis Helm chart documentation: https://artifacthub.io/packages/helm/bitnami/redis/18.6.1
- Redis Exporter documentation: https://github.com/oliver006/redis_exporter

## Issues Found
- The persistent Redis Deployment example had a `spec.selector.matchLabels` value but no matching `spec.template.metadata.labels`. Kubernetes `apps/v1` Deployments require the selector to match the pod template labels, or the API rejects the resource. Added `template.metadata.labels.app: redis`.
- The PVC example used only `argocd.argoproj.io/sync-options: Prune=false`. That prevents pruning during sync, but Argo CD documents `Delete=false` separately for retaining resources when an Application is deleted. Added `Delete=false` to make the persistent data protection accurate.

## Review Notes
- The Redis configuration directives, Redis Cluster bus port, Sentinel failover description, Argo CD hook and sync-wave annotations, automated sync fields, and Redis Exporter `REDIS_ADDR` usage are technically accurate.
- The Redis and Redis Exporter image tags are pinned to older but still valid versions. Future updates could refresh them after compatibility testing.
