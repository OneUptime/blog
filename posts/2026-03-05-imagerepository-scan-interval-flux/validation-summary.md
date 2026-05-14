# Validation Summary: How to Configure ImageRepository Scan Interval in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Kubernetes Custom Resources
- ImageRepository
- Flux CLI
- Docker Hub rate limits

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI `flux get images repository` documentation: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI `flux create image repository` documentation: https://fluxcd.io/flux/cmd/flux_create_image_repository/
- Flux image automation controllers overview: https://fluxcd.io/flux/components/image/
- Docker Hub usage and limits documentation: https://docs.docker.com/docker-hub/usage/
- Docker Hub pull usage and limits documentation: https://docs.docker.com/docker-hub/usage/storage/

## Issues Found
- The post stated that ImageRepository defaults to `5m0s` when `spec.interval` is omitted. Flux documentation says `.spec.interval` is required for ImageRepository resources, so the text now tells readers to set it explicitly.
- The prerequisites said both image automation controllers were required. An ImageRepository scan specifically requires the image-reflector-controller, while image-automation-controller is only needed for automated Git updates, so the prerequisite was narrowed.
- The rate-limit section implied scan frequency maps directly to Docker Hub pull limits. Docker Hub does document unauthenticated pull limits, but scans generate registry requests and may not be a one-to-one pull count, so the wording now refers to frequent registry requests and broader request limits.
- The post calculated "API calls per hour" as if each scan were one API call. Flux scans can involve multiple registry API requests, so the section now estimates scan attempts per hour instead.
- The custom `exclusionList` example omitted Flux's default `.sig` exclusion. Because a custom list replaces the default behavior, the example now includes `^.*\\.sig$` and the text notes why.

## Review Notes
The Flux CLI commands shown for `suspend`, `resume`, `reconcile`, and `get image repository` match the current Flux CLI documentation. The YAML examples use the current `image.toolkit.fluxcd.io/v1` API.
