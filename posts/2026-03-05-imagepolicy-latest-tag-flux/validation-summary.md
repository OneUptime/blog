# Validation Summary: How to Configure ImagePolicy for Latest Tag in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image reflector controller
- Flux ImageRepository
- Flux ImagePolicy
- Kubernetes Deployment manifests
- GitHub Actions
- Container image tags and digests

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI `flux create image policy` documentation: https://fluxcd.io/flux/cmd/flux_create_image_policy/

## Issues Found
- The post said Flux has no way to determine whether the digest behind `latest` changed and that Flux detects new images by tag names, not digests. Current Flux ImagePolicy supports digest reflection with `.spec.digestReflectionPolicy: Always`, and ImageUpdateAutomation can use digest-aware markers. I changed the explanation to say that tag-only automation will not update when the tag remains `latest`, and that digest tracking requires `digestReflectionPolicy: Always` plus digest-aware update markers.
- The Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. I added a minimal selector and matching `template.metadata.labels` so the manifest is valid.

## Review Notes
- The Flux ImagePolicy examples use the current `image.toolkit.fluxcd.io/v1` API and valid `semver`, `alphabetical`, `numerical`, and `filterTags` fields.
- The ImageRepository `exclusionList` example is valid for excluding `latest`, but users should remember that Flux's default exclusion list also excludes Cosign `.sig` tags when no custom list is provided.
