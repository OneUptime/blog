# Validation Summary: Deploying Redis Cluster on Kubernetes with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis Cluster
- Kubernetes
- Helm
- Bitnami Redis Helm chart
- Bitnami Redis Cluster Helm chart
- Prometheus ServiceMonitor and PrometheusRule
- redis-py
- ioredis

## Sources Consulted
- Bitnami Redis Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml
- Bitnami Redis Helm chart templates and notes: https://github.com/bitnami/charts/tree/main/bitnami/redis/templates
- Bitnami Redis Cluster Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis-cluster/values.yaml
- Bitnami Redis Cluster Helm chart templates: https://github.com/bitnami/charts/tree/main/bitnami/redis-cluster/templates
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis configuration reference: https://github.com/redis/redis/blob/unstable/redis.conf
- redis-py Sentinel source and docs: https://github.com/redis/redis-py/blob/master/redis/sentinel.py and https://redis.readthedocs.io/en/latest/connections.html
- ioredis documentation: https://github.com/redis/ioredis
- Kubernetes kubectl cp examples: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubectl/pkg/cmd/cp/cp.go

## Issues Found
- The production values used `master.podDisruptionBudget` and `replica.podDisruptionBudget`, but the current Bitnami Redis chart uses `master.pdb` and `replica.pdb`. Updated both keys.
- The Sentinel production snippet placed `down-after-milliseconds`, `failover-timeout`, and `parallel-syncs` under `sentinel.configuration` without the required Redis Sentinel directive syntax. Replaced them with the chart's typed values: `downAfterMilliseconds`, `failoverTimeout`, and `parallelSyncs`.
- The Redis Cluster values used `redis.configuration`, but the Bitnami Redis Cluster chart uses `redis.configmap` for additional Redis configuration. Updated the field name.
- The redis-py Sentinel example passed `password` to the Sentinel constructor, which authenticates Redis node connections but not Sentinel connections. Updated the example to use `sentinel_kwargs` for Sentinel authentication and kept `password` on `master_for` and `slave_for`.
- The ioredis JavaScript example redeclared `const redis` in the same code block, which is a syntax error if copied into one file. Renamed the Sentinel client variable to `sentinelRedis`.
- The backup CronJob referenced `redis-backup-pvc` without noting that the PVC is not created by the shown manifest. Added a short comment clarifying that the PVC must be created separately or replaced by an object-storage flow.
- The Sentinel troubleshooting commands omitted authentication even though the chart enables Sentinel auth by default when Redis auth is enabled. Added `-a $REDIS_PASSWORD` to the Sentinel CLI commands.

## Review Notes
The Helm and Kubernetes CLIs were not installed locally, so command verification used official chart source, templates, and upstream CLI documentation instead of local `helm` or `kubectl --help` output. Some commands remain deployment-mode specific, such as `redis-master` service and pod references for non-Sentinel deployments versus `redis-node` and `redis` service references for Sentinel-enabled deployments.
