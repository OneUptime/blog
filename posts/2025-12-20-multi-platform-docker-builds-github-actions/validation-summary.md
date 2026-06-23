# Validation Summary: How to Set Up Multi-Platform Docker Builds in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Docker Buildx
- Docker BuildKit
- QEMU emulation
- Multi-platform Docker images
- GitHub Container Registry
- Docker layer caching
- Docker metadata-action
- BuildKit attestations and SBOM
- Trivy container scanning

## Sources Consulted
- Docker Docs: Multi-platform image with GitHub Actions - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/
- Docker Docs: Add SBOM and provenance attestations with GitHub Actions - https://docs.docker.com/build/ci/github-actions/attestations/
- Docker Docs: Manage tags and labels with GitHub Actions - https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- Docker Docs: docker buildx imagetools inspect - https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker build-push-action README - https://github.com/docker/build-push-action
- GitHub Docs: Choosing the runner for a job - https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- GitHub Docs: Uploading a SARIF file to GitHub - https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- Trivy Action README - https://github.com/aquasecurity/trivy-action

## Issues Found
- Docker's current GitHub Actions documentation uses newer major versions of the Docker actions than the post showed. Updated `docker/setup-qemu-action` from `v3` to `v4`, `docker/setup-buildx-action` from `v3` to `v4`, `docker/login-action` from `v3` to `v4`, `docker/build-push-action` from `v6` to `v7`, and `docker/metadata-action` from `v5` to `v6`.
- The "Build Arguments Per Platform" section implied that `build-args` were different per platform, but the snippet passes a common `VERSION` build argument and relies on BuildKit's automatic `TARGETARCH` argument for platform-specific logic. Updated the heading and lead-in sentence to match the actual behavior documented by Docker.
- The complete workflow explicitly restricted `GITHUB_TOKEN` permissions but omitted `security-events: write`, which is required for `github/codeql-action/upload-sarif` to upload SARIF results. Added the missing permission.
- The scan step was labeled "Scan AMD64 image" while the image reference uses the pushed image digest from a multi-platform build. Renamed it to "Scan image" to avoid incorrectly implying an AMD64-only reference.
- The Dockerfile example used a placeholder Alpine package name (`some-arm-package`) that would fail if copied directly. Replaced it with the real Alpine package `libatomic` while keeping the platform-specific dependency example intact.

## Review Notes
- The remaining examples are technically valid for building and pushing multi-platform images with Buildx. Docker's attestation docs recommend `provenance: mode=max` for max-level provenance, while the post's `provenance: true` remains a valid shorter form.
- `aquasecurity/trivy-action@master` is used in the post and is common in Trivy examples, but pinning to a released version would improve reproducibility in a production workflow.
