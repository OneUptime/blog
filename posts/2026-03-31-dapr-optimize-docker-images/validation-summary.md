# Validation Summary: How to Optimize Docker Images for Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (Dockerfile syntax, multi-stage builds, layer caching)
- Dapr (sidecar architecture context)
- Go (static binary compilation with CGO_ENABLED=0)
- Node.js (npm ci, package management)
- Python (pip, apt-get cleanup patterns)
- Docker Scout (vulnerability scanning)
- Trivy (vulnerability scanning)
- dive (image layer inspection)
- Google Distroless images

## Sources Consulted
- Docker official documentation on multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker official documentation on Dockerfile best practices: https://docs.docker.com/build/building/best-practices/
- npm CLI documentation for `npm ci`: https://docs.npmjs.com/cli/v10/commands/npm-ci
- npm CLI documentation on `--omit` flag (replacement for deprecated `--only`): https://docs.npmjs.com/cli/v10/using-npm/config#omit
- Docker Scout CLI reference: https://docs.docker.com/scout/
- Trivy documentation: https://aquasecurity.github.io/trivy/
- Google Distroless container images: https://github.com/GoogleContainerTools/distroless
- Dapr documentation on sidecar architecture: https://docs.dapr.io/concepts/dapr-services/sidecar/

## Issues Found

### Issue 1: Deprecated npm flag `--only=production`
- **What was wrong:** The Node.js Dockerfile example used `npm ci --only=production`. The `--only` flag was deprecated in npm 7 (shipped with Node 15). Node 20 ships with npm 10, where `--only` is deprecated and replaced by `--omit`.
- **What was changed:** Replaced `npm ci --only=production` with `npm ci --omit=dev`.
- **Why:** Using the current, non-deprecated flag ensures the example works correctly and doesn't produce deprecation warnings with Node 20's bundled npm.

### Issue 2: Missing `COPY requirements.txt` in Python Dockerfile
- **What was wrong:** The Python Dockerfile ran `pip install --no-cache-dir -r requirements.txt` without first copying `requirements.txt` into the container. This would cause the build to fail with a "file not found" error.
- **What was changed:** Added `COPY requirements.txt ./` before the `RUN` command.
- **Why:** The file must exist in the container's filesystem before pip can read it.

## Review Notes
- The base image sizes in the comparison table are approximate and will vary over time as upstream images are updated. The relative ordering and magnitudes are correct.
- The `golang:1.22-alpine` image is a valid choice but authors may want to update to newer Go versions (e.g., 1.23+) as they become available.
- The `node:20-alpine` image is an LTS release and a good choice at time of writing. Node 20 LTS maintenance ends April 2026.
- The post correctly notes that Dapr sidecars are injected at runtime, meaning application images don't need to include the Dapr binary.
