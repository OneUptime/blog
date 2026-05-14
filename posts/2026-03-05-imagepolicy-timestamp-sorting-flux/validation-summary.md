# Validation Summary: How to Configure ImagePolicy with Timestamp Sorting in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux ImagePolicy
- Flux ImageRepository
- Kubernetes custom resources
- kubectl
- Flux CLI
- Container image tag filtering and sorting

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux v1 image automation migration guide: https://fluxcd.io/flux/migration/flux-v1-automation-migration/
- Flux CLI reference for `flux get images policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The prerequisites said the cluster needed Flux and image automation controllers installed. ImagePolicy selection is handled by the image-reflector-controller, while image-automation-controller is only needed for automated Git updates. I changed the prerequisite to name the image-reflector-controller.
- Step 6 was titled "Handle Timestamp with Version and Build Number", but the example only includes a version and timestamp. I changed the heading to "Handle Timestamp with Version Number".
- Step 8 said the regex considered tags from "2026 onwards", but the pattern only matches timestamps beginning with `2026`. I changed the wording to say it limits tags to a specific date range.

## Review Notes
The ImagePolicy manifests use the current `image.toolkit.fluxcd.io/v1` API, valid `filterTags.pattern` and `filterTags.extract` fields, and valid alphabetical or numerical policies. Flux's alphabetical and numerical policies select the last tag after sorting in the configured order, so `order: asc` is appropriate for sortable timestamp tags where the newest value sorts last.
