# Validation Summary: How to Enable IPv6 in Docker Daemon Configuration

## Status
validated

## Post Type
Guide / configuration tutorial

## Technologies Covered
- Docker Engine
- Docker daemon (`dockerd`) configuration
- Docker bridge networking
- IPv6
- Linux networking / `ip6tables`
- Docker logging (`json-file`)

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: `docker network inspect` reference - https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Docs: `docker system info` / `docker info` reference - https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: Engine v28 release notes - https://docs.docker.com/engine/release-notes/28/
- RFC 4193: Unique Local IPv6 Unicast Addresses - https://www.rfc-editor.org/rfc/rfc4193

## Issues Found
- The introduction overstated the scope of `daemon.json` IPv6 settings. Docker’s docs distinguish between enabling IPv6 on the default `bridge` network and creating separate user-defined IPv6 networks. I corrected the text to scope the guidance to the default bridge on Linux hosts.
- The post implied `fixed-cidr-v6` was required. Current Docker documentation and release notes show that `"ipv6": true` can be used without `fixed-cidr-v6`, with Docker choosing a ULA prefix automatically. I updated the introduction and conclusion to reflect that `fixed-cidr-v6` is optional when you want to select the subnet explicitly.
- The first JSON example was not valid JSON because it included `// /etc/docker/daemon.json` inside a `json` code block. I removed the comment line.
- The verification section used inaccurate or non-portable commands. `ss -tlnp | grep dockerd` does not verify IPv6 on Docker’s default bridge and is misleading because `dockerd` normally listens on a Unix socket by default. `docker run --rm alpine ip -6 addr show eth0` depended on tooling inside the `alpine` image. I replaced these with Docker-documented `docker network inspect --format ...` checks and the `traefik/whoami` plus `curl http://[::1]:80` verification flow.
- The troubleshooting example used `ping6`, which is less portable on modern systems than `ping -6`. I updated the command accordingly.

## Review Notes
- Docker’s docs explicitly say IPv6 support for these daemon settings applies to Linux daemons. The post is now accurate for that scope.
- The default `bridge` network is considered a legacy Docker detail and is not recommended for production use; user-defined bridge networks are generally preferred. The post remains valid because it is specifically about daemon configuration for the default bridge.
- Docker Engine 28 introduced the ability to enable default-bridge IPv6 with `"ipv6": true` alone. Readers on older Engine versions may still encounter examples that always set `fixed-cidr-v6`.
