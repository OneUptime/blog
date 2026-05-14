# Validation Summary: How to Use flux get images all to Check Image Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- ImageRepository
- ImagePolicy
- ImageUpdateAutomation
- GitOps image update automation

## Sources Consulted
- Flux CLI documentation: `flux get images all` - https://fluxcd.io/flux/cmd/flux_get_images_all/
- Flux CLI documentation: `flux get images repository` - https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI documentation: `flux get images policy` - https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI documentation: `flux get images update` - https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux CLI documentation: `flux reconcile image repository` - https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux CLI documentation: `flux reconcile image policy` - https://fluxcd.io/flux/cmd/flux_reconcile_image_policy/
- Flux image automation guide - https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation - https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation - https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation - https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image reflector API reference v1 - https://fluxcd.io/flux/components/image/reflector-api/v1/

## Issues Found
- The Deployment marker example placed the `{"$imagepolicy": "flux-system:my-app"}` setter comment on the line before the `image` field. Flux documentation describes setters as inline comments on the field being updated, so the marker was moved to the end of the `image:` line.
- The trace script read `.status.latestImage` from `ImagePolicy`. Current Flux `image.toolkit.fluxcd.io/v1` reports the selected image under `.status.latestRef`, so the JSONPath was changed to combine `.status.latestRef.image` and `.status.latestRef.tag`.

## Review Notes
The local environment did not have the `flux` CLI installed, so command verification was performed against official Flux documentation instead of local `--help` output. The reviewed commands and API versions are current for the latest Flux documentation available on 2026-05-14.
