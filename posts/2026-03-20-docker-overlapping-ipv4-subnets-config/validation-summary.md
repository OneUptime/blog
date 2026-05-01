# Validation Summary: How to Configure Docker Networking for Containers with Overlapping IPv4 Subnets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- IPv4 subnet allocation
- Linux routing inspection with `ip route`
- Docker daemon configuration via `daemon.json`

## Sources Consulted
- Docker Docs: `docker network create` reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The post originally stated that two Docker bridge networks could be created with the same IPv4 subnet and that Docker would add conflicting host routes. Current Docker documentation says Docker Engine creates non-overlapping local subnets by default and that overlapping subnet creation fails, so the explanation and example were corrected.
- The section on same-subnet isolation originally claimed two bridge networks with identical IPv4 ranges could coexist safely on one Docker host. That was incorrect for standard Docker bridge networks, so the section was rewritten to explain that this is not supported on a single Docker daemon.
- The shell snippet under subnet conflict checking originally implied it detected overlaps automatically and used an unusual sort key. It was corrected to accurately describe that it lists Docker network subnets for manual verification.
- The external-overlap example originally described removing and recreating a network as a rename. That wording was corrected to "recreate" because Docker network names and subnets are changed by recreating the network, not renaming it.

## Review Notes
- The route inspection examples are Linux-specific because they use `ip route`. On Docker Desktop, bridge networking is implemented differently from native Linux hosts.
- `default-address-pools` helps Docker avoid automatically allocating conflicting subnets, but explicitly chosen `--subnet` values still need to be selected carefully.
