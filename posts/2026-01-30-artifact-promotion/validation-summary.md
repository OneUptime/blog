# Validation Summary: How to Create Artifact Promotion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Container image registries
- Artifact promotion
- Skopeo
- Docker / OCI container images
- GitHub Actions
- GitHub Container Registry
- Docker Buildx GitHub Actions
- Shell scripting

## Sources Consulted
- Skopeo copy official documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Skopeo login official documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-login.1.md
- Skopeo inspect official documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Actions workflow commands and job summaries documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- Docker login-action documentation: https://github.com/docker/login-action
- Docker setup-buildx-action documentation: https://github.com/docker/setup-buildx-action

## Issues Found
- Plain `skopeo copy` does not necessarily preserve the same top-level digest for multi-architecture images because the default copy mode may copy only the system architecture. Added `--all` and `--preserve-digests` to promotion copies where digest preservation is part of the example.
- The registry promotion script attempted to copy to a digest reference as if it were a tag. Changed the script to copy to the target tag, inspect the target digest, fail on mismatch, and then print the digest reference that is available after the verified copy.
- The digest-promotion workflow used `skopeo` without installing it or authenticating in the promotion job. Added installation and `skopeo login` steps.
- The GitHub Container Registry build workflow used `GITHUB_TOKEN` for pushing without declaring package write permissions. Added `permissions: contents: read` and `packages: write`.
- The Docker GitHub Actions versions were behind the current documented major versions. Updated `docker/setup-buildx-action` to `v4`, `docker/login-action` to `v4`, and `docker/build-push-action` to `v7`.

## Review Notes
The examples are technically sound after the fixes. In a production workflow, teams may still want stronger audit logging, explicit source and destination credential separation, and digest verification after every GitHub Actions promotion step.
