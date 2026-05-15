# Validation Summary: How to Migrate from Docker to Podman on RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Docker
- Podman
- podman-docker
- podman-compose and Docker Compose compatibility
- Skopeo
- Buildah
- systemd Quadlet
- SELinux container volume labeling
- Rootless containers

## Sources Consulted
- Red Hat Enterprise Linux 9, "Building, running, and managing containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/
- Red Hat Enterprise Linux 9, "Running containers without Docker": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_starting-with-containers
- Red Hat Enterprise Linux 9, "Using the container-tools API": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/using-the-container-tools-api
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Compose documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Podman unshare documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- containers/podman-compose installation documentation: https://github.com/containers/podman-compose
- containers/skopeo transport and copy documentation: https://github.com/containers/skopeo

## Issues Found
- The Docker Compose migration bullet said to replace the `docker.io/` prefix when images use short names. This had the direction backwards. Changed it to recommend adding fully qualified image names such as `docker.io/library/nginx:latest` when short-name resolution is ambiguous.
- The rootless Quadlet example published host port 80, which fails for rootless Podman unless the administrator changes `net.ipv4.ip_unprivileged_port_start`. Changed the example to publish host port 8080 to container port 80.
- The Quadlet example wrote to `~/.config/containers/systemd/web.container` without first creating the directory. Added `mkdir -p ~/.config/containers/systemd`.
- The rootless volume restore command used `sudo tar` into a rootless Podman volume. Changed it to capture the Podman volume mount point and restore with `podman unshare tar`, which matches rootless user namespace handling.
- The verification checklist used `systemctl --user list-unit-files | grep container`, which would not reliably match the generated `web.service` unit from `web.container`. Changed it to check for `web.service`.

## Review Notes
The post is technically relevant and broadly accurate after the targeted fixes. Some Compose features can still require case-by-case migration work, especially Docker Swarm-oriented settings and tooling that depends on Docker-only APIs.
