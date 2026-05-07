# Validation Summary: How to Run Portainer in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer CE
- Podman
- Podman API socket
- systemd
- Quadlet
- Docker Compose-style stack files
- Linux containers

## Sources Consulted
- Portainer documentation: Install Portainer CE with Podman on Linux: https://docs.portainer.io/start/install-ce/server/podman/linux
- Portainer documentation: Initial setup: https://docs.portainer.io/start/install-ce/server/setup
- Portainer documentation: Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer documentation: Roles: https://docs.portainer.io/admin/user/roles
- Podman documentation: podman system service: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation: Quadlet basic usage: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman documentation: podman-systemd.unit / Quadlet reference: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman documentation: podman generate systemd: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Docker documentation: Docker Compose overview: https://docs.docker.com/compose/

## Issues Found
- The Portainer run command used `docker.io/portainer/portainer-ce:latest`, omitted Portainer's documented `--privileged` flag, and used `:Z` on the Podman socket mount. Updated the examples to use Portainer's LTS image, add `--privileged`, add Podman's documented `--security-opt label=disable` for socket access from inside a container, and remove SELinux relabeling from the socket mount.
- The rootless section presented rootless Podman as a normal supported setup. Updated the wording to note that Portainer with rootless Podman may work but is not currently officially supported by Portainer.
- The prerequisite listed Podman 4.0 or later. Updated it to reflect Portainer's current documented Podman support target of Podman 5.x on Linux.
- The update command pulled the `latest` tag while the install command now uses the LTS tag. Updated the pull command to `docker.io/portainer/portainer-ce:lts`.
- The Quadlet example used the old image tag and socket/data volume mount options, and did not include the socket-access security settings. Updated it to use the LTS image, `PodmanArgs=--privileged`, `SecurityLabelDisable=true`, and non-relabeling volume mounts.
- The Quadlet instructions told readers to run `systemctl enable portainer.service`. Podman documents that generated Quadlet services are transient and are enabled through the source Quadlet file's `[Install]` section during generation, so the explicit enable command was removed.
- The security notes referred to changing a default admin password, but Portainer creates the first administrator during initial setup. Updated the wording to recommend choosing a strong administrator password during first-user creation.
- The security notes described RBAC as built into the CE deployment. Portainer documents RBAC as a Business Edition feature, so the note now points readers to Portainer Business Edition for granular multi-user access.

## Review Notes
The Docker Compose-style stack example is syntactically valid and matches Portainer's documented stack editor flow for Docker Standalone and Podman environments. The legacy `podman generate systemd` section is correctly marked deprecated, and Podman's current documentation states that Quadlet is the recommended replacement.
