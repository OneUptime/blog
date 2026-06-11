# Validation Summary: How to Build Docker Images with Test Stages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker multi-stage builds
- Docker BuildKit local output exporter
- Docker Compose
- GitHub Actions
- Node.js and npm
- Playwright
- Python, pip, pytest, and pytest-cov
- Go and the Go race detector
- Distroless container images

## Sources Consulted
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Docker local and tar exporters documentation: https://docs.docker.com/build/exporters/local-tar/
- Docker Compose services reference, including `depends_on` conditions: https://docs.docker.com/reference/compose-file/services/
- Docker Buildx build CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- Docker login-action documentation: https://github.com/docker/login-action
- Playwright Docker documentation: https://playwright.dev/docs/docker
- npm `ci` documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Node.js release status page: https://nodejs.org/en/about/previous-releases
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Go race detector documentation: https://go.dev/doc/articles/race_detector
- pytest-cov configuration and reporting documentation: https://pytest-cov.readthedocs.io/en/latest/config.html and https://pytest-cov.readthedocs.io/en/latest/reporting.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
- Several Dockerfile examples stated that production stages would only build after test stages passed, but the production stages did not depend on the test stages. Added `COPY --from=...` marker dependencies and a `test-gate` stage where needed so Docker actually evaluates the test stages before the production target.
- The coverage export example used `--target test-coverage --output type=local`, which would export the target stage root filesystem rather than only the coverage directory at the documented path. Added a `coverage-export` scratch stage that copies `/app/coverage` to `/coverage`, then updated the build command to target that stage.
- Node.js examples used `node:20-alpine`, but Node.js 20 is EOL as of the 2026-06-11 review date. Updated examples to `node:24-alpine`, an active LTS line.
- Alpine user creation commands used Debian-style long options. Updated them to Alpine-compatible `addgroup -g 1001 -S` and `adduser -S -u 1001 -G`.
- The conditional test example had a stale comment about the `:` no-op command even though the command did not use `:`. Removed the inaccurate comment.
- The GitHub Actions example used older Docker action major versions and attempted to push to GHCR without an explicit registry login or package write permission. Updated `docker/setup-buildx-action` to `v4`, `docker/build-push-action` to `v7`, and added `docker/login-action@v4` plus `packages: write`.
- The Playwright end-to-end test example tried to run `npx playwright install --with-deps chromium` in an Alpine-based stage. Playwright's official Docker guidance uses Ubuntu Noble images or Debian/Ubuntu-based images for browser system dependencies. Updated the E2E stage to use `mcr.microsoft.com/playwright:v1.60.0-noble` and copy the built app into it.
- The Go example used `golang:1.22-alpine`, which is outdated for this review date and a poor fit for `go test -race` without adding a C toolchain. Updated it to `golang:1.26` and made the compile stage inherit from the test stage so tests gate the final binary.
- The Python example had the same ungated production-stage pattern. Added a marker copy from the `test` stage so the production target requires tests to pass.

## Review Notes
The examples remain illustrative and depend on each application providing the referenced scripts, paths, and dependencies, such as `npm run build`, `npm run test:*`, `dist/index.js`, `requirements-dev.txt`, and `./cmd/server`. The Node examples still copy the dependency tree from the dependency stage for simplicity; production projects may prefer a separate production dependency install with development dependencies omitted.
