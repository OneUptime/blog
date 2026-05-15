# Validation Summary: How to Create an ImageRepository in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- Kubernetes Secrets
- Container registries

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI `flux create image repository` documentation: https://fluxcd.io/flux/cmd/flux_create_image_repository/
- Flux CLI `flux get image repository` documentation: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/

## Issues Found
- The prerequisites stated that both the image reflector controller and image automation controller were required. Creating and scanning an `ImageRepository` only requires the image reflector controller; the image automation controller is needed later for automated Git updates. Updated the prerequisite to make that distinction.

## Review Notes
The manifests use the current `image.toolkit.fluxcd.io/v1` API and valid `ImageRepository` fields. The Flux documentation notes that `.spec.exclusionList` has a default of `^.*\\.sig$` when it is not set, which could be mentioned in a future enhancement, but the existing exclusion examples are valid.
