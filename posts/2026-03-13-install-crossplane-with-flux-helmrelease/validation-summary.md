# Validation Summary: How to Install Crossplane with Flux HelmRelease

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Flux CD
- Kubernetes
- Helm
- Flux HelmRelease
- Flux HelmRepository
- Flux Kustomization
- GitOps

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane upgrade documentation: https://docs.crossplane.io/latest/guides/upgrade-crossplane/
- Crossplane Helm chart repository index: https://charts.crossplane.io/stable/index.yaml
- Crossplane Helm chart values for v2.2.1: https://charts.crossplane.io/stable/crossplane-2.2.1.tgz
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Helm API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI get command documentation: https://fluxcd.io/flux/cmd/flux_get/

## Issues Found
- The Crossplane chart version example used `1.15.x`, which is outdated for a 2026 installation guide. Updated it to `2.2.x`, matching the current stable Crossplane chart series available from the official chart repository.
- The Kubernetes prerequisite said `v1.26 or later`. Crossplane's current official install documentation requires an actively supported Kubernetes version, so the prerequisite was updated to that wording.
- The verification commands used singular Flux get resource names: `flux get kustomization` and `flux get helmrelease`. Flux's documented get commands use plural resource names, so these were changed to `flux get kustomizations` and `flux get helmreleases`.

## Review Notes
The HelmRepository, HelmRelease, Kustomization API versions, chart source URL, Crossplane Helm values, Deployment health checks, namespace placement, and Git workflow examples are technically valid. The Flux CLI and Helm binaries were not installed locally, so CLI details were verified against official Flux documentation rather than local `--help` output.
