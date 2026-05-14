# Validation Summary: How to Build and Push Container Images with GitHub Actions for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Docker Buildx
- Docker GitHub Actions: setup-buildx-action, setup-qemu-action, login-action, metadata-action, build-push-action
- GitHub Container Registry (GHCR)
- Flux CD image-reflector-controller and image-automation-controller
- Flux ImageRepository, ImagePolicy, and ImageUpdateAutomation APIs
- Kubernetes Secrets and kubectl
- Trivy vulnerability scanning
- GitHub code scanning SARIF uploads
- Node.js Dockerfile multi-stage builds

## Sources Consulted
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- Docker metadata-action documentation: https://github.com/docker/metadata-action
- Docker setup-buildx-action documentation: https://github.com/docker/setup-buildx-action
- Docker setup-qemu-action documentation: https://github.com/marketplace/actions/docker-setup-qemu
- Docker login-action documentation: https://github.com/docker/login-action
- Docker GitHub Actions cache backend documentation: https://docs.docker.com/build/cache/backends/gha/
- GitHub checkout action documentation: https://github.com/actions/checkout
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- GitHub CodeQL upload-sarif action documentation: https://github.com/github/codeql-action
- Aqua Security Trivy GitHub Action documentation: https://github.com/marketplace/actions/aqua-security-trivy
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI reconcile image repository documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Kubernetes kubectl create secret docker-registry documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes kubectl logs documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/

## Issues Found
- The GitHub Actions snippets used older Docker and GitHub action major versions. Updated checkout to v6, Docker setup/login actions to current documented major versions, docker/metadata-action to v6, docker/build-push-action to v7, Trivy action to v0.36.0, and github/codeql-action/upload-sarif to v4.
- The build snippets described SHA tagging as short SHA, but the Trivy scan targeted the full `${{ github.sha }}` tag. Updated Docker metadata SHA tags to `type=sha,prefix=,format=long` so the pushed image tag matches the scan target.
- The cache comment said the build used registry caching, but `type=gha` uses the GitHub Actions cache backend. Updated the wording.
- The SARIF upload example lacked the required `security-events: write` permission. Added `contents: read`, `packages: read`, and `security-events: write` to the scan job.
- The Trivy scan of a GHCR image did not provide registry credentials. Added `TRIVY_USERNAME` and `TRIVY_PASSWORD` using the workflow actor and `GITHUB_TOKEN`.
- The Dockerfile installed production-only dependencies before running `npm run build`, which can fail when builds need devDependencies, and it used the outdated `npm ci --only=production` form. Split dependency installation into build and production dependency stages and used `npm ci --omit=dev` for production dependencies.
- The troubleshooting section told readers to inspect `source-controller` logs for image scanning problems. Updated the command to inspect `image-reflector-controller`, which owns ImageRepository scans.

## Review Notes
The Flux API examples use the current `image.toolkit.fluxcd.io/v1` API and the image policy marker syntax is correct. The `kubectl create secret docker-registry` command remains valid, including the documented `--docker-email` flag. The examples still use mutable major tags for GitHub Actions, which is common in tutorials, but production workflows may prefer pinning actions by commit SHA.
