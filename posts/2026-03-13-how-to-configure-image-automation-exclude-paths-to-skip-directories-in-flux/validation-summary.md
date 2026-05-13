# Validation Summary: How to Configure Image Automation Exclude Paths to Skip Directories in Flux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux v2
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageUpdateAutomation
- ImagePolicy markers
- GitRepository
- Kubernetes YAML manifests
- Git CLI

## Sources Consulted
- Flux Image Update Automations documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Automate image updates to Git guide: https://fluxcd.io/flux/guides/image-update/
- Flux Git Repositories documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI documentation for `flux get images update`: https://fluxcd.io/flux/cmd/flux_get_images_update/

## Issues Found
- The description said ImageUpdateAutomation excluded directories from "image tag scanning". Flux image tag scanning is handled by image-reflector-controller and ImageRepository/ImagePolicy resources; ImageUpdateAutomation scans Git manifests for image policy markers and writes updates. Changed this to "manifest scanning and updates."
- The `GitRepository` example in Strategy 4 omitted `spec.interval`, which is required in current Flux `source.toolkit.fluxcd.io/v1` examples and API usage. Added `interval: 1m` to make the snippet valid.

## Review Notes
The post correctly states that `ImageUpdateAutomation.spec.update.path` scopes the manifest path to update, that the only current update strategy is `Setters`, and that Flux uses inline `$imagepolicy` marker comments to decide which YAML fields to update. The Flux CLI documentation lists the canonical command as `flux get images update`, while its examples also show `flux get image update`; the command used in the post is acceptable as shown by the official examples.
