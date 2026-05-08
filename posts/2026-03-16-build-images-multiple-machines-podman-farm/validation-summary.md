# Validation Summary: How to Build Images Across Multiple Machines with podman farm build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman farm
- Container image builds
- Multi-architecture container images
- Manifest lists
- Podman system connections

## Sources Consulted
- Podman `podman-farm-build` official documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman `podman-farm-list` official documentation: https://docs.podman.io/en/stable/markdown/podman-farm-list.1.html
- Podman `podman-farm-update` official documentation: https://docs.podman.io/en/latest/markdown/podman-farm-update.1.html
- Podman `podman-farm` official documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-farm.1.html
- Podman `podman-system-connection-add` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman `podman-manifest-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-inspect.1.html

## Issues Found
- The introduction said `podman farm build` connects to each machine over SSH. Podman farms use named system connections, which can use SSH, Unix sockets, or TCP, so the wording was changed to "system connection."
- The connectivity-check command treated `.Connections` output as comma-separated text. Official `podman farm list` examples show `.Connections` as a list, so the command was changed to range over the Go template list and emit one connection per line.
- The registry tagging example showed a separate `podman manifest push --all` after `podman farm build`. Official `podman-farm-build` documentation states that farm build pushes built images and then creates and pushes the manifest list, so the extra push step was replaced with a note that no separate manifest push is needed.
- The local architecture section added localhost as a system connection. Official `podman-farm-build` supports `--local` for building on the local machine as well as farm nodes, so the example was changed to use `--local`.

## Review Notes
Podman was not installed in the local environment, so commands could not be verified with local `--help` output. The review used current official Podman documentation instead. The post assumes `podman farm build` is available; official farm documentation notes farm machines must run at least Podman v4.9.0.
