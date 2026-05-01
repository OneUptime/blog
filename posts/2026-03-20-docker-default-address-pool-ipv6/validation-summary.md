# Validation Summary: How to Configure Docker Default Address Pool for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- IPv6
- `daemon.json`
- CIDR subnet allocation

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker system info` / `docker info` CLI reference - https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: `dockerd` CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Docker Engine v27 release notes - https://docs.docker.com/engine/release-notes/27/
- Docker Docs: Docker Engine v28 release notes - https://docs.docker.com/engine/release-notes/28/
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The original IPv6 examples used invalid literals such as `fd00:docker::/48`, `fd00:docker:a::/48`, and `fd00:docker:b::/48`. I replaced them with valid ULA prefixes because IPv6 hextets must contain hexadecimal digits only.
- The JSON configuration snippets included `//` comments and, in the multi-host example, two JSON documents in a single `json` block. I converted these to valid JSON examples and separated Host A and Host B into distinct snippets.
- The original configuration implied that `"ipv6": true` and `"ip6tables": true` were part of configuring `default-address-pools` for user-defined networks. I removed those keys from the pool examples because Docker documents `default-address-pools` separately from the daemon's default bridge IPv6 settings.
- The network inspection examples suggested only IPv6 subnets would appear after `docker network create --ipv6 ...`. I corrected the commands to filter the IPv6 subnet explicitly, because Docker enables IPv4 by default unless `--ipv4=false` is used.
- The multi-host explanation said the setup avoided conflicts "when containers need to communicate across hosts," which overstates what bridge networks provide. I corrected this to explain that separate pools avoid overlapping subnets, but bridge networks remain local to each host and overlay networking is required for a single network spanning hosts.
- The network-count command used `docker network ls | wc -l`, which counts the header line. I changed it to `docker network ls -q | wc -l` so it counts only networks.
- The conclusion implied all new networks would automatically receive IPv6 ranges from the pool. I corrected this to specify that the behavior applies to new IPv6-enabled networks created without explicit subnets.

## Review Notes
- Docker's current documentation notes that if no IPv6 pools are configured, Docker can allocate IPv6 subnets from an automatically generated ULA prefix for IPv6-enabled networks. Custom IPv6 pools are still useful when you need deterministic addressing.
- Docker documents IPv6 daemon networking support for Linux hosts. The post now reflects that scope.
