# Validation Summary: How to Build OCI Artifacts from Helm Charts with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller OCIRepository
- Flux source-controller HelmRepository
- Flux helm-controller HelmRelease
- Flux kustomize-controller Kustomization
- Helm 3 OCI registries
- Kubernetes Secrets
- GitHub Actions

## Sources Consulted
- Helm official OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `helm push` command documentation: https://docs.helm.sh/docs/v3/helm/helm_push/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux 2.3 GA announcement: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Azure setup-helm GitHub Action documentation: https://github.com/Azure/setup-helm

## Issues Found
- The GitHub Actions example used `azure/setup-helm@v3`. The official action documentation now shows `azure/setup-helm@v4`, so the workflow was updated to use the current major version.
- The verification section claimed to check all Flux resources but only included HelmRepository and HelmRelease commands. Since the post also demonstrates OCIRepository and Kustomization flows, `flux get sources oci` and `flux get kustomizations -A` were added.

## Review Notes
- The Helm OCI commands are consistent with Helm 3.8+ behavior: `helm push` targets the repository prefix, while chart name and version are inferred from the packaged chart.
- The Flux OCIRepository Helm chart example correctly selects the Helm chart content layer with `application/vnd.cncf.helm.chart.content.v1.tar+gzip` and `operation: copy`.
- `HelmRepository` with `type: oci` remains supported but is in maintenance mode in current Flux documentation; the post correctly recommends OCIRepository for improved Helm OCI support.
