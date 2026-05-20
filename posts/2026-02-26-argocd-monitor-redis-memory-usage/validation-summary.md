# Validation Summary: How to Monitor ArgoCD Redis Memory Usage

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Argo CD
- Kubernetes
- Redis
- redis_exporter
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana
- OneUptime

## Sources Consulted
- Argo CD high availability and scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD install manifests: https://github.com/argoproj/argo-cd/blob/master/manifests/install.yaml
- Argo CD Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- redis_exporter README and source metric mapping: https://github.com/oliver006/redis_exporter
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The direct `redis-cli INFO memory` command did not account for current Argo CD Redis authentication. Updated it to use the `REDIS_PASSWORD` environment variable already present in the Redis pod.
- The Helm chart values used `redis.metrics.image` and `redis.metrics.resources`, but current `argo-cd` chart values configure the exporter sidecar under `redis.exporter.*` and the metrics service under `redis.metrics.*`. Updated the values snippet and current exporter image location/tag.
- The plain Kubernetes Deployment example was not valid `apps/v1` because it omitted `spec.selector` and pod template labels. Added matching selector and labels.
- Redis command-line arguments in Kubernetes `args` were grouped as strings containing spaces. Split them into separate arguments to match the container argv format used by the official Argo CD manifests.
- The plain manifest sidecar example did not pass Redis authentication to Redis or redis_exporter. Added `--requirepass $(REDIS_PASSWORD)` and the matching secret-backed `REDIS_PASSWORD` environment variables.
- The post described `redis_memory_max_bytes` as peak memory usage. In redis_exporter this metric is the configured `maxmemory` limit; the peak metric is `redis_memory_used_peak_bytes`. Updated the metric list and Grafana panel.
- The high-memory alert could fire incorrectly when Redis had no `maxmemory` limit because `redis_memory_max_bytes` is `0` in that case. Added a guard requiring `redis_memory_max_bytes > 0`.

## Review Notes
- The sizing table remains a rule-of-thumb rather than an official Argo CD sizing guarantee; production values should be tuned from observed cache size, application count, manifest size, and reconciliation behavior.
- The ServiceMonitor example assumes the Prometheus Operator is configured to discover ServiceMonitors in the `argocd` namespace.
