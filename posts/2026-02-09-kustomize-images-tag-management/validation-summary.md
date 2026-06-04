# Validation Summary: How to implement Kustomize images for dynamic image tag management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Docker CLI
- GitHub Actions
- CI/CD

## Sources Consulted
- Kustomize API types documentation: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kustomize image transformer documentation: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/transformerconfigs/README.md
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes container image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Docker build, tag, and publish documentation: https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Docker manifest CLI documentation: https://docs.docker.com/reference/cli/docker/manifest/
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- Replaced deprecated Kustomize `bases:` fields with `resources:`. Kustomize v1beta1 still accepts `bases`, but the current API marks it deprecated and directs users to `resources`.
- Updated abbreviated digest placeholders such as `sha256:abc123...` to a full SHA-256 digest example. Kubernetes image references by digest require a complete digest value.
- Fixed the CI shell script so `docker build` tags `registry.example.com/myapp:${IMAGE_TAG}`, matching the image reference pushed by `docker push`.
- Updated the GitHub Actions checkout example from `actions/checkout@v3` to `actions/checkout@v5` to use the current documented major version.
- Corrected the statement that a Git SHA image tag is immutable. A Git commit SHA is immutable, but a registry tag using that SHA can still be overwritten unless tag immutability is enforced; digests provide immutable image references.
- Added the required `spec.selector` and matching pod template labels to the sidecar Deployment example so it is valid for `apps/v1`.

## Review Notes
Verified representative Kustomize image transformations and `kustomize edit set image` behavior with Kustomize v5.8.1. The image validation script uses simple text extraction from rendered YAML; it is acceptable for a lightweight example, but a structured YAML parser would be more robust in production pipelines.
