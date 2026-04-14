# Validation Summary: How to Use Dapr with k3s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- k3s (lightweight Kubernetes distribution)
- Helm (Kubernetes package manager)
- Redis (in-memory data store, via bitnami Helm chart)
- Python (sensor data collector example)
- containerd (container runtime)

## Sources Consulted
- Dapr Helm chart documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr CLI status command reference: https://docs.dapr.io/reference/cli/dapr-status/
- k3s Quick-Start Guide: https://docs.k3s.io/quick-start
- k3s packaged components: https://docs.k3s.io/installation/packaged-components
- k3s architecture (containerd): https://docs.k3s.io/architecture
- bitnami Redis Helm chart: https://github.com/bitnami/charts/blob/main/bitnami/redis/README.md
- bitnami Redis master service template: https://github.com/bitnami/charts/blob/main/bitnami/redis/templates/master/service.yaml

## Issues Found

1. **Misleading text about container runtime** (line 30): The original text said "k3s uses containerd, so specify the container runtime when installing Dapr" but the Helm command that follows does not specify any container runtime — Dapr's Helm chart works with containerd out of the box. This contradicted the post's own summary section. Changed to: "k3s uses containerd, which works out of the box with Dapr's Helm installation."

2. **Incorrect Redis service hostname** (line 112): The Dapr state store component referenced `redis.default.svc.cluster.local:6379`, but the bitnami/redis Helm chart (installed with `helm install redis bitnami/redis`) creates a master service named `redis-master`, not `redis`. The correct hostname is `redis-master.default.svc.cluster.local:6379`. Fixed the value accordingly.

## Review Notes
- The Helm values `dapr_placement.replicaCount=1` and `dapr_scheduler.replicaCount=1` may have no effect since these components run as StatefulSets whose replica count is controlled differently (e.g., via `dapr_placement.ha`). However, setting them does not cause errors — they are silently ignored when not applicable. Since `global.ha.enabled=false` is already set (which keeps replicas at 1), the net effect is correct.
- The k3s install command uses `--disable traefik` (space-separated). Official docs prefer `--disable=traefik` (with equals sign). Both forms are accepted by the CLI parser, so this is not an error.
- The Python example uses `data=json.dumps(event)` instead of the more idiomatic `json=event` parameter in the requests library. Both are functionally correct.
- The post does not specify Dapr or k3s version numbers, which means it should remain broadly applicable across recent versions. The `dapr_scheduler` component was introduced in Dapr 1.14+, so this post implicitly targets Dapr 1.14 or later.
