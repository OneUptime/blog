# Validation Summary: How to Manage Istio with Helm Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- Argo CD
- GitOps
- helm-diff plugin

## Sources Consulted
- Istio official documentation: Install with Helm, https://istio.io/latest/docs/setup/install/helm/
- Istio official documentation: Supported Releases, https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30.0 official Helm chart values for istiod, https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio 1.30.0 official Helm chart values for gateway, https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/gateway/values.yaml
- Istio official MeshConfig reference, https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio official tracing documentation, https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Helm official documentation: helm upgrade, https://helm.sh/docs/helm/helm_upgrade/
- Helm official documentation: helm search repo, https://helm.sh/docs/helm/helm_search_repo/
- Argo CD official documentation: Multiple Sources for an Application, https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD official documentation: Helm values and value precedence, https://argo-cd.readthedocs.io/en/latest/user-guide/helm/

## Issues Found
- The examples pinned Istio chart version `1.24.0`, which is no longer supported as of the current Istio supported releases table. Updated the examples to `1.30.0`, the current supported release documented by Istio.
- The gateway chart description said gateways can be installed in any namespace. Istio documents that the gateway namespace must not have the `istio-injection=disabled` label, so the description now includes that caveat.
- The "Install with the custom values" command used `helm install istiod` after the guide had already installed an `istiod` release, which would fail because the release name is already in use. Changed it to `helm upgrade istiod`.
- The Argo CD Application example used both `spec.source` and `spec.sources`. Argo CD ignores `source` when `sources` is present, so the Helm chart source was moved into `sources`.

## Review Notes
- Helm and kubectl were not installed in the local environment, so CLI behavior was checked against official Helm and Istio documentation rather than local `--help` output.
- `meshConfig.enableTracing` remains supported, but Istio encourages the Telemetry API for tracing configuration in newer deployments.
