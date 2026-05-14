# Validation Summary: How to Install Flagger with Flux CD

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flagger
- Flux CD Helm Controller and Source Controller
- Kubernetes manifests and Custom Resource Definitions
- Helm and HelmRepository / HelmRelease resources
- Prometheus
- NGINX Ingress
- Istio
- Linkerd and Gateway API
- Grafana

## Sources Consulted
- Flagger install with Flux: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger install on Kubernetes: https://fluxcd.io/flagger/install/flagger-install-on-kubernetes/
- Flagger Helm chart values: https://github.com/fluxcd/flagger/blob/main/charts/flagger/values.yaml
- Flagger load tester chart values and manifests: https://github.com/fluxcd/flagger/tree/main/charts/loadtester
- Flagger Linkerd canary deployment tutorial: https://docs.flagger.app/main/tutorials/linkerd-progressive-delivery
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository / HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flagger Helm repository index: https://flagger.app/index.yaml

## Issues Found
- The Flagger HelmRelease examples pinned `version: "1.37.x"`, which is outdated. Updated them to `version: "1.x"` so Flux can select the latest stable Flagger 1.x release.
- The Flagger HelmRelease examples did not explicitly configure CRD install and upgrade behavior. Added `install.crds: CreateReplace` and `upgrade.crds: CreateReplace`, matching the current Flux-based Flagger install guidance.
- The Istio Helm values included `istio.kubeconfig.secretName`, which is not a current Flagger chart value and would be ignored. Removed that block.
- The Linkerd example used `meshProvider: linkerd`. Current Flagger Linkerd guidance uses the Gateway API provider and creates a Linkerd authorization policy for Prometheus access. Updated it to `meshProvider: gatewayapi:v1beta1` and added `linkerdAuthPolicy.create: true`.
- The Grafana HelmRelease used `dashboard.enabled`, which is not a value in the Flagger Grafana chart. Removed the unsupported value.
- The load tester image was pinned to `ghcr.io/fluxcd/flagger-loadtester:0.31.0`, while the current chart and manifests use `0.37.0`. Updated the image tag.
- The test Canary omitted `spec.service.port`, which Flagger uses to generate services and routing objects. Added `service.port: 8080` and clarified that the referenced `test-app` Deployment must already exist and expose that port.

## Review Notes
- The post still uses the legacy HTTP Helm repository at `https://flagger.app`, which remains valid. Current Flagger Flux documentation prefers OCI Helm artifacts from `ghcr.io/fluxcd/charts` with optional Cosign verification; that would be a good future modernization but was not required for correctness.
