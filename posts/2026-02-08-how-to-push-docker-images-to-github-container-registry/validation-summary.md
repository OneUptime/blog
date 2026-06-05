# Validation Summary: How to Push Docker Images to GitHub Container Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- GitHub Container Registry (GHCR)
- GitHub Packages
- GitHub Actions
- Docker Buildx
- Kubernetes image pull secrets
- GitHub CLI

## Sources Consulted
- GitHub Docs: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Publishing and installing a package with GitHub Actions - https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub Docs: Configuring a package's access control and visibility - https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- GitHub Docs: REST API endpoints for packages - https://docs.github.com/en/rest/packages/packages
- GitHub Docs: GitHub Packages billing - https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-packages
- Docker Docs: GitHub Actions cache backend - https://docs.docker.com/build/cache/backends/gha/
- docker/login-action documentation - https://github.com/docker/login-action
- docker/metadata-action documentation - https://github.com/docker/metadata-action
- docker/build-push-action documentation - https://github.com/docker/build-push-action
- actions/delete-package-versions documentation - https://github.com/actions/delete-package-versions
- Local CLI help: `docker login --help`, `gh api --help`

## Issues Found
- The PAT login verification command tried to pull `ghcr.io/library/hello-world`, which is not a reliable GHCR verification image and pulling a public image would not prove authenticated access. Replaced it with the Docker login success output expectation.
- The post said `GITHUB_TOKEN` has `write:packages` by default. GitHub recommends explicitly setting workflow permissions, and package upload examples grant `packages: write`. Updated the wording to instruct readers to grant that permission.
- Several GitHub Actions snippets used older major action tags. Updated the examples to the current major tags verified from the official action repositories: `actions/checkout@v6`, `docker/login-action@v4`, `docker/metadata-action@v6`, `docker/setup-buildx-action@v4`, `docker/setup-qemu-action@v4`, and `docker/build-push-action@v7`.
- The GitHub CLI example for changing package visibility used a non-existent package REST endpoint. Replaced it with the supported GitHub package settings page path.
- The GitHub CLI example for adding a package collaborator used a non-existent package REST endpoint. Replaced it with the documented package settings workflow for inviting users or teams and assigning roles.
- The GHCR billing description implied private container images are governed by the normal GitHub Packages allowance. GitHub's billing docs currently state that Container registry image storage and bandwidth are free, so the wording was updated.
- The metadata-action explanation said the configured semver pattern would create `v1.2.3` and `v1.2` tags. With `pattern={{version}}` and `pattern={{major}}.{{minor}}`, a Git tag like `v1.2.3` produces `1.2.3` and `1.2`, so the examples were corrected.
- The Docker Hub comparison claimed GHCR has no pull rate limits. I did not find that stated in the official GitHub documentation, so the unsupported claim was removed while preserving the cost comparison.

## Review Notes
The `actions/delete-package-versions@v5` cleanup example is consistent with the action documentation for deleting untagged container package versions. The GitHub REST API examples for listing and deleting package versions match the documented `/user/packages/{package_type}/{package_name}/versions` endpoints, but deleting versions requires appropriate package admin permissions and `read:packages` plus `delete:packages` scopes when using a classic PAT.
