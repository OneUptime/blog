# Validation Summary: How to Build an Image from a Dockerfile with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Dockerfile / Containerfile syntax
- Container image builds
- Docker CLI compatibility
- Docker Compose build migration
- npm / Node.js
- Python container images

## Sources Consulted
- Podman build official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman system service official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Dockerfile reference: https://docs.docker.com/reference/builder/
- npm ci official documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- npm install official documentation: https://docs.npmjs.com/cli/v11/commands/npm-install/
- Containerfile man page: https://manpages.ubuntu.com/manpages/jammy/man5/containers-containerfile.5.html

## Issues Found
- The Node.js Dockerfile used `npm ci --production` but the sample project did not create a `package-lock.json` or `npm-shrinkwrap.json`. Since `npm ci` requires an existing lockfile, changed the command to `npm install --omit=dev`.
- The post claimed Podman supports the same build flags as Docker and that commands work identically. Podman documents broad Dockerfile support and many compatible flags, but not complete Docker CLI build parity. Softened the wording to "many common Docker build flags."
- The description and introduction described "full compatibility" too broadly. Updated those statements to "broad compatibility."
- The example `podman build --progress=plain` was not found in the official Podman build options. Replaced it with the documented `--quiet` option.
- The "all Docker-specific Dockerfile instructions" claim was too broad. Reworded it to standard Dockerfile instructions with examples.
- The BuildKit inline cache example incorrectly used `--format docker`, which controls the built image's manifest/configuration format rather than inline cache. Replaced it with Podman's documented remote cache options using `--layers`, `--cache-to`, and `--cache-from`.
- The testing section labeled `podman inspect test --format '{{.State.Status}}'` as a health check, but it returns the container status. Updated the comment to "Check container status."
- The file detection example said `ls` checks which file Podman will use, but it only lists whether `Containerfile` and `Dockerfile` exist. Updated the comment to match the command.
- The summary overstated compatibility by saying all build flags work identically and that migration requires no changes. Updated it to reflect broad Dockerfile compatibility with some Podman-specific behavior.

## Review Notes
Podman was not installed in the local environment, so CLI validation was performed against official Podman documentation rather than local `podman --help` output. The examples remain intentionally simple and assume users have Podman installed and can pull the referenced base images.
