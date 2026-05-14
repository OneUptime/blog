# Validation Summary: How to Deploy Redis Streams with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams
- Redis Sentinel
- Redis CLI
- Bitnami Redis Helm chart
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Namespace, Secret, Job, NetworkPolicy, StatefulSet, and PVC resources
- Prometheus ServiceMonitor

## Sources Consulted
- Bitnami Redis Helm chart README and chart 19.6.4 templates/values: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Bitnami Helm chart repository index: https://charts.bitnami.com/bitnami/index.yaml
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Redis Streams command documentation for XADD and XGROUP CREATE: https://redis.io/docs/latest/commands/xadd/ and https://redis.io/docs/latest/commands/xgroup-create/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Kubernetes NetworkPolicy, Secret, and Job documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/, https://kubernetes.io/docs/concepts/configuration/secret/, and https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The HelmRepository comment described `https://charts.bitnami.com/bitnami` as an OCI registry. Flux treats that URL as a Helm HTTP/S repository, so the comment was corrected.
- The HelmRelease enabled Sentinel but the examples assumed the normal `redis-master` service and `redis-master`/`redis-replicas` workloads. In Bitnami Redis chart 19.x, Sentinel mode exposes a `redis` service by default and uses `redis-node` pods. The Helm values now enable the Sentinel current-master service with RBAC, and the verification and troubleshooting commands now use `redis-node-0` containers with the `redis-master` service.
- The Flux Kustomization health checks referenced StatefulSets that do not match the Sentinel deployment shape. The health check now targets the `HelmRelease`, which is the Flux-managed resource.
- The Redis Streams configuration comment incorrectly implied that `stream-node-max-bytes` and `stream-node-max-entries` set stream trimming limits. The text now explains that these tune stream macro-node sizing and points readers to `XADD MAXLEN` or `XTRIM` for length enforcement.
- The initialization job used `redis-cli -a` repeatedly and would report success even if intermediate commands failed. It now uses `REDISCLI_AUTH` and `set -e`.
- The NetworkPolicy allowed UDP DNS only and blocked metrics scraping despite enabling `metrics.serviceMonitor`. TCP DNS and a Prometheus scraping ingress rule for port 9121 were added.
- The Sentinel log command used a label that is not applied by the Bitnami Sentinel pods. It now reads logs from the `sentinel` container in `redis-node-0`.
- The post enabled `metrics.serviceMonitor` without noting the Prometheus Operator CRD requirement. The prerequisite list now calls this out.

## Review Notes
The `storageClass: standard` examples remain cluster-dependent and may need adjustment for clusters that use a different default StorageClass. The chart version constraint `19.x` is valid for the legacy Bitnami Helm repository, but future maintenance should consider testing and updating the values against a current chart major version.
