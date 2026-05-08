# Validation Summary: How to Reduce Image Size with Podman Builds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile builds
- Container image layers
- Multi-stage builds
- Alpine Linux package management
- Debian/Ubuntu package management
- Node.js npm
- Go builds
- Static container images with scratch and distroless

## Sources Consulted
- Podman `podman build` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman system df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `.containerignore` documentation: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Docker image layer documentation: https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/
- Dockerfile `RUN` instruction documentation: https://docs.docker.com/reference/builder
- npm `npm ci` official documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Go linker command documentation: https://go.dev/pkg/cmd/link/

## Issues Found
- The base image comparison command used three separate `--filter reference=...` options, which does not reliably show all of the pulled images together and also omitted the distroless image that the example pulled. Changed it to format the image list and filter the displayed rows with `grep -E`.
- The npm examples used `npm ci --production` and `npm prune --production`. Updated them to the current documented npm form, `--omit=dev`, which omits development dependencies for production installs/prunes.

## Review Notes
Podman was not installed in the local environment, so CLI checks were verified against the official Podman documentation rather than local `--help` output. The image size numbers are presented as typical examples; actual sizes can vary by architecture, tag updates, registry metadata, and whether the displayed value is compressed or unpacked size.
