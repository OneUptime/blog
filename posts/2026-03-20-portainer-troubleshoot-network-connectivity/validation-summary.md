# Validation Summary: How to Troubleshoot Container Network Connectivity in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker bridge networking
- Docker port publishing
- Linux firewalling (`iptables` / `nftables`)
- Linux network troubleshooting tools (`ping`, `ss`, `curl`, `nc`, `jq`)

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: docker network create - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Format command and log output - https://docs.docker.com/go/formatting/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Debian Manpages: ping(8) - https://manpages.debian.org/buster/iputils-ping/ping.8.en.html
- Netshoot GitHub repository - https://github.com/nicolaka/netshoot

## Issues Found
- The Step 2 `docker run` example used a line-continuation backslash followed by an inline comment, which breaks POSIX shell parsing. I moved the comment to its own line so the command is syntactically valid.
- The firewall section treated `iptables` as universal and checked `DOCKER-ISOLATION-STAGE-1`, which is not part of Docker's current documented chain list. I updated the text to scope the step to Docker's default `iptables` backend, added an `nftables` caveat, and switched the chain examples to `DOCKER-USER`, `DOCKER-FORWARD`, and `DOCKER`.
- The MTU test used `ping -s` without disabling fragmentation, which can mask path MTU problems. I changed the examples to use `ping -M do -s ...` so the test actually checks MTU-related failure conditions.
- The "Reset Docker iptables" fix advised manually flushing Docker-managed chains. Docker's docs explicitly warn against modifying Docker-created firewall rules directly, so I replaced that guidance with restarting Docker to let it recreate its managed rules.

## Review Notes
- The low-level firewall and MTU troubleshooting commands in this post are Linux-host specific. They are accurate for Linux Docker hosts managed through Portainer, but they do not apply directly to Docker Desktop on macOS or Windows.
