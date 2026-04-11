# Validation Summary: How to Use Bitnami Redis Helm Chart in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Kubernetes
- Helm 3
- Bitnami Redis Helm Chart (bitnami/redis)
- Bitnami Redis Cluster Helm Chart (bitnami/redis-cluster)
- Redis Sentinel
- Prometheus / redis-exporter
- Python redis-py library

## Sources Consulted
- Bitnami Redis Helm chart documentation and values reference (https://github.com/bitnami/charts/tree/main/bitnami/redis)
- Bitnami Redis Cluster Helm chart documentation (https://github.com/bitnami/charts/tree/main/bitnami/redis-cluster)
- Helm 3 CLI reference (https://helm.sh/docs/helm/)
- Kubernetes kubectl reference (https://kubernetes.io/docs/reference/kubectl/)
- redis-py Sentinel documentation (https://redis-py.readthedocs.io/en/stable/sentinel.html)

## Issues Found
1. **Invalid `master.count` parameter**: The `redis-values.yaml` example included `master.count: 1` under the `master` section. The Bitnami Redis Helm chart does not have a `master.count` parameter — there is always exactly one master node in a replication setup. This parameter would either be silently ignored or cause a validation error depending on chart version. **Fix**: Removed the `count: 1` line from the master configuration block.

## Review Notes
- The "Connecting from Applications" section shows checking for a `redis-master` service when using sentinel mode. With sentinel enabled, the Bitnami chart may not create a `redis-master` service (service naming depends on chart version). The Python example correctly uses sentinel discovery, which is the right approach. Users should rely on sentinel-based connection rather than direct master service access.
- The intro uses the term "Master/slave replication" while Redis has officially deprecated "slave" in favor of "replica" terminology. The chart itself uses "replication" architecture. This is a terminology preference rather than a technical error.
- The `metrics.image.tag: latest` in the Prometheus metrics section works but is not a best practice for production — pinning to a specific version is recommended.
- All Helm commands use Helm 3 syntax (no `--name` flag), which is current and correct.
