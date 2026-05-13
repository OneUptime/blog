# Validation Summary: How to Deploy Thanos Sidecar with Prometheus via Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRelease and Kustomization
- Kubernetes Services and Secrets
- kube-prometheus-stack Helm chart
- Prometheus Operator
- Prometheus TSDB retention and feature flags
- Thanos Sidecar, Query, Store Gateway, and Compactor
- S3-compatible object storage
- AWS CLI, kubectl, and Flux CLI verification commands

## Sources Consulted
- Prometheus Operator Thanos documentation: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack chart values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Bitnami Thanos chart values and templates: https://github.com/bitnami/charts/tree/main/bitnami/thanos
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/

## Issues Found
- The kube-prometheus-stack values snippet used `prometheus.prometheusSpec.thanos.objectStorageConfig.key/name` directly. For the chart version range shown, existing secrets must be configured under `objectStorageConfig.existingSecret`. Updated the snippet to use `existingSecret.key` and `existingSecret.name`.
- The Prometheus retention example and best-practice text recommended `2h` retention. Thanos Sidecar documentation recommends retention not lower than three times the 2-hour block duration for upload resilience. Updated the example and guidance to `6h`.
- The post described `exemplar-storage` as required for Thanos block uploads. It is a Prometheus exemplar feature flag, not a Thanos upload requirement. Updated the comment to mark it optional for exemplar collection.
- The S3 configuration comment described `sse_config` as compression. Thanos S3 `sse_config` configures server-side encryption. Updated the comment accordingly.
- The manually-created sidecar Service selector used a less reliable Prometheus label. Updated it to the selector label used by kube-prometheus-stack services, `operator.prometheus.io/name`.
- The Thanos chart example disabled Store Gateway and Compactor while the post claimed historical object-storage querying. Enabled Store Gateway and Compactor and configured them to reuse the object storage secret.
- The Flux health check used `thanos-query` as the Bitnami Thanos Query Deployment name. The chart names it `<release>-query`, so with release name `thanos-query` the Deployment is `thanos-query-query`. Updated the health check.
- The S3 verification command assumed blocks would appear under an external-label path. Thanos stores blocks at the bucket root unless a `prefix` is configured. Updated the command to list the bucket recursively from the root.
- The object-storage block age warning used a strict 2-hour threshold. Updated it to a more realistic 3-hour warning threshold for 2-hour block uploads.

## Review Notes
The examples are configuration snippets and were reviewed against current upstream documentation and chart templates rather than executed, because `helm`, `kubectl`, `flux`, and `aws` are not installed in this workspace. The Thanos image version `v0.35.0` is older than current Thanos releases but remains valid for the chart/version range used in the post.
