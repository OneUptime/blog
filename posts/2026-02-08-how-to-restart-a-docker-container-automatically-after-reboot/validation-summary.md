# Validation Summary: How to Restart a Docker Container Automatically After Reboot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker restart policies
- Docker CLI
- Docker Compose
- systemd service units
- Linux service startup management

## Sources Consulted
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Compose services `restart` reference - https://docs.docker.com/reference/compose-file/services/#restart
- Docker Docs: Linux post-installation steps, configure Docker to start on boot - https://docs.docker.com/engine/install/linux-postinstall/#configure-docker-to-start-on-boot-with-systemd
- Docker Docs: `docker container update` restart policy reference - https://docs.docker.com/reference/cli/docker/container/update/
- Docker Docs: `docker inspect` formatting reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker system events` filters and container restart events - https://docs.docker.com/reference/cli/docker/system/events/
- Docker Docs: Legacy container links - https://docs.docker.com/engine/network/links/
- systemd.service manual - https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.syntax manual - https://www.freedesktop.org/software/systemd/man/systemd.syntax.html

## Issues Found
- The `on-failure` section incorrectly stated that the policy restarts after a reboot if the container was running when the system went down. Docker's official restart policy documentation says `on-failure` does not restart a container just because the daemon restarts; it restarts only after a non-zero container exit. Updated the explanation to match Docker's documented behavior.
- The systemd dependency example used Docker's legacy `--link` networking. Replaced it with a user-defined Docker network and `--network-alias db`, which is the current Docker networking approach and avoids relying on legacy links.

## Review Notes
- Docker's official Linux post-installation documentation enables both `docker.service` and `containerd.service` for non-Debian/Ubuntu distributions. The post's `systemctl enable docker` guidance remains broadly valid for Docker startup, but adding `containerd.service` could make the section more complete in a future revision.
- Docker recommends restart policies as the default approach and process managers such as systemd only when restart policies do not suit the deployment's needs. The post's systemd examples are valid for advanced ordering and host-service integration scenarios.
