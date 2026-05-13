# Validation Summary: How to Configure ImagePolicy with Custom Sorting by Date Suffix

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux ImageRepository and ImagePolicy custom resources
- Kubernetes kubectl
- Container image tag filtering and sorting
- Regular expressions

## Sources Consulted
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image Reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux Image Automation Controllers overview: https://fluxcd.io/flux/components/image/
- Flux image update guide and ImagePolicy examples: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `flux create image policy` reference: https://fluxcd.io/flux/cmd/flux_create_image_policy/

## Issues Found
- The prerequisites stated that both `image-reflector-controller` and `image-automation-controller` are required. ImagePolicy selection is handled by `image-reflector-controller`; `image-automation-controller` is only needed when writing image updates back to Git. Updated the prerequisite accordingly.
- The explanation said ISO-style dates sort correctly in both numerical and alphabetical order. Dates with separators are not suitable for numerical sorting, so the wording now distinguishes lexicographic sorting for ISO-style formatted dates from numerical sorting for compact numeric dates.
- The Date with Build Sequence guidance suggested concatenating a date and build number without clearly requiring a fixed-width build number. Updated it to specify a fixed-width, zero-padded build number so the resulting sort key remains reliable.
- The verification command used `.status.latestImage`, which is not the current ImagePolicy status field. Updated it to read `.status.latestRef.image` and `.status.latestRef.tag`, matching the current Flux API.

## Review Notes
The ImagePolicy manifests use the current `image.toolkit.fluxcd.io/v1` API and valid `filterTags`, `extract`, `numerical`, and `alphabetical` policy fields. The examples rely on consistent zero-padding, which remains the key operational caveat for date and sequence based tag sorting.
