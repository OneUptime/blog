# Validation Summary: How to Use Google Distroless Base Images to Reduce Container Attack Surface for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Distroless container images
- Docker and multi-stage Dockerfiles
- Node.js 22
- Express.js
- TypeScript build workflows
- Google Cloud Run
- Google Cloud Build
- Artifact Registry On-Demand Scanning
- Grype vulnerability scanning

## Sources Consulted
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless
- GoogleContainerTools Distroless Node.js example Dockerfile: https://github.com/GoogleContainerTools/distroless/blob/main/examples/nodejs/Dockerfile
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- gcloud artifacts docker images scan reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- gcloud artifacts docker images list-vulnerabilities reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list-vulnerabilities
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Dockerfile reference: https://docs.docker.com/reference/builder
- Express 5.x API reference: https://expressjs.com/en/api.html

## Issues Found
- The post stated that the default distroless Node.js image runs as a non-root user with uid 65534. The default `gcr.io/distroless/nodejs22-debian12` image runs as uid 0, while the `:nonroot` variant runs as uid 65532. Updated the Dockerfile examples to use `gcr.io/distroless/nodejs22-debian12:nonroot` and corrected the comment.
- The main Dockerfile comment said the Node.js binary path is already in `PATH`. The image sets `/nodejs/bin/node` as its entrypoint instead, so the comment was updated to explain why `CMD ["src/server.js"]` works.
- The shell demonstration used `docker run gcr.io/distroless/nodejs22-debian12 /bin/sh`, which passes `/bin/sh` as an argument to the Node.js entrypoint instead of executing it. Updated the command to override the entrypoint so it accurately demonstrates that `/bin/sh` is absent.
- The debug command used `docker run ...:debug sh`, which also passes `sh` to the Node.js entrypoint. Updated it to use `--entrypoint=sh` with the `:debug-nonroot` image.
- The image size table had outdated approximate sizes for current `node:22`, `node:22-slim`, `node:22-alpine`, and `gcr.io/distroless/nodejs22-debian12` images. Updated the approximate unpacked image sizes based on locally pulled current images.

## Review Notes
The `gcloud` CLI was not installed locally, so Google Cloud CLI commands were verified against the official command references rather than local `--help` output. The Docker image behavior and size checks were verified locally with Docker.
