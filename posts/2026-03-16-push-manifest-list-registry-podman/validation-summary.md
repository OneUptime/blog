# Validation Summary: How to Push a Manifest List to a Registry with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container registries
- Docker Registry HTTP API-compatible transports
- Multi-architecture manifest lists and OCI image indexes
- Docker Hub
- GitHub Container Registry
- Amazon ECR
- Google Artifact Registry
- Skopeo
- Bash

## Sources Consulted
- Podman `podman manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman `podman manifest` documentation: https://docs.podman.io/en/v5.4.2/markdown/podman-manifest.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/v5.1.2/markdown/podman-manifest-add.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman login` documentation: https://docs.podman.io/en/v2.0.6/markdown/podman-login.1.html
- Amazon ECR Podman documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html
- AWS CLI `ecr get-login-password` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Google Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication

## Issues Found
- The post used `podman manifest push --all --purge` for cleanup. Current Podman documentation uses `--rm` to delete the local manifest list or image index after a successful push. Changed the example and comment to use `--rm`.
- The Amazon ECR examples used a 9-digit account ID placeholder. ECR registry URIs use AWS account IDs, which are 12 digits. Updated the example placeholder to `123456789012`.

## Review Notes
Podman was not installed in the local workspace, so command verification was performed against official Podman and registry-provider documentation instead of local `--help` output. The repeated use of `--all` remains appropriate for clarity and compatibility with Podman's manifest workflow documentation, even though the latest `podman manifest push` page documents it as defaulting to true.
