# Validation Summary: How to Use Docker Bake with Matrix Builds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Buildx Bake
- Docker Bake HCL configuration
- Docker matrix targets
- Dockerfile build arguments
- Multi-platform Docker builds
- GitHub Actions CI/CD
- Node.js and npm
- Alpine Linux and Ubuntu base images

## Sources Consulted
- Docker Bake file reference: https://docs.docker.com/build/bake/reference/
- Docker Buildx Bake CLI reference: https://docs.docker.com/reference/cli/docker/buildx/bake/
- Docker Buildx Bake guide, including matrix examples: https://docs.docker.com/guides/bake/
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- npm `ci` command documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js release schedule and EOL status: https://github.com/nodejs/release
- Node.js End-of-Life information: https://nodejs.org/en/about/eol
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Local Docker Buildx CLI validation with Docker Buildx v0.33.0 and `docker buildx bake --help` / `docker buildx bake --print`

## Issues Found
- **Missing default group in the first Bake example**: The post showed `docker buildx bake` after defining only a matrix target named `app`. Without a target or group named `default`, `docker buildx bake` fails with `failed to find target default`. Added a `group "default"` that references `app`, allowing the command to build all generated matrix targets.
- **EOL Node.js versions in examples**: The post used Node.js 18 and 20 examples. As of June 4, 2026, Node.js 18 and 20 are EOL. Updated examples to use Node.js 22, 24, and 26 where multiple runtime versions are demonstrated, and changed single-version Node base images to Node.js 24.
- **Deprecated npm production install flag**: `npm ci --production` works but current npm warns to use `--omit=dev` instead. Replaced `npm ci --production` with `npm ci --omit=dev`.
- **EOL Alpine base image**: The inheritance example used `alpine:3.19`, which is EOL as of November 1, 2025. Updated it to `alpine:3.23`.
- **Invalid generated Bake target names**: The inheritance example generated names like `tool-1.0-alpine`; Docker Bake target names only allow letters, numbers, underscores, and hyphens. Changed the `name` expression to remove dots from the version only for the generated target name while keeping image tags unchanged.

## Review Notes
- The matrix syntax, `name` override behavior, target inheritance, groups, `platforms`, `args`, `tags`, and `--print`, `--push`, and `--progress=plain` usage were checked against Docker documentation and local Buildx behavior.
- The GitHub Actions workflow structure and Docker actions usage are technically valid, but action major versions may need routine updates over time.
