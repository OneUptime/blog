# Validation Summary: How to Use Portainer with Podman as a Docker Alternative

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- systemd
- SELinux
- Linux container management

## Sources Consulted
- Portainer CE install docs for Podman on Linux: https://docs.portainer.io/start/install-ce/server/podman/linux
- Portainer docs for adding a Podman environment: https://docs.portainer.io/admin/environments/add/podman
- Portainer docs for connecting to the Podman socket: https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer FAQ on Podman support: https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer initial setup docs: https://docs.portainer.io/start/install-ce/server/setup
- Podman system service docs: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman systemd unit / Quadlet docs: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd docs: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman compose docs: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman installation docs: https://podman.io/docs/installation

## Issues Found
- The post presented rootless Podman as the main supported Portainer setup. I updated the introduction, prerequisites, socket guidance, and conclusion to reflect Portainer's current documented support for Podman 5 in rootful mode, while keeping rootless as an unsupported reference.
- The Portainer deployment command used the rootless user socket, omitted `--privileged`, and used the floating `portainer/portainer-ce:latest` tag. I updated it to match Portainer's current Podman installation guidance using the rootful socket, `--privileged`, and the `:lts` image tag.
- The environment configuration section told readers to add a `Docker Standalone` environment. I corrected this to the current `Podman` environment type and noted that Portainer auto-detects the local environment during initial setup.
- The systemd section recommended `podman generate systemd`, which current Podman documentation marks as deprecated in favor of Quadlet files. I replaced it with a Quadlet-based example.
- The SELinux section implied Podman itself enables SELinux enforcing. I reworded this to correctly describe SELinux-enabled hosts such as RHEL and Fedora.
- The comparison table used outdated Compose terminology and overstated Podman's rootless behavior. I updated the Compose row to `docker compose` / `podman compose` and corrected the root and socket rows.

## Review Notes
- Portainer documents direct Podman socket connections as a legacy option and recommends the Edge Agent for many use cases.
- Portainer's current official Podman support is limited to CentOS Stream 9, Podman 5.x, and rootful mode. Other distributions and rootless setups may work but are outside official support.
