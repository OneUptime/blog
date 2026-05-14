# Validation Summary: How to Troubleshoot ImagePolicy Not Resolving Latest Tag in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageRepository
- ImagePolicy
- ImageUpdateAutomation
- Flux notification-controller alerts
- SemVer, numerical, and alphabetical tag policies
- skopeo and crane registry tooling

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI documentation for `flux get image policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI documentation for `flux get image repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI documentation for `flux reconcile image repository`: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Masterminds semver documentation: https://pkg.go.dev/github.com/MasterMinds/semver

## Issues Found
- Corrected the semver prefix guidance. The post said tags like `v1.2.3` may not match semver policies, but Flux uses semver handling that accepts an optional leading `v`. The post now warns about other non-semver prefixes and suggests `filterTags.extract` when needed.
- Corrected the ImageRepository reference guidance. The post said ImagePolicy and ImageRepository must be in the same namespace, but Flux supports cross-namespace references when `imageRepositoryRef.namespace` is set and the ImageRepository permits access with `spec.accessFrom`.
- Corrected the reconciliation command. Flux does not provide `flux reconcile image policy`; ImagePolicy is re-evaluated when the associated ImageRepository is updated. The post now uses `flux reconcile image repository my-app -n flux-system`.
- Corrected the Alert API version from `notification.toolkit.fluxcd.io/v1` to the current documented `notification.toolkit.fluxcd.io/v1beta3`.

## Review Notes
The remaining commands and configuration snippets match current Flux documentation. The local environment did not have the Flux CLI installed, so CLI validation was performed against the official Flux command reference rather than local `--help` output.
