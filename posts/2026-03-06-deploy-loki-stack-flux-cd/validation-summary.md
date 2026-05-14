# Validation Summary: How to Deploy Loki Stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Grafana Loki Helm chart
- Promtail
- Flux CD HelmRelease and Kustomization
- Kubernetes manifests and Secrets
- SOPS with age
- S3-compatible object storage
- LogQL ruler alerts

## Sources Consulted
- Grafana Loki Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki Helm chart components: https://grafana.com/docs/loki/latest/setup/install/helm/concepts/
- Grafana Loki AWS Helm deployment guide: https://grafana.com/docs/loki/latest/setup/install/helm/deployment-guides/aws/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Loki Helm chart values.yaml: https://raw.githubusercontent.com/grafana/loki/main/production/helm/loki/values.yaml
- Grafana Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Promtail Helm chart values.yaml: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/promtail/values.yaml
- Grafana Loki LogQL metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- SOPS README: https://github.com/getsops/sops

## Issues Found
- The post described `SimpleScalable` as microservices mode and production-ready. Updated the wording to match Grafana's current chart documentation: Simple Scalable deploys read, write, and backend targets, is being deprecated before Loki 4.0, and microservices mode is recommended for larger production workloads.
- The Loki S3 values mixed chart-level `loki.storage.bucketNames` with invalid runtime keys under `loki.storage.s3`, including `bucketnames` and `sse_encryption`. Replaced this with `loki.storage_config.aws` for Loki runtime configuration and kept `loki.storage.bucketNames` for Helm chart bucket configuration.
- The S3 Secret was created but not referenced by the Loki HelmRelease. Added `global.extraEnvFrom` and `-config.expand-env=true`, then referenced the AWS credential environment variables in `loki.storage_config.aws`.
- The Promtail sections treated Promtail as a current default agent. Updated the wording to note that Promtail reached EOL on March 2, 2026 and should only be used for legacy environments.
- The Flux Kustomization example lived in the same path it reconciled and used `targetNamespace: logging`, which could incorrectly rewrite namespaces for resources such as the `HelmRepository` in `flux-system`. Moved the example path comment outside the reconciled directory and removed `targetNamespace`.
- The ruler example created a standalone ConfigMap that the Loki chart would not automatically load. Replaced it with a Helm values snippet using `loki.rulerConfig.storage` and `ruler.directories`.
- The readiness check used `kubectl exec` against a Service, which is not a valid exec target. Replaced it with `kubectl port-forward` to the gateway Service and a `curl` readiness check.
- The ring-status port-forward targeted `loki-write`; in Simple Scalable mode the ring endpoint is more appropriate through the backend target. Updated the command to forward `svc/loki-backend`.

## Review Notes
- The guide still uses Promtail because the original article is Promtail-based, but new deployments should prefer Grafana Alloy.
- The S3 credential approach is valid for static keys, but cloud-native identity such as IRSA should be preferred on EKS where available.
- The YAML snippets were parsed after edits to catch syntax errors.
