# Validation Summary: How to Use HelmRelease for Deploying Harbor with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes
- Helm
- Harbor
- PostgreSQL
- Redis
- Trivy
- Kubernetes Secrets
- Ingress

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux `bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `get helmreleases` command reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Harbor Helm chart repository documentation: https://github.com/goharbor/harbor-helm
- Harbor Helm chart values: https://raw.githubusercontent.com/goharbor/harbor-helm/main/values.yaml
- Harbor high availability Helm deployment documentation: https://goharbor.io/docs/main/install-config/harbor-ha-helm/
- Harbor project overview: https://goharbor.io/
- Harbor vulnerability scanning documentation: https://goharbor.io/docs/main/administration/vulnerability-scanning/

## Issues Found
- The original HelmRelease was placed in the `harbor` namespace while relying on `install.createNamespace: true`. A HelmRelease object cannot be created in a namespace that does not already exist, and Flux's `install.createNamespace` only applies to the Helm release target namespace. Changed the HelmRelease namespace to `flux-system` and added `targetNamespace: harbor`.
- The credentials Secret example was in the `harbor` namespace. Flux `valuesFrom` references must be in the same namespace as the HelmRelease, so the Secret namespace was changed to `flux-system`.
- The monitoring command checked HelmRelease status in the `harbor` namespace. Updated it to `flux get helmreleases -n flux-system` to match the corrected HelmRelease location.
- The prerequisites said Harbor requires Ingress for external access. The Harbor Helm chart supports ingress, clusterIP, nodePort, loadBalancer, and route exposure types, so the prerequisite was narrowed to the ingress-based configuration shown in the guide.
- The prerequisites recommended Kubernetes v1.26 or later. Current Flux support is version-specific and newer Flux releases require currently supported Kubernetes versions, while the Harbor chart has its own minimum. Reworded the prerequisite to require a Kubernetes version supported by the selected Flux version and Harbor chart.

## Review Notes
- The Flux and Helm CLIs were not installed in the local environment, so command syntax was verified against official command documentation rather than local `--help` output.
- The Harbor Helm values used for ingress, TLS secret source, persistence, internal database, internal Redis, external PostgreSQL, external Redis, Trivy, and component resources match the current Harbor chart values.
