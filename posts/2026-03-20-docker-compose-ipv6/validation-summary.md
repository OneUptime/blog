# Validation Summary: How to Create Docker Compose Services with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine networking
- Docker Compose
- IPv6
- Bridge networks
- IPAM

## Sources Consulted
- Docker Docs: Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker compose ps` CLI reference: https://docs.docker.com/reference/cli/docker/compose/ps/

## Issues Found
- The post used invalid IPv6 literals such as `fd00:compose:web::/64`. IPv6 hextets must be hexadecimal, so these subnets and addresses were replaced with valid ULA examples such as `fd00:1234:5678:1::/64`.
- The basic example published both `80:80` and `[::]:80:80`. Docker documents that an unspecified host address publishes to both IPv4 and IPv6, so the redundant IPv6-only binding was removed and the comment was corrected.
- The introduction implied IPv6 support without the documented platform constraint. A Linux-host caveat was added because Docker documents IPv6 support for Docker daemons on Linux hosts.
- The `internal: true` explanation was too absolute. It was revised from “No external access” / “prevent external IPv6 access” to externally isolated wording that matches Docker’s documented behavior more closely.
- The verification commands depended on tools that may not exist inside `nginx:latest` and mixed incompatible examples. They were replaced with host-side `docker inspect` / `docker network inspect` checks, a `busybox` service for `ping -6`, and a host-side IPv6 `curl` against the published port.
- Placeholder images `myapp:latest` and `myapi:latest` were replaced with runnable examples so the Compose snippets can be executed as written.

## Review Notes
- Docker documents IPv6 support only for Docker daemons running on Linux hosts.
- Docker documents `internal` networks as externally isolated, but the host may still be able to communicate with container IPs on that bridge network. Stronger host isolation is a separate concern.
- The examples in the post are alternative `compose.yaml` files, so readers should run one example at a time rather than combining all snippets into a single file.
