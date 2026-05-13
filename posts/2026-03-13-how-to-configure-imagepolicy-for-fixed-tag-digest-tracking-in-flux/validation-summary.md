# Validation Summary: How to Configure ImagePolicy for Fixed Tag Digest Tracking in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux ImageRepository
- Flux ImagePolicy
- Flux ImageUpdateAutomation markers
- Kubernetes Deployments
- Kubernetes image pull policy
- Container image tags and digests

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation API reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux CLI documentation for image policy commands: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI documentation for image repository commands: https://fluxcd.io/flux/cmd/flux_create_image_repository/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The ImagePolicy examples did not set `spec.digestReflectionPolicy`. Flux only reflects digests when this is set to `Always` or `IfNotPresent`; mutable fixed tags such as `latest` require `Always` to refresh the digest when the tag itself has not changed. Added `digestReflectionPolicy: Always` and `interval: 10m` to the fixed-tag policies.
- The Deployment marker example used only `docker.io/myorg/my-app:latest`, which would not change in Git when the tag remained the same. Updated the examples to use `tag@digest` image references with the basic `$imagepolicy` marker, matching Flux digest pinning guidance.
- The rolling-update section suggested an annotation would be updated by automation but did not include a valid Flux marker and would not work as written. Replaced that with digest pinning in the image reference so a digest change updates the pod template.
- The verification command used `.status.latestImage`, which is not the current ImagePolicy v1 status field. Updated it to `.status.latestRef.digest`.
- The image pull policy explanation implied Kubernetes always pulls a fresh image instead of using cache. Updated it to say Kubernetes resolves the digest from the registry and uses the cached image only when that digest is already present.

## Review Notes
The corrected post assumes current Flux image toolkit APIs (`image.toolkit.fluxcd.io/v1`) and Flux versions that support digest pinning markers. Unique immutable tags remain the simpler operational model for most production pipelines.
