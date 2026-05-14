# Validation Summary: How to Use HelmRelease for Deploying cert-manager with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRepository
- Flux HelmRelease
- Kubernetes
- Helm
- cert-manager
- Let's Encrypt ACME
- Kubernetes Ingress
- TLS certificates

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease v2 API source: https://github.com/fluxcd/helm-controller/blob/main/api/v2/helmrelease_types.go
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.16 Helm chart values: https://github.com/cert-manager/cert-manager/blob/v1.16.5/deploy/charts/cert-manager/values.yaml
- cert-manager HTTP-01 ACME solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- Jetstack Helm chart repository index: https://charts.jetstack.io/index.yaml

## Issues Found
- The HelmRelease used `install.atomic` and `upgrade.atomic`, but Flux HelmRelease v2 does not define an `atomic` field for install or upgrade configuration. Removed both fields and the related install comment. Flux failure handling is configured through remediation fields such as `install.remediation` and `upgrade.remediation`.
- The example described PodDisruptionBudgets for high availability but only configured the controller-level `podDisruptionBudget`. Added `webhook.podDisruptionBudget` and `cainjector.podDisruptionBudget` with `minAvailable: 1`, matching cert-manager chart values and HA guidance for deployments with more than one replica.

## Review Notes
- The Jetstack HTTP Helm repository at `https://charts.jetstack.io` is still available, but current cert-manager documentation recommends the OCI chart registry for recent cert-manager versions because it is the source of truth and receives releases first.
- The local workspace did not have `helm`, `flux`, or `kubectl` installed, so CLI behavior was checked against official documentation and upstream API/chart sources instead of local `--help` output.
