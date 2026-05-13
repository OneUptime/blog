# Validation Summary: How to Configure SemVer Image Tags with Pre-Release Suffix for Flux

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
- Semantic Versioning
- Kubernetes manifests

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image Reflector API reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Masterminds/semver README: https://github.com/Masterminds/semver
- Semantic Versioning 2.0.0 specification: https://semver.org/

## Issues Found
- The post incorrectly said that Flux SemVer ranges match pre-release tags by default. Updated the stable-release section to state that constraints without a pre-release comparator skip pre-release versions, matching the semver behavior linked from the Flux documentation.
- The release candidate example claimed to track only rc tags using only a SemVer range. Added `filterTags.pattern` so the policy actually limits candidates to `1.2.0-rc.*` tags before applying the range.
- The beta-and-rc example claimed to track only beta and rc tags using only a SemVer range. Added `filterTags.pattern` so the policy is limited to `1.3.0-beta.*` and `1.3.0-rc.*` tags.

## Review Notes
The API version `image.toolkit.fluxcd.io/v1`, ImagePolicy fields, ImageRepository fields, image policy marker syntax, and verification commands are consistent with current Flux documentation. The examples intentionally use SemVer prerelease ordering; future edits should keep in mind that SemVer ranges order prerelease identifiers but do not replace tag filtering when a specific channel name is required.
