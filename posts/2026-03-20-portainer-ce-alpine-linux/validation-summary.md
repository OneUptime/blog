# Validation Summary: How to Install Portainer CE on Alpine Linux with Docker

## Status
validated

## Post Type
Installation guide / Tutorial

## Technologies Covered
- Alpine Linux
- Docker Engine
- Docker Compose plugin
- Portainer Community Edition (CE)
- OpenRC
- iptables / nftables

## Sources Consulted
- Alpine Linux Docker wiki: https://wiki.alpinelinux.org/wiki/Docker
- Alpine Linux Repositories wiki: https://wiki.alpinelinux.org/wiki/Repositories
- Alpine Linux OpenRC wiki: https://wiki.alpinelinux.org/wiki/OpenRC
- Alpine Linux Iptables wiki: https://wiki.alpinelinux.org/wiki/Iptables
- Alpine Linux package index for `docker-cli-compose` on Alpine 3.18: https://pkgs.alpinelinux.org/package/v3.18/community/x86/docker-cli-compose
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Compose installation overview: https://docs.docker.com/compose/install/
- Docker restart policies / automatic start guidance: https://docs.docker.com/engine/containers/start-containers-automatically/

## Issues Found
1. **Missing community repository prerequisite.** Alpine documents Docker as a `community` repository package, and Alpine's repository docs note that only `main` is enabled during installation by default. I added `setup-apkrepos -c` before package installation so the documented `apk add` commands work on a fresh Alpine host.
2. **Outdated Compose package choice.** The post installed `docker-compose`, while current Alpine guidance uses `docker-cli-compose`, and Docker classifies standalone Compose as the legacy path. I updated the install command to `apk add --no-cache docker docker-cli-compose` and added `docker compose version` to the verification step.
3. **Cgroup instructions were too broad for standard Docker installs.** The original step suggested generic cgroup/bootloader changes for Alpine Docker. I corrected this to match Alpine's current documentation: Alpine 3.19+ already defaults to unified cgroups, while Alpine 3.18 or rootless Docker setups may need `rc_cgroup_mode="unified"` and the `cgroups` service enabled.
4. **Portainer deployment used an imprecise image tag and omitted the optional-port caveat.** Portainer's current Docker-on-Linux install guide uses `portainer/portainer-ce:sts` and notes that port `8000` is only required for Edge Agent features. I changed the image tag to `:sts` and added the note that `8000` can be removed when Edge Agents are not used.
5. **Firewall persistence command did not match Alpine's documented command.** Alpine's iptables documentation uses `rc-service iptables save`. I replaced `/etc/init.d/iptables save` with `rc-service iptables save` and kept the optional nature of port `8000` explicit.
6. **IP discovery assumed an `eth0` interface name.** That command is not portable across Alpine hosts because interface names vary. I replaced it with a generic IPv4 lookup using `ip -4 addr show scope global`.
7. **Sizing and resource-usage claims were too specific to validate.** The post included fixed RAM/disk sizing guidance and a `~50-100MB` Portainer RAM estimate that are not stated in the official installation docs and vary by workload. I reworded both passages to avoid unsupported exact numbers.
8. **The custom OpenRC service conflicted with Docker restart-policy guidance.** The post created a separate OpenRC service for a container already launched with `--restart=always`. Docker explicitly warns against combining restart policies with host-level process managers. I replaced the init-script example with guidance to rely on Docker's restart policy and the Docker service at boot.

## Review Notes
- Portainer's current STS documentation still exposes `9443` for the UI/API and `8000` for the Edge tunnel; `8000` is optional unless you use Edge Agents.
- Alpine OpenRC uses unified cgroups by default from Alpine 3.19 onward, so the cgroup step mainly matters for Alpine 3.18 or rootless Docker scenarios.
- The guide remains technically relevant and correct after these updates.
