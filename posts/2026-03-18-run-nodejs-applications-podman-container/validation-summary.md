# Validation Summary: How to Run Node.js Applications in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- npm
- Podman
- Containerfile / Dockerfile syntax
- Alpine Linux containers
- systemd user services
- Container health checks and resource limits

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman generate systemd documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Node.js Release Working Group schedule: https://github.com/nodejs/Release
- Node.js Docker Official Image: https://hub.docker.com/_/node
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci
- npm prune documentation: https://docs.npmjs.com/cli/v10/commands/npm-prune
- Node.js CLI documentation for `--max-old-space-size`: https://nodejs.org/api/cli.html
- Dockerfile reference for multi-stage `COPY --from` and `COPY --chown`: https://docs.docker.com/reference/builder

## Issues Found
- The post used `docker.io/library/node:20-alpine` while describing it as an LTS base image. Node.js 20 reached end-of-life on April 30, 2026, so the examples now use `docker.io/library/node:24-alpine`, which is an active LTS line as of this validation date.
- The introduction said Podman provides "rootless execution by default." Podman supports rootless containers, but containers can also be run by root, so the wording was changed to "support for rootless execution."
- The multi-stage build comment said `node:20-alpine` was a "full Node.js image" that includes build tools. Alpine images are minimal and do not include common native build toolchain packages by default, so the comment now says to add packages like `python3`, `make`, and `g++` if native dependencies require them.
- The multi-stage build used `npm prune --production`. This works as a legacy alias, but current npm documentation uses `--omit=dev`, so the command was updated to `npm prune --omit=dev`.
- The live-reload Podman command mounted the project at `/app` but did not set the working directory. `npx nodemon server.js` would run from the image default working directory and fail to find the app reliably, so `-w /app` was added.
- The systemd example installed the generated service under `/etc/systemd/system` with `sudo`, which is not the right match for the preceding rootless Podman workflow. It now installs the unit under `~/.config/systemd/user` and uses `systemctl --user`.

## Review Notes
- Podman was not installed in the local review environment, so Podman CLI behavior was verified against official Podman documentation rather than local `podman --help` output.
- `podman generate systemd` is currently documented as deprecated in favor of Quadlet, but the command remains available and the documentation states there are no plans to remove it. A future refresh could replace the systemd section with a Quadlet example.
- For user services that must start at boot before login, users may also need `loginctl enable-linger`; that was not added because it would expand the scope of the existing section.
