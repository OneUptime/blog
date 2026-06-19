# Validation Summary: How to Build Docker Images with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Docker Buildx and BuildKit
- GitHub Container Registry
- Docker Hub and Amazon ECR
- Docker metadata, login, setup-buildx, setup-qemu, and build-push actions
- Trivy vulnerability scanning
- SARIF upload to GitHub code scanning
- Multi-architecture Docker images
- Build cache, build arguments, secrets, provenance, and SBOM attestations

## Sources Consulted
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- Docker build-push-action README: https://github.com/docker/build-push-action
- Docker login-action README: https://github.com/docker/login-action
- Docker metadata-action README: https://github.com/docker/metadata-action
- Docker multi-platform GitHub Actions docs: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker GitHub Actions cache docs: https://docs.docker.com/build/ci/github-actions/cache/
- Docker GitHub Actions secrets docs: https://docs.docker.com/build/ci/github-actions/secrets/
- Docker GitHub Actions attestations docs: https://docs.docker.com/build/ci/github-actions/attestations/
- Docker Build attestations and imagetools inspect docs: https://docs.docker.com/build/metadata/attestations/ and https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- GitHub Container Registry docs: https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub SARIF upload docs: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- actions/checkout releases: https://github.com/actions/checkout/releases
- aquasecurity/trivy-action releases: https://github.com/aquasecurity/trivy-action/releases

## Issues Found
- Several Docker action examples used older major versions (`docker/login-action@v3`, `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v6`, and `docker/metadata-action@v5`). Updated them to the current documented majors used in Docker's official examples.
- The Trivy and SARIF upload examples used older action references. Updated Trivy to `aquasecurity/trivy-action@v0.35.0` and SARIF upload to `github/codeql-action/upload-sarif@v4`.
- Multiple GHCR push examples omitted `permissions: packages: write`, which can prevent `GITHUB_TOKEN` from publishing packages. Added `contents: read` and `packages: write` where needed.
- The security scanning workflow uploaded SARIF without declaring `security-events: write`. Added the required permission.
- The security scanning workflow rebuilt the image after scanning, so the pushed image was not necessarily the exact scanned local artifact. Changed the example to tag the local image as the GHCR image, scan that tag, and push it with `docker push` after the scan passes.
- The build arguments section pushed to GHCR without logging in or granting package permissions. Added the GHCR login and permissions.
- The build arguments comment said build args are visible in image layers. Adjusted it to the more accurate warning that build args are not for secrets and can appear in image metadata.
- The provenance section stated `id-token: write` was required for provenance. Docker's current attestation examples do not require it for `provenance` or `sbom`, so the inaccurate permission claim was removed.

## Review Notes
The examples are technically valid as tutorial snippets. The layer caching section shows two alternative build steps in one job; in a real workflow, users should choose one cache strategy rather than run both.
