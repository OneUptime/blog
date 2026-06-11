# Validation Summary: How to Create Docker Images for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile syntax
- Docker multi-stage builds
- Node.js container images
- npm
- Google Distroless images
- Kubernetes health probes
- Trivy
- Docker Scout
- Alpine Linux packages

## Sources Consulted
- Docker Docs: Building best practices - https://docs.docker.com/build/building/best-practices/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: docker scout cves - https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Docs: Container logs - https://docs.docker.com/engine/logging/
- Node.js Docker image best practices - https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
- Node.js release schedule - https://nodejs.org/en/about/previous-releases
- Node.js process signal events - https://nodejs.org/api/process.html
- Node.js HTTP server API - https://nodejs.org/api/http.html
- npm Docs: npm ci - https://docs.npmjs.com/cli/v10/commands/npm-ci/
- GoogleContainerTools Distroless Node.js docs - https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- Kubernetes Docs: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Trivy Docs: Container image scanning - https://trivy.dev/docs/latest/guide/target/container_image/
- Trivy Docs: Filesystem scanning - https://trivy.dev/docs/latest/references/configuration/cli/trivy_filesystem/
- Trivy Docs: Exit code option - https://trivy.dev/docs/latest/configuration/others/
- Alpine Linux package index for curl and dumb-init - https://pkgs.alpinelinux.org/

## Issues Found
- The examples used Node.js 20 images. Node.js 20 is EOL as of the validation date, and current distroless Node.js docs list Node.js 22, 24, and 26 images. Updated examples to use `node:22-alpine` and `gcr.io/distroless/nodejs22-debian13`.
- The multi-stage build installed only production dependencies before running `npm run build`, which can fail when build tools are in `devDependencies`. Changed the builder stage to run `npm ci`, build the app, and then run `npm prune --omit=dev` before copying `node_modules`.
- The post said Dockerfile health checks enable Kubernetes to restart unhealthy instances. Kubernetes uses liveness, readiness, and startup probes configured in Pod specs, so the text now distinguishes Docker/Compose `HEALTHCHECK` from Kubernetes probes.
- The Node.js graceful shutdown snippet used `await server.close()`, but the HTTP server `close()` API uses a callback rather than returning a promise. Wrapped `server.close()` in a promise and added error handling.
- The post recommended installing Trivy inside the application Dockerfile with `apk add --no-cache trivy`. Trivy is not an official stable Alpine package in the normal release repositories, and adding scanners to the runtime image increases image size. Replaced this with a CI-oriented `trivy fs --exit-code 1 --severity HIGH,CRITICAL .` command.
- The pinned Docker and Alpine package examples used outdated Node.js and Alpine package versions. Updated the example to a current Node 22 Alpine tag and current Alpine package versions for the referenced packages.

## Review Notes
The post is accurate after the fixes. For production systems, pinning images by digest provides stronger reproducibility than version tags alone, but digest pinning requires an update process to avoid missing base image security updates.
