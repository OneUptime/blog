# Validation Summary: How to Configure Docker DNS Resolution for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker container networking
- IPv6
- DNS and AAAA record resolution
- Docker Compose
- Alpine Linux container utilities

## Sources Consulted
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker IPv6 daemon configuration: https://docs.docker.com/engine/daemon/ipv6/
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose service reference (`dns`, `dns_search`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose network reference (`enable_ipv6`, `ipam`): https://docs.docker.com/reference/compose-file/networks/
- BusyBox command reference (`nslookup`, `sleep`, `tail`): https://busybox.net/BusyBox.html
- Alpine package index for `bind-tools` / `dig`: https://pkgs.alpinelinux.org/contents?file=dig
- Linux `resolv.conf(5)` reference for `MAXNS` limit: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The introduction overstated Docker's default DNS behavior. I corrected it to match Docker's docs: containers on the default `bridge` network inherit `/etc/resolv.conf`, while containers on user-defined networks use Docker's embedded DNS at `127.0.0.11`, which forwards external lookups upstream.
- The post implied that AAAA lookups require IPv6-addressed DNS servers. I corrected that wording so it distinguishes record type from transport: containers can query AAAA records through either IPv4- or IPv6-addressed resolvers, while IPv6 resolver addresses specifically require host IPv6 connectivity.
- Several IPv6 examples used invalid CIDRs such as `fd00:docker::/80`, `fd00:dns::/64`, and `fd00:compose:dns::/64`. I replaced them with valid hexadecimal ULA examples.
- The `daemon.json` code block contained a `//` comment even though it was marked as JSON. I removed the comment so the example is valid JSON.
- The Alpine command examples assumed `dig` was available in the base image and used BusyBox `nslookup` with BIND-style `-type=AAAA` syntax. I updated those examples to install `bind-tools` before using `dig` or `nslookup`.
- The long-running client example used `sleep infinity`, which is not supported by BusyBox `sleep`. I replaced it with `tail -f /dev/null`.
- The daemon DNS example configured four resolvers but showed only three in `/etc/resolv.conf`. I reduced it to three entries so the example matches the standard resolver limit and the shown output.

## Review Notes
- Docker documents IPv6 support for Docker Engine on Linux hosts. The post's commands and configuration are Linux-oriented (`systemctl`, `daemon.json`, `ping6`), so readers using Docker Desktop or non-Linux daemons should verify platform-specific behavior separately.
