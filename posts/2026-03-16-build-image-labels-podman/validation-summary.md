# Validation Summary: How to Build an Image with Labels with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile syntax
- OCI image labels and annotations
- Container image inspection and filtering
- npm
- Shell scripting

## Sources Consulted
- Podman build manual: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman images manual: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman inspect manual: https://docs.podman.io/en/stable/markdown/podman-inspect.1.html
- Dockerfile reference for LABEL, ARG, FROM, COPY, CMD, WORKDIR, and layer behavior: https://docs.docker.com/reference/dockerfile/
- OCI image annotation keys: https://github.com/opencontainers/image-spec/blob/main/annotations.md
- npm ci command documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The post described combining multiple `LABEL` keys into one instruction as recommended for fewer layers. Modern Dockerfile/Containerfile builders do not create filesystem layers for `LABEL` instructions; only `RUN`, `COPY`, and `ADD` create layers. I removed the outdated layer-specific wording while preserving the example.
- The Node example used `npm ci --production`. Current npm documentation recommends `--omit=dev` for installing production dependencies without dev dependencies. I changed the command to `npm ci --omit=dev`.

## Review Notes
- Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `podman --help` output.
- The `podman images ... | xargs podman rmi` example works when matching image IDs exist. In a production script, `xargs -r` would avoid invoking `podman rmi` with no arguments on GNU systems when no images match.
