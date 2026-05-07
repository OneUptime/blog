# Validation Summary: How to Use Secrets During Podman Image Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile image builds
- Build-time secrets
- npm private package authentication
- Go modules and private repository access
- SSH keys

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman build documentation for older supported syntax: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- npm documentation for private packages in CI/CD workflows: https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow
- Go Modules Reference: https://go.dev/ref/mod
- Dockerfile reference for RUN mount syntax: https://docs.docker.com/reference/builder

## Issues Found
- The npm example set `NPM_TOKEN` during `npm install` but did not show that npm needs an `.npmrc` configuration that references `${NPM_TOKEN}`. Added `COPY .npmrc ./` and clarified the comment so the token is actually consumed by npm as documented.
- The Go example ran `go mod download` before copying `go.mod` and `go.sum` into the build stage. Added `WORKDIR /src` and `COPY go.mod go.sum ./` before the secret-mounted `go mod download` step.
- The Go example comment said the SSH key was used to clone private repos, but the command shown was `go mod download`. Updated the comment to say it downloads private modules.

## Review Notes
- Podman build secrets are documented as available through `podman build --secret=id=...,src=...` and `RUN --mount=type=secret,id=...`, mounted at `/run/secrets/id` by default.
- Current Podman documentation also supports reading build secrets from environment variables with the `env` option. The post's temporary-file approach remains valid.
- The private Go module example may still require project-specific Go settings such as `GOPRIVATE` or Git URL rewriting depending on the private module host and import paths.
