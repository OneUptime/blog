# Validation Summary: How to Migrate from Cockpit to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cockpit
- Portainer Community Edition
- Docker
- Podman
- Docker Compose / Compose Specification
- Linux systemd

## Sources Consulted
- Cockpit documentation: https://cockpit-project.org/guide/latest/
- Portainer welcome and edition overview: https://docs.portainer.io/
- Portainer access control: https://docs.portainer.io/advanced/access-control
- Portainer activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer API access: https://docs.portainer.io/api/access
- Portainer Docker installation on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Podman installation on Linux: https://docs.portainer.io/start/install-ce/server/podman/linux
- Portainer Podman support FAQ: https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer stack deployment and GitOps updates: https://docs.portainer.io/sts/user/docker/stacks/add
- Docker volume backup guidance: https://docs.docker.com/engine/storage/volumes/
- Docker Compose `version` field status: https://docs.docker.com/reference/compose-file/version-and-name/
- Podman `ps` reference: https://docs.podman.io/en/stable/markdown/podman-ps.1.html
- Podman `inspect` reference: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `volume export` reference: https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html

## Issues Found
- The introduction referred to `cockpit-docker` as if it were current. I changed this to `cockpit-podman` and clarified that some Portainer capabilities mentioned in the post are Business Edition features.
- The backup section used a Docker-only inspect/export flow without safe handling for empty output and without a Podman equivalent. I added `xargs -r`, created the backup directory explicitly, quoted the volume mounts, and added Podman inspect and volume export commands.
- The Portainer installation commands were outdated/inaccurate. I updated the Docker example to the current official Portainer CE image tag, and I updated the Podman example to match Portainer’s documented rootful Podman deployment requirements, including `podman.socket`, `--privileged`, and `/run/podman/podman.sock`.
- The Compose example used the obsolete top-level `version` key. I removed it to align with the current Compose specification.
- The sample `DATABASE_URL` was incomplete for a PostgreSQL connection string. I updated it to include credentials and the host/port structure used by the rest of the example.
- The feature matrix overstated Portainer audit logging support. I changed audit logging to Business Edition, and I clarified the Cockpit/Portainer access-control and API rows.
- The “Running Both” example used `systemctl status cockpit`, which is not the current Cockpit socket-activated unit name in the docs, and the inline shell comment broke the `docker run` command. I changed this to `cockpit.socket` and fixed the shell syntax.

## Review Notes
- Portainer’s current official install docs are not fully uniform across every platform path: the Docker Linux CE page currently uses `portainer/portainer-ce:sts`, while the Podman Linux CE page currently uses `portainer/portainer-ce:lts`. The post now follows the current official examples for each path.
- Portainer’s official Podman support is currently limited to CentOS Stream 9, Podman 5, and rootful mode. Readers outside that support matrix may still be able to run Portainer, but they would be outside the documented supported configuration.
