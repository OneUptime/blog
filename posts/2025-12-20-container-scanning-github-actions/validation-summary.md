# Validation Summary: How to Set Up Container Scanning in GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions
- Docker and Docker Buildx
- GitHub Container Registry
- Trivy
- Grype
- GitHub code scanning and SARIF uploads
- Dockerfile base image practices

## Sources Consulted
- Aqua Security Trivy Action README: https://github.com/aquasecurity/trivy-action
- Trivy filtering and ignore-file documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Aqua Security Trivy 2026 security incident discussion: https://github.com/aquasecurity/trivy/discussions/10425
- Anchore Scan Action README: https://github.com/anchore/scan-action
- GitHub Docs, uploading SARIF files: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- Docker Build Push Action README: https://github.com/docker/build-push-action
- Docker Setup Buildx Action documentation: https://docs.docker.com/build/ci/github-actions/configure-builder/
- Docker Login Action releases and README: https://github.com/docker/login-action
- Actions Checkout releases: https://github.com/actions/checkout/releases

## Issues Found
- The post used floating `aquasecurity/trivy-action@master` references. Updated Trivy examples to `aquasecurity/trivy-action@v0.36.0`, matching current official examples and avoiding a floating branch reference.
- Several GitHub Actions examples used older action majors. Updated examples to current documented majors: `actions/checkout@v6`, `github/codeql-action/upload-sarif@v4`, `docker/setup-buildx-action@v4`, `docker/build-push-action@v7`, and `docker/login-action@v4`.
- Several SARIF upload jobs were missing explicit `security-events: write` permissions. Added `security-events: write`, `contents: read`, and `actions: read` where SARIF is uploaded, matching GitHub's SARIF upload guidance.
- The Buildx scan/push workflow rebuilt the image during the push step, so it did not necessarily push the same local image that had just been scanned. Changed the workflow to build and load the registry-tagged image, scan that tag, and push it with `docker push`.
- The "Scanning During Image Build" wording claimed layers were scanned as they build, but the workflow scanned after the image was built. Renamed the section to "Scanning Before Image Push" and adjusted the description.
- The scheduled scan's notification step used `if: failure()` but the Trivy SARIF scan did not set a non-zero exit code for vulnerabilities. Added `exit-code: '1'`, a critical/high severity filter, and `if: always()` on SARIF upload so findings are uploaded before notification.
- The GHCR push/pull examples did not declare package permissions. Added `packages: write` for the push workflow and `packages: read` for the scheduled pull workflow.

## Review Notes
- For stronger supply-chain hardening, production workflows can pin third-party actions to full commit SHAs instead of version tags.
- GitHub code scanning availability depends on repository type and GitHub Code Security settings for private and internal repositories.
