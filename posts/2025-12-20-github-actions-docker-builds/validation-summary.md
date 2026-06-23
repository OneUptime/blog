# Validation Summary: How to Set Up Docker Builds in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Docker and Docker Buildx
- Docker BuildKit
- GitHub Container Registry
- Docker Hub
- Multi-architecture container images
- GitHub Actions cache and BuildKit cache backends
- Docker build secrets, SBOMs, and provenance attestations
- Trivy vulnerability scanning
- GitHub code scanning SARIF upload

## Sources Consulted
- Docker build-push-action README: https://github.com/docker/build-push-action
- Docker GitHub Actions cache documentation: https://docs.docker.com/build/ci/github-actions/cache/
- Docker multi-platform GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker build secrets with GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/secrets/
- Docker SBOM and provenance attestations documentation: https://docs.docker.com/build/ci/github-actions/attestations/
- GitHub documentation for publishing Docker images: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- GitHub documentation for working with the Container registry: https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- actions/checkout README and releases: https://github.com/actions/checkout
- actions/cache README: https://github.com/actions/cache
- GitHub CodeQL Action README: https://github.com/github/codeql-action
- Aqua Security Trivy Action releases and incident guidance: https://github.com/aquasecurity/trivy-action/releases and https://github.com/aquasecurity/trivy/discussions/10425

## Issues Found
- Updated Docker action versions to match current official examples: `docker/setup-buildx-action@v4`, `docker/setup-qemu-action@v4`, `docker/login-action@v4`, `docker/metadata-action@v6`, and `docker/build-push-action@v7`.
- Updated GitHub action versions where current official releases have moved on: `actions/checkout@v6`, `actions/cache@v5`, and `github/codeql-action/upload-sarif@v4`.
- Replaced `aquasecurity/trivy-action@master` with `aquasecurity/trivy-action@v0.35.0` because `master` is mutable and current Trivy incident guidance points users to the safe `v0.35.0` action release.
- Added GHCR token permissions and login to full workflow examples that push to `ghcr.io`, so the examples can publish packages with `GITHUB_TOKEN`.
- Changed build-args, build-secrets, and local-cache examples from `push: true` to `push: false` when using the unqualified local tag `myapp:latest`; pushing that tag would otherwise target a registry namespace the workflow is unlikely to own.
- Replaced the unused `security-events: write` permission in the complete workflow with `attestations: write` and `id-token: write`, aligning the production workflow with current GitHub package publishing and attestation guidance.

## Review Notes
- Several sections are intentionally step-focused snippets rather than complete workflows. They are technically valid in the context of a workflow that has already configured checkout, Buildx, registry authentication, and permissions as needed.
- For stronger supply-chain security, future revisions could pin third-party actions by full commit SHA instead of version tags.
