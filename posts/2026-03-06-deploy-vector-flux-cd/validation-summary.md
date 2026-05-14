# Validation Summary: How to Deploy Vector with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease and Kustomization APIs
- Vector
- Vector Helm chart
- Kubernetes
- Vector Remap Language (VRL)
- Elasticsearch
- Loki
- Prometheus Remote Write

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Vector Helm installation documentation: https://vector.dev/docs/setup/installation/package-managers/helm/
- Vector Helm chart repository index: https://helm.vector.dev/index.yaml
- Vector Helm chart values for chart `0.52.0`: https://github.com/vectordotdev/helm-charts/releases/download/vector-0.52.0/vector-0.52.0.tgz
- Vector deployment roles documentation: https://vector.dev/docs/setup/deployment/roles/
- Vector Kubernetes logs source documentation: https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/
- Vector host metrics source documentation: https://vector.dev/docs/reference/configuration/sources/host_metrics/
- Vector filter transform documentation: https://vector.dev/docs/reference/configuration/transforms/filter/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector sink documentation: https://vector.dev/docs/reference/configuration/sinks/vector/
- Vector Loki sink documentation: https://vector.dev/docs/reference/configuration/sinks/loki/
- Vector Prometheus remote write sink documentation: https://vector.dev/docs/reference/configuration/sinks/prometheus_remote_write/
- Vector VRL function reference: https://vector.dev/docs/reference/vrl/functions/
- Vector CLI documentation: https://vector.dev/docs/reference/cli/
- Vector 0.55.0 release notes: https://vector.dev/releases/0.55.0/

## Issues Found
- The post pinned the Vector Helm chart to `0.35.x`, which is outdated for a current 2026 review. Updated the examples to `0.52.x`, the current chart line found in the official Helm repository.
- The prerequisite Kubernetes version was `v1.26 or later`, but the current Vector Helm chart `0.52.0` declares `kubeVersion: >=1.28.0-0`. Updated the prerequisite to Kubernetes `v1.28 or later`.
- The aggregator section described a StatefulSet but configured `role: Stateless-Aggregator`, which the official chart deploys as a Deployment. Changed the role to `Aggregator`, which deploys as a StatefulSet.
- The aggregator persistence setting used `storageClass`, but the official chart value is `persistence.storageClassName`. Updated the field name.
- The aggregator routed logs and metrics from the same `vector_agents` source into log-only and metric-only sinks. Added `logs_only` and `metrics_only` filter transforms using Vector's `is_log` and `is_metric` condition types, then wired the namespace route and Prometheus remote write sink to the correct event streams.
- The default route condition matched production and system logs too, despite the comment saying "Everything else." Updated the condition to exclude production and kube-system namespaces.
- The JSON parsing VRL merged parsed data without confirming that the parsed value was an object. Added an `is_object(parsed)` check before `merge`.
- The `redact` VRL call used an invalid `patterns` argument. Updated it to use the documented `filters: [regex]` form.
- The verification commands used `/api/health` and `/api/graphql`. Vector's HTTP health endpoint is `/health`, and Vector 0.55 removes GraphQL in favor of gRPC. Replaced the commands with a port-forwarded `/health` check and a recent logs check.
- The Flux Kustomization used `wait: true` together with explicit `healthChecks`. Flux documents that `healthChecks` are ignored when `wait` is true, so the redundant `wait` field was removed.

## Review Notes
The guide is now aligned with the current Vector Helm chart and Flux APIs as of 2026-05-14. The downstream Elasticsearch, Loki, and VictoriaMetrics service names remain environment-specific placeholders that users must adapt to their own clusters.
