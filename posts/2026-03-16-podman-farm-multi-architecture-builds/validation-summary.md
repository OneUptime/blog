# Validation Summary: How to Use Podman Farm for Multi-Architecture Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman farm
- Podman system connections
- Podman manifest lists / image indexes
- Multi-architecture container builds
- Containerfile / Dockerfile syntax
- Node.js and Python container base images
- QEMU emulation comparison
- CI/CD shell scripting

## Sources Consulted
- Podman farm build documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman farm create documentation: https://docs.podman.io/en/v4.9.0/markdown/podman-farm-create.1.html
- Podman farm list documentation: https://docs.podman.io/en/stable/markdown/podman-farm-list.1.html
- Podman farm overview documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-farm.1.html
- Podman system connection add documentation: https://docs.podman.io/en/v5.4.2/markdown/podman-system-connection-add.1.html
- Podman system connection list documentation: https://docs.podman.io/en/v5.2.2/markdown/podman-system-connection-list.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman manifest inspect documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Docker Node official image information: https://hub.docker.com/_/node
- Docker Python official image information: https://hub.docker.com/_/python

## Issues Found
- The post treated `podman farm build` and manifest pushing as separate required steps. Official Podman documentation states that `podman farm build` builds on farm nodes, pushes the built images to the registry named by `--tag`, creates a local manifest list, and pushes that manifest list as well. I moved registry login before the farm build and replaced the separate manifest push step with manifest inspection.
- The CI example pushed `"${IMAGE}:${TAG}"` again after `podman farm build`. I removed that redundant push and updated the comment to clarify that the build command performs the push.
- The CI health-check command rendered `.Connections` as a list, which can appear bracketed in Go-template output and produce invalid connection names such as `[f38` or `f37]` when iterated in shell. I changed the template to range over `.Connections` and emit one connection per line.

## Review Notes
- Podman was not installed in the local workspace, so CLI behavior was checked against official Podman documentation rather than local `--help` output.
- Official Podman farm documentation notes that farm machines must run Podman v4.9.0 or newer; the post does not state a minimum version, but the command workflow is current.
- The `podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:latest"` command remains in the release-tag branch because it is being used to publish a `latest` alias after the farm build has created the local manifest list.
