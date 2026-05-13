# Validation Summary: How to Use Apps and Infrastructure Separation in Flux Repository

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux Kustomization
- Flux HelmRelease
- Flux Source Controller resources
- Kubernetes
- cert-manager
- Helm
- GitOps repository structure

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The cert-manager HelmRelease example used `version: "1.14.x"` and `values.installCRDs: true`. That value is correct for cert-manager v1.14, but current cert-manager Helm documentation uses `crds.enabled: true` for recent chart versions. Updated the example to `version: "v1.20.x"` and `values.crds.enabled: true`.
- The ClusterIssuer HTTP-01 solver used `ingress.class: nginx`. cert-manager still documents this field, but recommends `ingressClassName` for most ingress controllers, including nginx, with `class` primarily recommended for ingress-gce compatibility. Updated the solver to `ingress.ingressClassName: nginx`.

## Review Notes
The Flux Kustomization `dependsOn`, `wait`, `timeout`, source references, HelmRepository API version, and HelmRelease CRD policies are consistent with current Flux documentation. The Jetstack HTTP Helm repository remains available, although cert-manager currently recommends OCI charts for recent versions.
