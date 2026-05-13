# Validation Summary: How to Configure ImagePolicy to Select Only Staging Tags in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes manifests
- Container image tag filtering
- Semantic Versioning

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux sortable image tags guide: https://v2-7.docs.fluxcd.io/flux/guides/sortable-image-tags/
- Semantic Versioning 2.0.0 specification: https://semver.org/

## Issues Found
- The branch-based staging tag example extracted only an eight-digit date (`YYYYMMDD`) from tags like `release-20260313-abc1234`. Flux numerical policies sort the extracted value, so multiple builds on the same day would have the same policy value and the example would not reliably select the most recent build. Changed the example tag and regex to include a sortable numeric date-time timestamp (`YYYYMMDDHHMMSS`), allowing numerical sorting to identify the latest build.

## Review Notes
- The Flux `ImagePolicy`, `ImageRepository`, `ImageUpdateAutomation`, `filterTags`, `extract`, `policy.semver`, `policy.numerical`, and setter marker examples match the current Flux documentation.
- Flux documentation notes that image automation selects by sortable tags rather than actual image build time, so CI pipelines should continue to emit sortable timestamps or serial numbers in tags used by numerical policies.
