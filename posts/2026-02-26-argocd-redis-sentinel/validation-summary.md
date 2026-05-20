# Validation Summary: How to Configure ArgoCD Redis Sentinel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Helm chart
- Redis HA and Redis Sentinel
- Kubernetes ConfigMaps, Services, and StatefulSets
- redis-cli
- Prometheus
- redis_exporter

## Sources Consulted
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- DandyDeveloper redis-ha Helm chart values: https://github.com/DandyDeveloper/charts/blob/master/charts/redis-ha/values.yaml
- DandyDeveloper redis-ha Helm templates: https://github.com/DandyDeveloper/charts/tree/master/charts/redis-ha/templates
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis REPLICAOF command reference: https://redis.io/docs/latest/commands/replicaof/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- redis_exporter README and source: https://github.com/oliver006/redis_exporter

## Issues Found
- The Argo CD `redis-ha` values example used `sentinel.enabled: true`, but the current redis-ha subchart does not expose that setting. I removed it and added the correct `sentinel.quorum: 2` value.
- The post said Sentinel quorum is auto-calculated from replica count. The redis-ha chart exposes quorum as an explicit value, so I removed that claim.
- The manual Kubernetes Sentinel example mounted `sentinel.conf` directly from a ConfigMap. Sentinel rewrites its configuration file, while ConfigMap volume contents are exposed as read-only files. I changed the example to copy the ConfigMap into a writable `emptyDir` before starting Sentinel.
- The manual StatefulSet used `serviceName` without defining the governing headless Service. I added the matching headless Service manifest.
- The split-brain recovery command used `SLAVEOF`. Redis Open Source 5.0+ provides `REPLICAOF` for this operation, so I updated the command.
- The Prometheus scrape example targeted exporter port `9121` as if it were the Sentinel endpoint. I changed it to use redis_exporter's documented `/scrape` pattern with Sentinel targets on port `26379`.
- The `RedisSentinelMasterDown` alert used a non-existent `status` label. redis_exporter emits `redis_sentinel_master_status` with the `master_status` label, so I corrected the expression.

## Review Notes
- The remaining Redis Sentinel commands and configuration directives (`sentinel monitor`, `down-after-milliseconds`, `failover-timeout`, `parallel-syncs`, `SENTINEL master`, `SENTINEL replicas`, `SENTINEL sentinels`, `SENTINEL get-master-addr-by-name`, `SENTINEL failover`, `SENTINEL reset`, and `SENTINEL set`) match the Redis Sentinel documentation.
- YAML snippets were parsed locally with PyYAML. `ruby` was not installed in the workspace, so Ruby-based YAML validation was not available.
