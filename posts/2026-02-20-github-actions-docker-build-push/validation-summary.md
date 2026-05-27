# Validation Summary: How to Build and Push Docker Images with GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions
- Docker Buildx
- Docker Build Push Action
- Docker Metadata Action
- GitHub Container Registry
- Docker Hub
- Amazon ECR
- npm
- Trivy
- Mermaid

## Sources Consulted
- Docker Docs: Introduction to GitHub Actions with Docker: https://docs.docker.com/guides/gha/
- Docker Docs: Configuring your GitHub Actions builder: https://docs.docker.com/build/ci/github-actions/configure-builder/
- Docker Docs: Multi-platform image with GitHub Actions: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker Docs: GitHub Actions cache backend: https://docs.docker.com/build/cache/backends/gha/
- Docker Docs: Cache management with GitHub Actions: https://docs.docker.com/build/ci/github-actions/cache/
- GitHub Docs: Publishing Docker images: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- GitHub Actions checkout releases: https://github.com/actions/checkout/releases
- Docker Metadata Action README: https://github.com/docker/metadata-action
- AWS Amazon ECR Login Action README: https://github.com/aws-actions/amazon-ecr-login
- Trivy Action README: https://github.com/aquasecurity/trivy-action
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/

## Issues Found
- The GitHub Actions examples used older major versions of maintained actions. Updated `actions/checkout` from `v4` to `v6`, Docker Buildx setup from `v3` to `v4`, Docker login from `v3` to `v4`, Docker metadata from `v5` to `v6`, and Docker build/push from `v5` to `v7` to match current official examples and releases.
- The GHCR login step ran on pull request builds even though the image is not pushed for pull requests. Added `if: github.event_name != 'pull_request'` to match the build/push behavior and avoid unnecessary registry authentication on PR builds.
- The Dockerfile used `npm ci --only=production`. Updated it to `npm ci --omit=dev`, which is the current npm option for omitting development dependencies.
- The Trivy example used `aquasecurity/trivy-action@master`. Updated it to the current pinned release shown in the Trivy Action documentation, `aquasecurity/trivy-action@v0.36.0`.

## Review Notes
The AWS ECR example remains technically valid with static AWS access key secrets, but AWS and the action maintainers recommend OIDC role assumption for production workflows to avoid long-lived credentials.
