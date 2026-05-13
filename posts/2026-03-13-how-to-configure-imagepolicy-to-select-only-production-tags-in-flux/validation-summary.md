# Validation Summary: How to Configure ImagePolicy to Select Only Production Tags in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- ImagePolicy
- ImageRepository
- ImageUpdateAutomation
- Kubernetes Deployment manifests
- Semantic versioning constraints
- Regular expression tag filtering

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/

## Issues Found
- The `kubectl get imagepolicy my-app-prod` expected output used an outdated `LATESTIMAGE` column. Current Flux examples show separate `IMAGE`, `TAG`, `READY`, and `STATUS` columns for `ImagePolicy` resources. Updated the expected output to match the current Flux documentation while preserving the example tag selection.

## Review Notes
The ImagePolicy examples use the current `image.toolkit.fluxcd.io/v1` API, valid `filterTags.pattern` and `filterTags.extract` fields, and supported semver policy ranges. The image policy marker format and `ImageUpdateAutomation` `Setters` strategy are consistent with current Flux documentation.
