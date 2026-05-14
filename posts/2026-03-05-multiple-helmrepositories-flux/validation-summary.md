# Validation Summary: How to Configure Multiple HelmRepositories in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller HelmRepository resources
- Flux helm-controller HelmRelease resources
- Flux kustomize-controller Kustomization resources
- Flux notification-controller Alert and Provider resources
- Kubernetes
- Helm and OCI Helm charts

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI documentation for `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- cert-manager Flux Helm Controller documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- ingress-nginx documentation and retirement notice: https://kubernetes.github.io/ingress-nginx/
- ingress-nginx deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- Bitnami OCI Helm chart announcement: https://blog.bitnami.com/2023/04/httpsblog.bitnami.com202304bitnami-helm-charts-now-oci.html

## Issues Found
- The notification examples used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Flux's current notification-controller documentation uses `notification.toolkit.fluxcd.io/v1beta3`, so both manifests were updated to `v1beta3`.
- The post presented ingress-nginx as part of a typical production stack without noting its announced retirement after March 2026. Added a short caveat that artifacts remain available, but new production clusters should evaluate a maintained ingress controller.
- The OCI HelmRepository examples were technically supported, but Flux currently recommends `OCIRepository` for new OCI chart sources and notes that `spec.interval` is ignored for `type: oci` HelmRepository objects. Added a concise caveat while keeping the existing examples intact.

## Review Notes
The main Flux API examples for `HelmRepository`, `HelmRelease`, and `Kustomization` are aligned with current Flux v1/v2 APIs. The `flux get sources helm -A` command is valid according to Flux CLI docs. Local `flux` and `kubectl` binaries were not installed in the review environment, so command verification was performed against official documentation rather than local help output.
