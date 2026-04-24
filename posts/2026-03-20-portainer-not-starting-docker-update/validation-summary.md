# Validation Summary: How to Fix Portainer Not Starting After Docker Update

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- Docker Compose
- Linux systemd
- SELinux

## Sources Consulted
- Portainer install docs for Docker Standalone on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer update docs for Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer requirements and supported version matrix: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer rollback FAQ: https://docs.portainer.io/faqs/troubleshooting/how-can-i-roll-back-to-a-previous-version-of-portainer
- Docker Engine API versioning docs: https://docs.docker.com/reference/api/engine/
- Docker bind-mount and SELinux labeling docs: https://docs.docker.com/engine/storage/bind-mounts/
- Docker rootless mode docs: https://docs.docker.com/engine/security/rootless/
- Docker Desktop for Linux FAQ on socket paths: https://docs.docker.com/desktop/troubleshoot-and-support/faqs/linuxfaqs/
- Docker Engine install docs for Ubuntu version pinning: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose top-level `version` field docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose config command reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker logs command reference: https://docs.docker.com/reference/cli/docker/container/logs/

## Issues Found
- The post used `portainer/portainer-ce:latest` in multiple remediation commands. Portainer's current install and upgrade docs use the `:lts` tag for CE production deployments, so I updated those commands accordingly.
- The API-mismatch section advised setting `DOCKER_API_VERSION` inside the Portainer container. Docker documents that this disables API negotiation and should only be used when a client must force a specific API version; Portainer's own guidance is to run a supported Portainer release for the Docker version in use. I replaced the workaround with the supported action: update Portainer to a compatible release.
- The socket-permission section claimed `--user root` was part of the fix. Portainer's documented deployment commands do not require that override, and it is not a reliable remediation for host socket-policy problems, so I removed it.
- The missing-socket section did not cover rootless Docker and Docker Desktop for Linux accurately enough. I added the documented rootless service check and the per-user socket paths used by rootless Docker and Docker Desktop for Linux.
- The daemon-configuration section attributed problems to `live-restore` in a way that was not supported by Docker's docs. I replaced that wording with a general daemon-config check and changed `docker start portainer` to `docker restart portainer`, which works whether the container is running or stopped.
- The SELinux section used `ausearch ... | audit2allow -M` as a "check" command and suggested `:z` relabeling on the Docker socket as a quick fix. Portainer's install docs instead state that SELinux-enabled deployments require `--privileged`. I changed the denial check to a read-only `ausearch` query and updated the deployment command to match Portainer's guidance.
- The rollback section hard-coded a specific Ubuntu Jammy Docker package version that is outdated and distro-specific. I replaced it with Docker's current documented flow: list available versions, set `VERSION_STRING`, and install that specific version.
- The Compose section implied generic field deprecations and used `cat ... | grep`. Docker's current Compose docs specifically mark only the top-level `version` field as obsolete, so I updated the wording and simplified the command to `grep`.

## Review Notes
- Portainer/Docker compatibility is version-sensitive. The current Portainer docs publish a tested Docker version matrix, so major Docker upgrades should be checked against that matrix before deployment.
- Portainer's current CE documentation recommends the LTS image/tag for production-style installs and updates.
- Docker CLI binaries were not available in this workspace, so CLI verification was performed against current official documentation rather than local `--help` output.
