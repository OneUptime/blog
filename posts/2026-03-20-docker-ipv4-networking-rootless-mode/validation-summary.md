# Validation Summary: How to Configure Docker Container IPv4 Networking in Rootless Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker rootless mode
- RootlessKit
- slirp4netns
- pasta / passt
- systemd user services
- Linux IPv4 sysctl configuration

## Sources Consulted
- Docker Docs: Rootless mode — https://docs.docker.com/engine/security/rootless/
- Docker Docs: Rootless mode troubleshooting — https://docs.docker.com/engine/security/rootless/troubleshoot/
- Docker Docs: Rootless mode tips — https://docs.docker.com/engine/security/rootless/tips/
- Docker Docs: Networking — https://docs.docker.com/engine/network/
- Docker Docs: `docker network create` — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker container run` — https://docs.docker.com/reference/cli/docker/container/run/
- Rootless Containers: Docker/Moby — https://rootlesscontaine.rs/getting-started/docker/
- Rootless Containers: Network namespaces / outgoing connections — https://rootlesscontaine.rs/how-it-works/netns/outgoing/
- Rootless Containers: Network namespaces / incoming connections — https://rootlesscontaine.rs/how-it-works/netns/incoming/
- Ubuntu Packages: `passt` package — https://packages.ubuntu.com/passt

## Issues Found
- The install snippet for `https://get.docker.com/rootless` omitted `export PATH=$HOME/bin:$PATH`, which is required because the rootless installer places binaries in `~/bin`. I added the missing export and kept `DOCKER_HOST` as an explicit fallback for clients that need it.
- The post originally implied rootless Docker networking used `slirp4netns` or `pasta` "instead of kernel bridges" and that no bridge networking existed. I corrected this to explain that Docker-managed bridge networks still exist, but they live inside the rootless daemon's network namespace, so host-visible behavior differs from rootful Docker.
- The "confirm network mode" command did not actually validate rootless mode, and the follow-up example depended on networking tools inside the demo image. I replaced that flow with `docker info | grep -i rootless` and a host-side `docker inspect` example that reliably demonstrates container IPv4 assignment.
- The privileged-port section conflated a container listening on port 80 with publishing host port 80. I corrected the wording and comments to make clear that the restriction applies to publishing host ports below 1024 in rootless mode.
- The `pasta` section was technically incorrect. On Debian/Ubuntu the package is `passt`, not `pasta`, and Docker rootless does not enable `pasta` through `~/.config/docker/daemon.json`. I replaced it with the documented systemd user override using `DOCKERD_ROOTLESS_ROOTLESSKIT_NET=pasta` and `DOCKERD_ROOTLESS_ROOTLESSKIT_PORT_DRIVER=implicit`, plus `systemctl --user daemon-reload`.
- The custom network section claimed rootless custom networks worked "the same as rootful Docker". I corrected this by clarifying that the custom subnet exists inside the rootless daemon namespace and that `-p` is still required for host access.
- The limitations table and conclusion were updated to reflect documented rootless behavior for privileged host ports, host networking differences, and user-defined bridge networks in the rootless daemon namespace.

## Review Notes
- `pasta` support is experimental and requires Docker Engine 25.0 or later.
- Docker uses `slirp4netns` by default for rootless networking when available; if it is unavailable, Docker falls back to VPNKit.
- Since Docker Engine v23, the Docker CLI usually auto-selects the rootless context when available, so `DOCKER_HOST` is mainly a compatibility fallback rather than a strict requirement in every environment.
