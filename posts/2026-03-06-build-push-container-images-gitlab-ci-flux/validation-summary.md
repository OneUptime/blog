# Validation Summary: How to Build and Push Container Images with GitLab CI for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD image-reflector-controller and image-automation-controller
- GitLab CI/CD
- GitLab Container Registry
- Docker-in-Docker
- Buildah
- Kubernetes Deployments and Secrets

## Sources Consulted
- Flux ImageRepository and ImagePolicy API reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- GitLab Docker-in-Docker build documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Kaniko removal notice: https://docs.gitlab.com/ci/docker/using_kaniko/
- GitLab Buildah rootless build tutorial: https://docs.gitlab.com/ci/docker/buildah_rootless_tutorial/
- Buildah release announcements: https://buildah.io/releases/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Flux CLI `reconcile image update` reference: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/

## Issues Found
- The Docker-in-Docker example used separate `build` and `push` jobs. GitLab CI jobs run in separate environments and separate Docker-in-Docker daemon contexts, so the push job would not have the image built by the previous job. I changed it to a single build-and-push job and used the official Docker-in-Docker configuration pattern with `DOCKER_HOST` and `DOCKER_TLS_CERTDIR`.
- The examples tagged images with commit SHAs and configured Flux to select the "latest" SHA alphabetically. Flux can sort tags alphabetically, but a commit SHA does not encode chronological order, so this would not reliably select the newest build. I changed the primary examples to use `main-$CI_PIPELINE_IID` tags and a Flux numerical policy with `filterTags.extract`.
- The Kaniko examples were outdated because GitLab's current documentation marks Kaniko as removed and notes that Kaniko is no longer maintained. I replaced the Kaniko snippets with Buildah-based daemonless build examples and used `$CI_REGISTRY_IMAGE`, which GitLab provides for the project container registry path.
- The "rootless" Kaniko heading overstated the mechanism and depended on an unmaintained tool. I changed the section to Buildah daemonless builds and noted that rootless execution depends on runner configuration.
- The semver policy comment described selecting the latest patch in the 1.x range, but the range allowed all versions greater than or equal to 1.0.0. I changed the range to `>=1.0.0 <2.0.0`.

## Review Notes
The Flux API versions and field names used in the post are current for `image.toolkit.fluxcd.io/v1`. The optional semver flow is technically valid, though real production versioning may need a release process instead of deriving versions directly from pipeline IDs.
