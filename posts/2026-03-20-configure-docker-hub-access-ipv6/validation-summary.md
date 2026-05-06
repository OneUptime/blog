# Validation Summary: How to Configure Docker Hub Access over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Hub
- IPv6 networking
- Docker Compose
- systemd
- Linux networking and firewalling

## Sources Consulted
- Docker Docs: Use IPv6 networking https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: `dockerd` CLI reference https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Daemon proxy configuration https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Compose file reference, networks https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose file reference, services https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Packet filtering and firewalls https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Port publishing and mapping https://docs.docker.com/engine/network/port-publishing/
- Local Docker CLI help: `docker pull --help`, `docker network create --help`, `docker run --help`

## Issues Found
- The introduction and description implied that enabling Docker's IPv6 bridge settings and daemon `dns` settings was required for Docker Hub itself. I corrected this to distinguish host-level Docker Hub IPv6 reachability from Docker's separate container IPv6 networking configuration.
- The `daemon.json` example included a comment inside a `json` block, which made it invalid JSON. I removed the comment and kept the example syntactically valid.
- The `fixed-cidr-v6` and user-defined IPv6 subnets used `/80` examples. Docker's IPv6 documentation uses `/64` subnets for bridge networking examples, so I updated the examples to `/64`.
- `docker pull --no-cache` is not a valid `docker pull` option. I replaced it with a valid pull example.
- `docker info | grep -i "registry\\|ipv6"` is not a reliable way to verify Docker Hub IPv6 access. I replaced it with `curl -6` checks against the registry endpoint.
- The `bridge6` network example referenced a network that was never created. I removed it and replaced the custom-network test with a valid `docker network create --ipv6 ...` example.
- The custom-network example used `alpine curl ...`, but Alpine does not include `curl` by default. I replaced it with a tested `curlimages/curl` example.
- The proxy example used an invalid IPv6 literal, `2001:db8::proxy`. I replaced it with a syntactically valid documentation IPv6 address and simplified `NO_PROXY`.
- The Compose example used the obsolete top-level `version` field, an invalid IPv6 subnet/address containing `app` in the address, and a redundant IPv6 port mapping. I removed the obsolete field, corrected the IPv6 subnet/address, and kept a single valid port mapping.
- The troubleshooting section incorrectly used a container `curl` command as a test of Docker daemon reachability, and it advised manually enabling IPv6 forwarding as a general step. I changed this to a host-side reachability check and a forwarding-status check that better matches Docker's documentation.

## Review Notes
- Docker's documented daemon IPv6 bridge configuration applies to Linux hosts.
- A `401 Unauthorized` response from `https://registry-1.docker.io/v2/` is the expected success signal for registry reachability without credentials.
- Compose `enable_ipv6` affects container networks; it does not control how the Docker daemon itself reaches Docker Hub.
- Live checks on 2026-05-06 confirmed AAAA DNS records for `registry-1.docker.io` and `auth.docker.io`, and `curl -6` reached the registry endpoint successfully.
