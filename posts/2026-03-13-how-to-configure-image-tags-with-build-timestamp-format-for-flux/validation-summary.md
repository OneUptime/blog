# Validation Summary: How to Configure Image Tags with Build Timestamp Format for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageRepository
- ImagePolicy
- Kubernetes Deployments
- GitHub Actions
- GitLab CI
- Docker image tagging

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux `get image policy` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The post stated broadly that all listed timestamp formats share lexicographic or numerical chronological ordering. This was imprecise for prefixed and separator-containing tags because numerical ordering only works after extracting a numeric component, while fixed-width non-numeric timestamp strings should use alphabetical ordering. Updated the wording to distinguish numerical extraction from alphabetical ordering and added a date-only precision caveat.
- The verification command used `.status.latestImage`, but current Flux `ImagePolicy` status reports the selected image under `.status.latestRef`, with the tag at `.status.latestRef.tag`. Updated the `kubectl` jsonpath command accordingly.

## Review Notes
The ImageRepository and ImagePolicy manifests use the current `image.toolkit.fluxcd.io/v1` API, valid `filterTags.pattern` and `filterTags.extract` fields, and supported numerical policy ordering. The image policy marker format is consistent with current Flux image update automation documentation.
