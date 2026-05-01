# Validation Summary: How to Configure DNS Resolution in Docker macvlan Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine networking
- Docker `macvlan` networks
- Docker DNS and container name resolution
- Docker CLI (`docker network create`, `docker run`, `docker exec`)
- Docker Compose network and DNS configuration

## Sources Consulted
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker macvlan network driver documentation: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker CLI reference for `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose services reference (`dns`, `dns_search`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/

## Issues Found
- The post's main claim was incorrect. Docker's networking documentation says containers attached to a custom network use Docker's embedded DNS server (`127.0.0.11`), so `macvlan` does not inherently bypass Docker DNS. I corrected the introduction, the DNS explanation, and the conclusion to reflect current Docker behavior.
- The text implied DNS servers can be specified when creating the network. The current `docker network create` reference has no `--dns` option; DNS overrides are configured per container. I corrected the section heading and explanatory text so network creation and container-level DNS settings are not conflated.
- The multiline `docker run` examples were not valid shell syntax because they placed inline comments after line-continuation backslashes. I rewrote those examples so they are syntactically correct.
- The DNS verification example queried `8.8.8.8` directly, which bypasses the container's configured resolver and does not validate the configuration described by the post. I changed it to inspect `/etc/resolv.conf` and resolve a hostname through the container's configured DNS settings.
- The `dnsmasq on the host` example omitted a key macvlan limitation: macvlan containers cannot communicate directly with the host unless the host has its own macvlan interface on that subnet. I corrected the explanation and the example so it points to a reachable resolver IP and documents the host-side requirement.
- The Compose snippet used the top-level `version: "3.8"` field, which current Docker Compose documentation marks as obsolete. I removed it.

## Review Notes
- The post is now aligned with current Docker documentation, but the examples still assume a Linux Docker host; Docker documents `macvlan` as Linux-only and unsupported on Docker Desktop for Mac/Windows and in rootless mode.
- Docker was not installed in the local review environment, so the commands were validated against official Docker documentation rather than executed locally.
