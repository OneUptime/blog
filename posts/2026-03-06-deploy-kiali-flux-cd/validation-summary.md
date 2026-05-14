# Validation Summary: How to Deploy Kiali with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kiali Operator
- Kiali Custom Resource
- Kubernetes
- Istio Gateway and VirtualService
- Prometheus Operator ServiceMonitor
- kubectl
- Helm

## Sources Consulted
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali Helm installation guide: https://kiali.io/docs/installation/installation-guide/install-with-helm/
- Kiali authentication documentation: https://kiali.io/docs/configuration/authentication/
- Kiali token authentication FAQ: https://kiali.io/docs/faq/authentication/
- Kiali health configuration documentation: https://kiali.io/docs/configuration/health/
- Kiali debugging and metrics documentation: https://kiali.io/docs/configuration/debugging-kiali/
- Kiali deployment options: https://kiali.io/docs/installation/deployment-options/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes Secret documentation for service account token Secrets: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- Updated Kiali namespace visibility from deprecated/removed `deployment.accessible_namespaces: ["**"]` to current `deployment.cluster_wide_access: true`.
- Updated Grafana and tracing integration fields from deprecated `url` / `in_cluster_url` to current `external_url` / `internal_url`.
- Added `provider: jaeger` for tracing and changed the internal Jaeger URL to the gRPC query port when `use_grpc: true` is enabled.
- Removed deprecated Istio integration fields such as `root_namespace`, `config_map_name`, `istiod_deployment_name`, and `istio_sidecar_injector_config_map_name`, replacing them with current Istio API settings.
- Moved clustering configuration from deprecated `kiali_feature_flags.clustering` to top-level `spec.clustering`.
- Replaced the custom health ConfigMap example with `spec.health_config`, which is where Kiali expects custom health thresholds.
- Corrected ServiceMonitor selector, port, and path to match Kiali's operator-created service labels and metrics endpoint.
- Replaced the long-lived service account token Secret example with `kubectl create token`, matching the recommended Kubernetes v1.24+ token workflow.
- Corrected the token-auth RBAC example to bind the service account to the Kiali-created ClusterRole instead of referencing a `kiali-viewer` ClusterRole that may not exist.

## Review Notes
The Flux `HelmRelease`, `HelmRepository`, and `Kustomization` API versions and core fields are current. Because the Kiali CRD is installed by the operator chart, applying the operator and Kiali custom resource from the same Flux path may produce a transient first-reconcile failure until the CRD exists; a future improvement would be to split operator and instance manifests into separate Flux Kustomizations with an explicit dependency.
