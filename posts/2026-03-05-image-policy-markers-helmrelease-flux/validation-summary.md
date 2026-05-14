# Validation Summary: How to Use Image Policy Markers in HelmRelease Values for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageRepository
- ImagePolicy
- ImageUpdateAutomation
- HelmRelease
- Kubernetes YAML manifests
- GitOps

## Sources Consulted
- Flux guide: Automate image updates to Git - https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation - https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image update automation API reference v1 - https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux Image Policies documentation - https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image reflector API reference v1 - https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux Helm API reference v2 - https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI reference: flux get images update - https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux CLI reference: flux get images policy - https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
No technical issues found.

## Review Notes
The post uses current Flux API versions for the resources shown: `image.toolkit.fluxcd.io/v1` for image automation resources and `helm.toolkit.fluxcd.io/v2` for HelmRelease. The inline image policy marker syntax, `:name` and `:tag` suffixes, `update.strategy: Setters`, and the ImageUpdateAutomation Git fields match current Flux documentation. Flux also supports a `:digest` marker variant, but the post does not need it for the repository/tag examples it covers.
