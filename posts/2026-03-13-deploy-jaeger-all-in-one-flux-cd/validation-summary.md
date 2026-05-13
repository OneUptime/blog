# Validation Summary: Deploy Jaeger All-in-One with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository
- Kustomization
- cert-manager
- Jaeger Operator
- Jaeger all-in-one
- OpenTelemetry Protocol (OTLP)
- Prometheus metrics

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- cert-manager Flux Helm Controller documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Helm chart values: https://github.com/cert-manager/cert-manager/blob/master/deploy/charts/cert-manager/values.yaml
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger Operator API documentation: https://github.com/jaegertracing/jaeger-operator/blob/main/docs/api.md
- Jaeger Operator compatibility matrix: https://github.com/jaegertracing/jaeger-operator/blob/main/COMPATIBILITY.md
- Jaeger Helm chart repository index: https://jaegertracing.github.io/helm-charts/index.yaml
- Jaeger Operator chart values for 2.57.0: https://github.com/jaegertracing/helm-charts/releases/download/jaeger-operator-2.57.0/jaeger-operator-2.57.0.tgz
- Jaeger CLI flags for OTLP defaults: https://www.jaegertracing.io/docs/1.76/deployment/cli/

## Issues Found
- The cert-manager HelmRelease referenced a `jetstack` HelmRepository that was not defined. Added the Flux `HelmRepository` using cert-manager's documented OCI chart repository.
- The cert-manager example used `installCRDs: true`, which is deprecated in current cert-manager chart values. Changed it to `crds.enabled: true` so Flux installs and upgrades CRDs as documented.
- The examples placed Flux-managed resources in the `cert-manager` and `observability` namespaces without declaring those namespaces. Added `Namespace` manifests to make the examples apply cleanly.
- The Jaeger Operator Helm values included `metrics.prometheusRule.enabled` and `metrics.serviceMonitor.enabled`, but the official Jaeger Operator chart values do not define those settings. Removed the unsupported values.
- The best-practices section claimed the chart-created ServiceMonitor should be enabled. Updated it to recommend scraping Jaeger metrics endpoints or creating a ServiceMonitor when using Prometheus Operator.
- The Flux Kustomization custom resource was shown as `clusters/my-cluster/jaeger/kustomization.yaml` while reconciling `./clusters/my-cluster/jaeger`. A file named `kustomization.yaml` in that path would be treated as Kustomize build configuration, not just a plain manifest. Changed the example location to `clusters/my-cluster/flux-system/jaeger-kustomization.yaml`.
- Clarified that the Jaeger Operator already creates the `jaeger-allinone-collector` service with OTLP ports, and that the extra service is an optional stable OTLP-only endpoint.

## Review Notes
The YAML snippets parse successfully. Local `helm`, `kubectl`, and `flux` binaries were not installed in the review environment, so CLI-based rendering or server-side dry-run validation was not performed. Jaeger Operator is valid for Jaeger 1.x, while current Jaeger 2.x Kubernetes guidance also points users toward the OpenTelemetry Operator; a future post may want to cover that newer deployment path separately.
