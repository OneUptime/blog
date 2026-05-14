# Validation Summary: How to Configure ImagePolicy with Alphabetical Sorting in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux ImagePolicy custom resources
- Kubernetes custom resources
- kubectl
- Flux CLI
- YAML

## Sources Consulted
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI `flux get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/

## Issues Found
No technical issues found.

## Review Notes
The examples use the current `image.toolkit.fluxcd.io/v1` ImagePolicy API. The `alphabetical.order` values, `filterTags.pattern`, and `filterTags.extract` fields match the official Flux documentation. The Flux CLI documentation lists `flux get image policy` as an example command, while the generated command page is titled `flux get images policy`; both forms are represented in the official docs.
