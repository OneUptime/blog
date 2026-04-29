# Validation Summary: How to Migrate from Docker Desktop to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Desktop
- Docker Engine
- Portainer Community Edition
- Portainer Business Edition
- Docker Compose
- Docker contexts
- Docker volumes and images
- SSH
- Tailscale
- rsync

## Sources Consulted
- Docker Desktop license agreement: https://docs.docker.com/subscription/desktop-license/
- Get Docker Desktop: https://docs.docker.com/get-started/introduction/get-docker-desktop/
- Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Install Docker Engine on Debian: https://docs.docker.com/engine/install/debian/
- Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall/
- docker image save: https://docs.docker.com/reference/cli/docker/image/save/
- docker image load: https://docs.docker.com/reference/cli/docker/image/load/
- docker volume ls: https://docs.docker.com/reference/cli/docker/volume/ls/
- How Compose works: https://docs.docker.com/compose/intro/compose-application-model/
- docker context create: https://docs.docker.com/reference/cli/docker/context/create/
- Protect the Docker daemon socket: https://docs.docker.com/engine/security/protect-access/
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Access control: https://docs.portainer.io/advanced/access-control
- Roles: https://docs.portainer.io/sts/admin/user/roles
- Activity logs: https://docs.portainer.io/admin/logs/activity
- Install Tailscale on Linux: https://tailscale.com/kb/1031/install-linux
- tailscale up command: https://tailscale.com/kb/1241/tailscale-up

## Issues Found
- The licensing language was too imprecise. I updated it to match Docker’s current subscription terms for larger organizations.
- The post claimed Portainer generally provides audit logging and advanced team access control, but Portainer documents RBAC and activity logs as Business Edition features. I changed the claim to distinguish the general UI from BE-only features.
- The Docker installation step used `get.docker.com` even though Docker’s docs say the convenience script is not recommended for production. I replaced it with the official apt-repository installation flow for Ubuntu/Debian.
- The Docker post-install flow implied the `docker` group change was immediately active. I changed verification to use `sudo docker` and added the required logout/login note before continuing.
- The export script did not create the `exports/` and `compose-exports/` directories before using them. I added the required directory creation.
- The Compose export command only matched `docker-compose*.yml`, missed current `compose.yaml` style filenames, and could overwrite or lose context. I updated it to export both legacy and current Compose filenames while preserving relative paths.
- The Compose migration step copied files to the server, but Portainer’s documented stack upload workflow uploads from the user’s computer or uses the web editor/Git. I removed the misleading server copy step and aligned the instructions with Portainer’s supported import methods.
- The Portainer install command used a floating `latest` tag. I changed it to the current documented `portainer/portainer-ce:sts` tag and noted that port `8000` is only needed for Edge agents.
- The image import example used a valid alias, but I updated it to the documented `docker image load --input` form and tightened shell quoting in the import/export loops.
- The SSH tunnel example did not state the local URL to open after tunneling. I added the `https://localhost:9443` access note.
- The Docker context example used a less standard argument form. I updated it to the documented `--docker host=ssh://...` format.

## Review Notes
- The volume migration commands back up and restore volume contents. They are suitable for ordinary local Docker volumes, but they do not recreate third-party volume driver configuration.
- Portainer generates a self-signed certificate on port `9443` by default, so browsers may show a certificate warning until you replace it with your own certificate.
