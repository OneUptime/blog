# Validation Summary: How to Deploy Redis Cluster on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Redis Cluster
- Kubernetes StatefulSet, Service, ConfigMap, PersistentVolumeClaim, and CronJob manifests
- kubectl
- Helm
- Bitnami Redis Cluster Helm chart
- redis-py
- ioredis

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster scaling and operations guide: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py retry documentation: https://redis.readthedocs.io/en/stable/retry.html
- redis-py backoff documentation: https://redis.readthedocs.io/en/stable/backoff.html
- ioredis API documentation: https://ioredis.readthedocs.io/en/latest/API/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Bitnami Redis Cluster Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/redis-cluster/README.md
- Bitnami Redis Cluster Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis-cluster/values.yaml

## Issues Found
- The Kubernetes client service was labeled as "external access" even though the manifest uses `type: ClusterIP`, which only exposes the service inside the cluster. Changed the comment to "in-cluster access".
- The Bitnami Helm values placed CPU and memory settings under a top-level `resources` key. The current Bitnami Redis Cluster chart expects Redis container resources under `redis.resources`. Moved the resource block under `redis`.
- The Python example used the older third-party `redis-py-cluster` import and configuration style. Updated it to the current redis-py cluster API with `redis.cluster.RedisCluster`, `ClusterNode`, and `require_full_coverage=False`.
- The Python example used `cluster_error_retry_attempts`, which redis-py still supports but documents as deprecated. Replaced it with the documented `retry=Retry(ExponentialBackoff(), 3)` configuration.
- The scaling example scaled the StatefulSet from 6 to 9 replicas but only waited for and added `redis-cluster-6`. Updated the commands to wait for `redis-cluster-6`, `redis-cluster-7`, and `redis-cluster-8`, then add all three new pods as masters before rebalancing slots.
- The backup CronJob used a short service name and did not enable cluster-aware redirects. Updated the `redis-cli` command to use `-c` and the fully qualified StatefulSet pod DNS names.

## Review Notes
The manual manifests are suitable as an educational baseline, but production deployments should also add authentication/TLS, PodDisruptionBudgets, NetworkPolicies, explicit backup storage, and tested restore procedures.
