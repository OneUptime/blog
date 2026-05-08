# Validation Summary: How to Target a Specific Build Stage with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile multi-stage builds
- Node.js and npm
- Jest
- Go
- Python
- CI/CD shell scripting

## Sources Consulted
- Podman `podman-build` official documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman `podman-run` / volume mount official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Docker multi-stage builds official documentation: https://docs.docker.com/build/building/multi-stage/
- npm `npm ci` official documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Jest CLI options official documentation: https://jestjs.io/docs/cli

## Issues Found
- The Node.js production stage used `npm ci --production`. Updated it to `npm ci --omit=dev` because current npm documentation describes `omit` as the supported way to omit development dependencies from the installed tree.
- The Jest example used `--testPathPattern`. Updated it to `--testPathPatterns` to match the current official Jest CLI option name.

## Review Notes
Podman is not installed in the local review environment, so commands could not be executed locally. The Podman flags and volume syntax were verified against official Podman documentation instead. The post's core `podman build --target` explanation is accurate: Podman's documentation states that `--target` selects a named intermediate build stage as the final image and skips commands after that target stage.
