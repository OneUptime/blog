# Validation Summary: How to Use Portainer with Rootless Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer CE
- Docker Engine
- Rootless Docker
- systemd user services
- Linux networking and sysctl configuration

## Sources Consulted
- Docker Rootless mode: https://docs.docker.com/engine/security/rootless/
- Docker Rootless tips: https://docs.docker.com/engine/security/rootless/tips/
- Docker Rootless troubleshooting: https://docs.docker.com/engine/security/rootless/troubleshoot/
- Docker start containers automatically: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker CLI reference for `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker CLI reference for `docker container start`: https://docs.docker.com/reference/cli/docker/container/start/
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- systemd unit specifiers: https://www.freedesktop.org/software/systemd/man/249/systemd.unit.html

## Issues Found
- The prerequisites section treated kernel support as a general rootless Docker requirement. I corrected it to match Docker's documented rootless storage-driver support: `overlay2` on kernel 5.11+ or `fuse-overlayfs` on kernel 4.18+.
- The post implied Docker 20.10+ had to already be installed even though the documented rootless installation script can install the required binaries itself. I clarified that either Docker packages can already be present or Docker can be installed with the rootless setup script.
- The rootless verification example said `docker info` should show `rootless: true`. Current Docker documentation shows `rootless` under `Security Options`, so I updated the command comment accordingly.
- The Portainer deployment used `portainer/portainer-ce:latest` and said `DOCKER_HOST` had to be set. I aligned the example with current Portainer install docs by using `portainer/portainer-ce:sts` and clarified that the Docker CLI can target the rootless daemon via either the rootless context or `DOCKER_HOST`.
- The post combined Docker's `--restart=always` policy with a host-level systemd process manager. Docker explicitly warns against combining restart policies with host-level process managers, so I removed the Docker restart policy and updated the systemd unit to manage the existing Portainer container directly.
- The systemd service used hard-coded paths and a hard-coded UID-based socket path. I replaced these with systemd specifiers (`%h` and `%t`) so the unit is portable across users.
- The privileged-port example set `net.ipv4.ip_unprivileged_port_start=80`, which only makes ports 80 and above unprivileged. Docker's rootless guidance uses `0` when allowing privileged ports generally, so I corrected both commands.
- The rootless limitations list did not match Docker's documented limitations. I replaced it with documented constraints around supported storage drivers, cgroup v2 requirements, unsupported features, and `--net=host` behavior under RootlessKit.

## Review Notes
- Portainer's official install documentation still assumes Docker is running rootfully and notes that rootless Docker requires additional configuration and may have limited functionality.
- Docker's current rootless documentation includes extra distribution-specific caveats, such as AppArmor configuration requirements on Ubuntu 24.04+ when using the rootless installation script. Those caveats are not covered in detail in the post.
