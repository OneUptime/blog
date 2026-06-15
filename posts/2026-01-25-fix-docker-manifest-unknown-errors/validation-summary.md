# Validation Summary: How to Fix Docker 'Manifest Unknown' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker CLI
- Docker Hub
- Docker Registry HTTP API V2 / OCI distribution
- Docker Buildx
- GitHub Actions docker/build-push-action
- AWS ECR
- Google Artifact Registry
- Harbor
- crane CLI

## Sources Consulted
- Docker CLI reference: docker manifest inspect: https://docs.docker.com/reference/cli/docker/manifest/inspect/
- Docker CLI reference: docker image pull: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference: docker manifest: https://docs.docker.com/reference/cli/docker/manifest/
- Docker CLI reference and local help output for docker pull, docker push, docker inspect, docker images, docker info, and docker buildx imagetools inspect.
- CNCF Distribution Registry HTTP API V2: https://distribution.github.io/distribution/spec/api/
- OCI Distribution Specification: https://specs.opencontainers.org/distribution-spec/
- Docker Hub API reference: https://docs.docker.com/reference/api/hub/latest/
- docker/build-push-action releases and usage: https://github.com/docker/build-push-action
- AWS CLI ECR describe-images: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-images.html
- AWS CLI ECR get-login-password: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Google Cloud SDK Artifact Registry docker images list: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- Google Cloud SDK Artifact Registry docker tags list: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/list
- crane manifest documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_manifest.md

## Issues Found
- The platform mismatch example used a literal `manifest unknown` error for an ARM pull. Current Docker commonly reports this as `no matching manifest for linux/arm64 in the manifest list entries`, so the example was corrected.
- The digest lookup used `docker manifest inspect myapp:latest | jq '.config.digest'`, which returns the image config digest for single-platform manifests and does not work for manifest lists. It was changed to `docker buildx imagetools inspect myapp:latest`, which shows the manifest or index digest.
- The private registry token example used a non-standard `/v2/token` endpoint. It was replaced with a basic-auth tags-list example because token endpoints are normally discovered from the registry authentication challenge and vary by registry.
- The manifest content example counted `.layers` unconditionally, which fails for multi-platform manifest lists. It now checks whether `manifests` exists and counts either manifest-list entries or single-manifest layers.
- The GitHub Actions example used `docker/build-push-action@v5`; the current major release is v7, so the example was updated.
- The Docker Hub note incorrectly implied `library/nginx:alpine` is not a valid reference. It was corrected to state that `nginx:alpine` is equivalent to `docker.io/library/nginx:alpine`.
- The conclusion said `manifest unknown` always means the exact image reference does not exist. That was softened because authentication behavior and platform negotiation can affect what the client sees.

## Review Notes
The remaining examples are broadly correct, but several registry behaviors are implementation-specific. Authentication errors, replication lag, and manifest negotiation can produce different user-facing messages across Docker Hub, ECR, Harbor, and private registries.
