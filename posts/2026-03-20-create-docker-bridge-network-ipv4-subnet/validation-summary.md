# Validation Summary: How to Create a Custom Docker Bridge Network with a Specific IPv4 Subnet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (CLI: `docker network`, `docker run`, `docker inspect`, `docker exec`)
- Docker Compose (v3.8 schema)
- Docker bridge networking driver
- Docker embedded DNS (container name resolution on user-defined networks)
- IPv4 subnetting / CIDR (`--subnet`, `--gateway`, `--ip-range`)
- nginx:alpine, postgres:15-alpine official images

## Sources Consulted
- Docker `network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker bridge networks overview: https://docs.docker.com/engine/network/drivers/bridge/
- Docker user-defined bridge networks (DNS resolution behavior): https://docs.docker.com/engine/network/#dns-services
- Docker Compose networks top-level element: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose `ipam` configuration: https://docs.docker.com/reference/compose-file/networks/#ipam
- nginx Docker Hub: https://hub.docker.com/_/nginx
- postgres Docker Hub (15-alpine tag): https://hub.docker.com/_/postgres
- IPv4 CIDR arithmetic verification (RFC 4632)

## Issues Found
- **IP range comment was mathematically incorrect.** The original comment for the `--ip-range` example stated "Subnet /24, but only assign IPs from .128 to .191", but the value `192.168.100.128/25` actually covers `.128` through `.255` (128 addresses). A `/26` would have been required for the `.128`-`.191` range. Updated the comment to "Subnet /24, but only assign IPs from .128 to .255" to accurately reflect the `/25` CIDR being used in the command.

## Review Notes
- The `version: "3.8"` field at the top of the Compose file is valid and still accepted, but is considered obsolete in modern Docker Compose v2 and will produce a deprecation warning. It is functionally harmless and was left in place per the instruction not to make stylistic changes.
- The default Docker bridge network (`docker0`) typically uses `172.17.0.0/16`, but this can be reconfigured via daemon options. The post's wording is acceptable as it describes the out-of-the-box default.
- Container name DNS resolution on user-defined bridge networks (as used in the "Connecting Two Containers" section) is correct — this feature is only available on user-defined networks, not the default `bridge`.
- All `docker network create`, `docker run`, `docker network inspect`, and `docker network rm` commands and flags match current Docker CLI behavior.
- The Docker Compose `ipam.config` schema (`subnet`, `gateway`) is valid and current.
