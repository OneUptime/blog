# Validation Summary: How to Configure Image Automation Interval for Registry Scanning in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- ImageRepository
- ImagePolicy
- Container registry authentication

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI documentation for image repository status: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux image controller options: https://fluxcd.io/flux/components/image/options/
- Docker Hub usage and limits documentation: https://docs.docker.com/docker-hub/download-rate-limit/

## Issues Found
- The post said Flux checks for new tags "matching the configured policies" during the ImageRepository scan. ImagePolicy evaluates scanned tags after ImageRepository data is available, so this was changed to say the scan finds tags that policies can evaluate.
- The post said `exclusionList` reduces the amount of data fetched from the registry. Flux documents `exclusionList` as excluding tags from being stored in the internal database, so this was changed to "stored and processed" instead of "fetched."
- The status field was written as `Status.LastScanResult`. The Kubernetes API field is `.status.lastScanResult`, with `scanTime` and `tagCount` inside it, so the field reference was corrected.
- The performance section said the image-reflector-controller processes scans sequentially. Flux documents a `--concurrent` option for the image-reflector-controller, so the sentence was revised to describe sustained load from many ImageRepositories without claiming strictly sequential processing.
- The Docker Hub note only mentioned pull rate limits. Docker also documents broader Hub usage limits, so the sentence was adjusted to avoid implying that registry scanning is only governed by image pull limits.

## Review Notes
The YAML examples use the current `image.toolkit.fluxcd.io/v1` API and valid fields for Flux v2 image automation. The authentication example uses a Docker config JSON secret format accepted by Flux for `spec.secretRef`.
