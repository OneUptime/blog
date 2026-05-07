# Validation Summary: How to Use SHELL Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Buildah
- Containerfiles / Dockerfiles
- Bash and POSIX shell behavior
- Alpine Linux
- npm
- Hadolint

## Sources Consulted
- Podman build manual: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Dockerfile reference (`SHELL`, shell vs exec form): https://docs.docker.com/reference/dockerfile/
- OCI image configuration spec: https://github.com/opencontainers/image-spec/blob/main/config.md
- Buildah source (`SetShell` behavior and OCI persistence note): https://github.com/containers/buildah/blob/main/config.go
- Buildah implementation for shell-form `CMD` and `ENTRYPOINT`: https://github.com/containers/buildah/blob/main/vendor/github.com/openshift/imagebuilder/dispatchers.go
- Buildah tests covering `SHELL` behavior during OCI and Docker builds: https://github.com/containers/buildah/blob/main/tests/bud.bats
- Podman project documentation on Windows/macOS using a Linux VM via `podman machine`: https://github.com/containers/podman and https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md
- GNU Bash manual (`pipefail`, arrays, invocation options): https://www.gnu.org/software/bash/manual/bash.html
- Hadolint rule list (`DL4006`): https://github.com/hadolint/hadolint
- npm `ci` docs and config deprecation notes: https://docs.npmjs.com/cli/v8/commands/npm-ci/ and https://docs.npmjs.com/cli/v10/using-npm/config/?v=true

## Issues Found
- The post overstated Podman support by implying `SHELL` could be relied on for shell-form `CMD` and `ENTRYPOINT` the same way as the generic Dockerfile reference. I corrected the explanation to reflect current Podman/Buildah behavior: with the default `oci` output, `SHELL` is best treated as a build-time tool for subsequent shell-form `RUN` instructions, and shell metadata is not persisted unless you build with `--format docker`.
- The introduction framed `SHELL` as enabling Windows container compatibility and mentioned PowerShell for Windows containers. That is misleading in a Podman-specific article, because current Podman documentation describes Windows usage through a Linux VM (`podman machine`), not native Windows-container support. I removed the Windows-container framing.
- The `pipefail` example was technically broken because `|| true` masked the failure it was meant to demonstrate. I removed the mask and aligned the before/after example so the `pipefail` behavior is shown correctly.
- The debugging example used `npm ci --only=production`. npm documents the `only`/`production` alias as deprecated in favor of `--omit=dev`, so I updated the command.

## Review Notes
- Podman `build` defaults to OCI format. If a workflow needs Docker-specific shell metadata preserved for later child builds, `podman build --format docker` is the relevant escape hatch, but exec-form `CMD` and `ENTRYPOINT` remain the safer production pattern.
- Podman was not installed in the review environment, so validation was performed against official documentation, upstream source, and upstream tests rather than a live local `podman build` run.
