# Validation Summary: How to Create Docker Networks with IPv6 Subnets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker bridge networks
- IPv6 subnetting and addressing
- Docker CLI (`docker network`, `docker run`, `docker inspect`)

## Sources Consulted
- Docker Docs: Networking overview — https://docs.docker.com/engine/network/
- Docker Docs: Use IPv6 networking — https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Bridge network driver — https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: `docker network create` — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker network ls` — https://docs.docker.com/reference/cli/docker/network/ls/
- Docker Docs: `docker network connect` — https://docs.docker.com/reference/cli/docker/network/connect/
- Docker Docs: `docker container run` — https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: `docker inspect` — https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
1. **The introduction incorrectly said custom networks require an explicit IPv6 subnet.** Current Docker documentation says user-defined networks can be created with `--ipv6` alone, and Docker will automatically choose a ULA subnet when no IPv6 `--subnet` is provided. Updated the introduction and conclusion to reflect that behavior.

2. **The “IPv6-only” bridge network example was not actually IPv6-only.** Docker enables IPv4 address allocation by default on new networks. Per the official networking docs, an IPv6-only bridge network requires `--ipv4=false` together with `--ipv6`. Added `--ipv4=false` to the example.

3. **The `docker network ls` example claimed to show IPv6 status but did not output it.** The original template only displayed name, driver, and ID. Updated the format string to include the documented `.IPv6` placeholder so the command now actually shows IPv6 status.

4. **The loop that said it inspected custom networks actually iterated over all networks.** `docker network ls -q` includes built-in networks such as `bridge`, `host`, and `none`. Updated the loop to use `--filter type=custom` so the command matches the comment.

5. **The explanation of `--internal` overstated the level of isolation.** Docker documents `--internal` as removing the default route to other networks and restricting external access, while host-to-container communication can still exist. Updated the wording from “no external connectivity” to “no default route to other networks.”

## Review Notes
- Docker’s IPv6 documentation states IPv6 networking is supported on Docker daemons running on Linux hosts. Readers using non-Linux environments may still encounter host-specific differences depending on how their Docker daemon is provided.
- The `python3 -c` inspection examples are technically valid, but they depend on Python being installed on the host. Docker’s `--format` output could be used as a pure-CLI alternative in a future revision.
