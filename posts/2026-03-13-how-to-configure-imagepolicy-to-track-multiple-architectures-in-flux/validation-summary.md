# Validation Summary: How to Configure ImagePolicy to Track Multiple Architectures in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2 image automation
- Flux ImageRepository and ImagePolicy custom resources
- Kubernetes Deployments and node selectors
- Docker multi-platform images, manifest lists, and OCI image indexes
- Docker Buildx and GitHub Actions

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://v2-6.docs.fluxcd.io/flux/components/image/imagerepositories/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux image-reflector-controller source and tests: https://github.com/fluxcd/image-reflector-controller
- Docker multi-platform builds documentation: https://docs.docker.com/build/building/multi-platform/
- Docker GitHub Actions multi-platform documentation: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker manifest CLI documentation: https://docs.docker.com/reference/cli/docker/manifest/
- Kubernetes node labels documentation: https://kubernetes.io/docs/reference/node/node-labels/

## Issues Found
- The section "Filtering for Tags with Manifest Lists Only" implied that Flux could ensure selected tags are manifest lists. Flux `filterTags` only filters and extracts from tag names before applying the policy; it does not inspect manifest contents or platform entries. I changed the heading and wording to make clear that this relies on a naming convention and the build process publishing bare version tags as multi-arch manifest lists.
- The GitHub Actions Buildx example used older action major versions and omitted setup required by the current Docker multi-platform example. I updated `docker/setup-buildx-action` to `v4`, `docker/build-push-action` to `v7`, and added `docker/setup-qemu-action@v4` plus `docker/login-action@v4` so the example matches current Docker documentation for building and pushing multi-platform images.

## Review Notes
The Flux `ImagePolicy` examples use the current `image.toolkit.fluxcd.io/v1` API and valid `filterTags.pattern` / `filterTags.extract` fields. Flux returns the original matching tag after sorting on extracted values, so the architecture-specific tag examples remain valid. The Kubernetes `kubernetes.io/arch` node selector is a standard kubelet-populated node label.
