# Validation Summary: How to Configure ImagePolicy with Regex Tag Filtering in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image-reflector-controller
- Flux ImagePolicy and ImageRepository CRDs
- Kubernetes manifests and kubectl
- Go regular expressions
- Container image tag selection policies

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI `flux create image policy` documentation: https://fluxcd.io/flux/cmd/flux_create_image_policy/
- Go regexp syntax documentation: https://go.dev/pkg/regexp/syntax/

## Issues Found
- The prerequisites said Flux and image automation controllers were required. ImagePolicy selection is handled by the image-reflector-controller, while the image-automation-controller is only needed for Git write-back automation. I changed the prerequisite to require the image-reflector-controller.
- Step 5 described alternation with the `|` operator, but the example used the `?` operator to make the `v` prefix optional. I changed the heading and explanation to describe optional pattern components.
- The testing command comment said it listed tags, but the command returned only `.status.lastScanResult.tagCount`. I changed it to show `.status.lastScanResult.latestTags`, which is the ImageRepository status field Flux exposes as a sample of scanned tags.

## Review Notes
The ImagePolicy examples use the current `image.toolkit.fluxcd.io/v1` API and valid fields: `.spec.imageRepositoryRef.name`, `.spec.filterTags.pattern`, `.spec.filterTags.extract`, `.spec.policy.semver.range`, and `.spec.policy.numerical.order`. The named capture group syntax `(?P<name>...)` and `$name` extraction style match the documented Flux examples and Go regexp syntax. Go regexp does not support lookahead or lookbehind, so the troubleshooting note is accurate.
