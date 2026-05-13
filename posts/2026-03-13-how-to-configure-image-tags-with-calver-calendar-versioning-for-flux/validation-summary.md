# Validation Summary: How to Configure Image Tags with CalVer (Calendar Versioning) for Flux

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
- Kubernetes Deployment manifests
- Docker image tags
- GitHub Actions
- Semantic Versioning
- Calendar Versioning

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux `flux get image policy` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Semantic Versioning 2.0.0 specification: https://semver.org/

## Issues Found
- The post stated that zero-padded tags such as `2026.03.13` are valid SemVer strings. SemVer numeric identifiers must not contain leading zeroes, so this was changed to describe SemVer-compatible CalVer as three non-zero-padded numeric components such as `2026.3.13`.
- The Deployment image example used `2026.03.13` with the SemVer-based `my-app-calver` policy. This was changed to `2026.3.13` so the sample tag matches the SemVer policy described earlier.
- The build-suffix alphabetical policy used unpadded build numbers such as `2026.03.13-1`. Alphabetical sorting does not order variable-width numeric suffixes correctly once values reach multiple digits, so the example was changed to fixed-width suffixes such as `2026.03.13-001`, and the regex now requires three digits.
- The GitHub Actions example emitted an unpadded `github.run_number`, which conflicted with the corrected build-suffix policy. It now formats the run number with `printf "%03d"`.
- The conclusion was updated to clarify that SemVer policy applies to three non-zero-padded numeric components, while zero padding is needed for correct alphabetical sorting.

## Review Notes
The Flux API versions, `ImageRepository` and `ImagePolicy` fields, `filterTags` usage, alphabetical policy order, image policy marker syntax, and `flux get image policy` command match the current Flux documentation. The examples assume the required `ImageUpdateAutomation` exists for Git write-back, which is consistent with the prerequisites and Flux image update guide.
