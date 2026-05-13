# Validation Summary: How to Configure Image Tags with Environment Prefix for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation controllers
- Flux ImageRepository
- Flux ImagePolicy
- Kubernetes manifests
- Container image tags

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux sortable image tags guide: https://fluxcd.io/flux/guides/sortable-image-tags/

## Issues Found
- The production and staging examples extracted the entire suffix after the environment prefix, which would include the optional `v` in tags like `prod-v1.2.3`. Updated the regex patterns to extract the semantic version portion used for semver policy evaluation.
- The ImagePolicy status example used `status.latestImage`, but the current Flux v1 API reports the selected image under `status.latestRef`. Updated the example to show `latestRef.image` and `latestRef.tag`.
- The deployment marker section implied that a marker alone enables automatic Git updates. Updated the wording to clarify that an `ImageUpdateAutomation` must be configured.
- The troubleshooting command was described as listing discovered tags, but `lastScanResult` contains a scan summary and a sample of latest tags. Updated the wording and JSONPath to show `status.lastScanResult.latestTags`.

## Review Notes
The current `image.toolkit.fluxcd.io/v1` API version, `filterTags.pattern`, `filterTags.extract`, semver and numerical policy fields, and image policy marker format are consistent with the official Flux documentation.
