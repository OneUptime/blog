# Validation Summary: How to Test Docker Container IPv6 Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine networking
- Docker bridge networks
- IPv6
- DNS AAAA resolution
- `curl`
- `ping6`
- Alpine Linux container tooling

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: `docker inspect` reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: prior releases notes for embedded DNS AAAA support - https://docs.docker.com/engine/release-notes/prior-releases/
- curl manpage - https://curl.se/docs/manpage.html
- Alpine Linux package index: `iputils-ping` - https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/iputils-ping
- Local CLI/runtime help: `curl --manual`, `ping -h`, `busybox ping6 --help`, `busybox nslookup --help`

## Issues Found
- The post assumed an IPv6-enabled `mynet` network already existed, and its sample literals `fd00:mynet::1` and `fd00:mynet::2` were not valid IPv6 addresses. I fixed this by creating the network when missing with a valid ULA subnet and by making the address and gateway checks dynamic.
- The automated DNS test used `dig AAAA google.com | grep -q AAAA`, which can succeed without proving that an AAAA answer was returned because it can match the query section. I changed it to `dig +short AAAA google.com | grep -q ':'` so it validates returned IPv6 answers.
- The direct container-to-container HTTP test used `curl --connect-to` with the wrong argument format. I replaced it with a direct request to the inspected IPv6 literal, which matches curl's documented syntax.
- The published-port example assumed the host interface was `eth0` and used a less portable bind example. I changed it to Docker's documented `-p 8080:80` publish behavior and made host IPv6 discovery use the default IPv6 route interface instead of a hardcoded device name.
- The introduction did not mention Docker Engine's Linux-only IPv6 support. I added that caveat because Docker's official IPv6 documentation explicitly scopes support to Linux hosts.

## Review Notes
- Docker's embedded DNS supports AAAA records on IPv6-enabled user-defined networks, which makes the `curl -6 http://srv/` name-based example technically valid once the network is created with IPv6 enabled.
- The environment used for review did not have `docker` installed, so runtime validation was done against official Docker documentation and local CLI/manual help rather than live container execution.
