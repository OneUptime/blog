# Validation Summary: How to Configure Podman for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- GitHub Actions
- GitLab CI/CD
- GitHub Container Registry
- GitLab Container Registry
- Trivy
- QEMU user-mode emulation
- Container registry authentication
- Container image layer caching
- Dockerfile / Node.js container builds
- Kubernetes deployments
- OneUptime OTLP telemetry ingestion

## Sources Consulted
- Podman build command reference: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman manifest command reference: https://docs.podman.io/en/stable/markdown/podman-manifest.1.html
- Podman push command reference: https://docs.podman.io/en/v5.3.1/markdown/podman-push.1.html
- Podman login command reference: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- containers-auth.json reference: https://github.com/containers/image/blob/main/docs/containers-auth.json.5.md
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- GitHub runner images Ubuntu 24.04 included software: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Packages permissions documentation: https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime local OTLP ingest routes: `/home/simon-larsen/oneuptime/oneuptime/App/FeatureSet/Telemetry/API/OTelIngest.ts`

## Issues Found
- The GitHub Actions Trivy scan mounted a Podman socket as a Docker socket and scanned an image name from inside the Trivy container. Replaced it with `podman save --format docker-archive` and `trivy image --input`, which works against the image archive available in the workspace.
- The GHCR examples used `GITHUB_TOKEN` for package pushes without declaring `packages: write`. Added `permissions` blocks to the relevant GitHub Actions jobs.
- The multi-architecture example built the same manifest in separate commands and pushed without `--all`. Updated it to build both platforms into one manifest and push the complete manifest list.
- The GitLab Trivy scan attempted to scan a host-local Podman image from inside the Trivy container. Updated it to scan the saved image archive with `--input`.
- The credential-helper example used obsolete `registries.conf` v1 syntax, an invalid empty mirror table, and wildcard `credHelpers` keys. Updated it to current `unqualified-search-registries` syntax and concrete ECR registry helper keys.
- The cache examples used `--cache-from` without `--layers`, which Podman documents as ignored. Added `--layers` where needed and updated the GitLab registry-cache example to use `--cache-to`.
- The Dockerfile installed only production dependencies before running a build, which can break TypeScript or bundler builds that require dev dependencies. Split dependency installation into full build dependencies and production-only runtime dependencies using `npm ci --omit=dev`.
- The production GitHub Actions workflow's deploy job referenced `needs.build.outputs.image-tag` without depending on `build`. Updated `deploy` to need both `build` and `push`.
- The monitoring snippet used nonexistent GitHub Actions context `${{ job.duration }}`. Replaced it with an explicit `$GITHUB_ENV` start timestamp and shell-calculated duration.
- The OneUptime examples used unsupported `/api/deployment` and `/api/ingest/metrics` endpoints. Replaced them with OTLP HTTP log and metric ingestion calls using `/otlp/v1/logs`, `/otlp/v1/metrics`, and the `x-oneuptime-token` header.

## Review Notes
The post is validated after the fixes. The examples still assume runner environments with sufficient privileges for Podman-in-container use and valid registry/cloud credentials, which readers must configure for their own CI runners.
