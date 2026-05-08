# Validation Summary: How to Create a Quadlet Network Unit File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Podman network units
- Container networking and DNS

## Sources Consulted
- Podman `podman-network.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-network.unit.5.html
- Podman `podman-systemd.unit(5)` documentation for `.container` `Network=`, `PublishPort=`, `ContainerName=`, and `Exec=` keys: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-network-create(1)` documentation, via the Quadlet network option mappings: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Docker Hub official `nginx` image overview: https://hub.docker.com/_/nginx

## Issues Found
- The connectivity example used `podman exec systemd-web curl http://systemd-api:5000`, but the `nginx:alpine` image used for `systemd-web` does not guarantee that `curl` is installed. I changed the command to `podman exec systemd-web wget -qO- http://systemd-api:5000`, which matches the Alpine-based image more closely while preserving the same DNS and connectivity test.

## Review Notes
- The Quadlet network keys used in the post (`Subnet=`, `Gateway=`, `Internal=`, `Label=`, and `DNS=`) are valid current `[Network]` options.
- `Network=app-network.network` is the documented Quadlet special case: it creates a dependency on the generated network service and uses the generated `systemd-app-network` Podman network by default.
- `systemd-web` and `systemd-api` are consistent with Quadlet's default container naming pattern of `systemd-%N`.
- The local environment did not have Podman installed, so runtime execution of the examples was not possible. The review was performed against the current official Podman documentation.
