# Validation Summary: How to Run Aqua Security Scanner in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Aqua Security Trivy
- Container image vulnerability scanning
- Filesystem scanning
- Infrastructure as Code misconfiguration scanning
- Secret scanning
- SBOM generation and scanning
- GitHub Actions
- GitLab CI
- Jenkins Pipeline

## Sources Consulted
- Trivy installation docs: https://www.trivy.dev/docs/v0.69/getting-started/installation/
- Trivy container image target docs: https://www.trivy.dev/docs/v0.69/guide/target/container_image/
- Trivy CLI help from the current `aquasec/trivy:latest` Docker image
- Trivy reporting docs: https://trivy.dev/docs/v0.59/configuration/reporting/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy GitLab CI integration docs: https://www.trivy.dev/docs/dev/tutorials/integrations/gitlab-ci/
- Trivy client/server mode docs: https://trivy.dev/v0.57/docs/references/modes/client-server/
- Trivy filtering and `.trivyignore` docs: https://trivy.dev/docs/latest/configuration/filtering/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- Updated the GitHub Actions example from `aquasecurity/trivy-action@master` to `aquasecurity/trivy-action@v0.36.0`, updated SARIF upload from `github/codeql-action/upload-sarif@v3` to `@v4`, quoted Trivy Action string inputs, and added the `security-events: write` permission required for SARIF uploads.
- Reworked the GitLab CI example so it uses the Docker-in-Docker service through `DOCKER_HOST` and runs the Trivy binary in the job container, matching the official GitLab integration pattern. The previous example launched a Trivy sibling container and mounted `/var/run/docker.sock`, which would not work with the shown DinD setup because that socket is not present in the job container.
- Removed the obsolete top-level `version: "3.8"` field from the Docker Compose example, because current Compose treats it as backward-compatible metadata and warns that it is obsolete.
- Added a named Compose network and `--network trivy-net` to the Docker client command for Trivy server mode. The previous command used the Compose service DNS name `trivy-server` from a standalone `docker run` container that was not attached to the Compose network.
- Added `--ignorefile /root/.trivyignore` to the custom ignore example. The Trivy container's working directory is `/`, so mounting the file at `/root/.trivyignore` without this flag would not use it as the default `.trivyignore`.

## Review Notes
- The remaining Trivy commands and flags were checked against the current `aquasec/trivy:latest` CLI help and official documentation.
- For production CI pipelines, pinning Trivy Docker images and GitHub Actions to immutable versions or commit SHAs would improve supply-chain control, but the examples are technically valid as written.
