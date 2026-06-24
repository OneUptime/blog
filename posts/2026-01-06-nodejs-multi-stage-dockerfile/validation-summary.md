# Validation Summary: How to Containerize Node.js Apps with Multi-Stage Dockerfiles

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Node.js
- npm
- Docker and Dockerfiles
- Docker BuildKit
- Docker Buildx multi-platform builds
- Alpine Linux container images
- Google Distroless Node.js images
- Trivy
- GitHub Actions and SARIF upload
- TypeScript
- NestJS

## Sources Consulted
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Docker Dockerfile reference for cache and secret mounts: https://docs.docker.com/reference/dockerfile/
- Docker multi-platform build documentation: https://docs.docker.com/build/building/multi-platform/
- Docker official Node image tags: https://hub.docker.com/_/node
- Node.js release schedule and EOL documentation: https://nodejs.org/en/about/previous-releases and https://nodejs.org/en/about/eol
- npm Docker private modules documentation: https://docs.npmjs.com/docker-and-private-modules/
- npm CLI manuals for `npm ci` and `npm prune` via local npm 10.9.4 help output
- Google Distroless Node.js image documentation: https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- Trivy GitHub Action documentation and marketplace examples: https://github.com/aquasecurity/trivy-action and https://github.com/marketplace/actions/aqua-security-trivy
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- CodeQL Action supported versions: https://github.com/github/codeql-action
- Local CLI checks: `docker buildx build --help`, `docker buildx create --help`, `npm help ci`, and `npm help prune`

## Issues Found
- The examples used `node:20` and `gcr.io/distroless/nodejs20-debian12`, but Node.js 20 is EOL as of the current validation date. Updated the Node image examples to Node.js 24 LTS and the distroless example to `gcr.io/distroless/nodejs24-debian13`.
- The distroless example built dependencies on Alpine and copied them into a Debian-based distroless image, which can break native modules because Alpine uses musl while Debian images use glibc. Updated the distroless build stage to `node:24-trixie-slim` to match the Debian 13 distroless runtime more closely.
- The Dockerfiles used `npm prune --production`; current npm documentation prefers the explicit `--omit=dev` flag. Updated prune commands to `npm prune --omit=dev`.
- The GitHub Actions workflow used outdated action references and lacked SARIF upload permissions. Updated checkout to `actions/checkout@v6`, Trivy to `aquasecurity/trivy-action@v0.36.0`, SARIF upload to `github/codeql-action/upload-sarif@v4`, and added `contents: read` plus `security-events: write` permissions.
- The BuildKit secret example ran `npm ci` before copying package files and mounted a raw token that npm would not automatically consume. Added `COPY package*.json ./` before `npm ci` and changed the example to mount an `.npmrc` secret at `/root/.npmrc`, matching npm's documented Docker private modules pattern.
- The multi-architecture `docker buildx build` command placed comments after line-continuation backslashes, which makes the shell command invalid. Moved the explanation into standalone comments before the command and kept the command syntactically valid.
- The size comparison table referenced Node.js 20 image names. Updated the labels to Node.js 24 variants.

## Review Notes
- Image sizes are approximate and will vary by exact base image digest, architecture, application dependencies, and package lockfile.
- `--ignore-scripts` is a valid npm option and can reduce install-time script execution risk, but some dependencies with required install or postinstall scripts may not work with it.
- Alpine-based Node.js images are small, but native modules may need additional compatibility packages or a Debian-based runtime depending on dependency requirements.
