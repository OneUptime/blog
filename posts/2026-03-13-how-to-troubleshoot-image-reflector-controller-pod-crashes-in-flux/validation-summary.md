# Validation Summary: How to Troubleshoot Image Reflector Controller Pod Crashes in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- kubectl
- Flux image-reflector-controller
- Flux ImageRepository and ImagePolicy APIs
- Container registry authentication and rate limiting

## Sources Consulted
- Flux Image Repositories documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image automation controllers documentation: https://fluxcd.io/flux/components/image/
- Flux CLI documentation for `flux get images repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux latest install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- Registry authentication failures were described as a direct controller crash cause. Flux documents these as ImageRepository reconciliation failures, so the text now tells readers to check for scan errors before assuming the pod is crashing.
- The database recovery step said to delete the pod and persistent storage, but the command only deletes the pod. Current Flux install manifests use an `emptyDir` volume for the image-reflector-controller database, so the wording now scopes the advice to the default Flux deployment.
- Registry rate limiting was described as a direct pod crash or crash-loop cause. Flux reports scan problems through ImageRepository status and events, so the text now describes rate limiting as an ImageRepository scan failure.
- The summary grouped authentication failures and rate limiting with common pod crash causes. It now distinguishes actual crash causes from scan failures that stop image automation from progressing.

## Review Notes
The Flux API examples use current `image.toolkit.fluxcd.io/v1` resources and the `ImagePolicy.filterTags`, `ImageRepository.secretRef`, and `interval` fields match current Flux documentation. The default Flux install manifest still includes the `app=image-reflector-controller` pod label used by the kubectl selectors, and the Flux CLI documentation lists `flux get image repository --all-namespaces` as a valid example.
