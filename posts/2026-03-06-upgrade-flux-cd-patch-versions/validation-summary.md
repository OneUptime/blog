# Validation Summary: How to Upgrade Flux CD Patch Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- GitOps
- GitHub CLI
- Flux image automation APIs
- Flux notification APIs

## Sources Consulted
- Flux CLI `flux install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux image repository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image policy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux v2.8.7 GitHub release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.7
- Flux v2.8.6 GitHub release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.6
- Flux source-controller v1.8.4 GitHub release notes: https://github.com/fluxcd/source-controller/releases/tag/v1.8.4
- Flux kustomize-controller v1.8.5 GitHub release notes: https://github.com/fluxcd/kustomize-controller/releases/tag/v1.8.5

## Issues Found
- The post used `v2.3.0` to `v2.3.1` as the running example, but Flux `v2.3.1` was never released. Updated the example patch path to the real `v2.8.6` to `v2.8.7` release and adjusted controller versions and changelog commands accordingly.
- The image automation section claimed the shown `ImageRepository` and `ImagePolicy` resources would automatically upgrade Flux controller images. Those resources identify/select image tags but do not by themselves update Git manifests. Updated the wording to describe tracking selected patch tags instead of automatic upgrades.
- The notification example used `notification.toolkit.fluxcd.io/v1` for `Alert` and `Provider`, but the current Flux notification API for those kinds is `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The rolling multi-cluster examples set `KUBECONFIG` only for `flux install`, leaving the following `flux check` to use the default kubeconfig. Updated each `flux check` command to use the same kubeconfig.
- The notification section described alerting on newly available patch versions, but the YAML watches Flux Kustomization events after updates are applied. Updated the wording to match the behavior.

## Review Notes
The Flux CLI was not installed in the local environment, so command verification was performed against official Flux CLI documentation and GitHub release metadata instead of local `--help` output.
