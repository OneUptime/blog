# Validation Summary: How to Configure Docker Container DNS Settings for IPv4 Resolution

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker container networking
- Docker DNS configuration
- Docker Compose
- Linux resolver configuration (`/etc/resolv.conf`)

## Sources Consulted
- Docker Docs: Networking overview https://docs.docker.com/engine/network/
- Docker Docs: `docker container run` CLI reference https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: `dockerd` CLI reference https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Compose services reference https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element (obsolete) https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help: `docker run --help`
- Local Docker CLI help: `dockerd --help`
- Local runtime validation using `nginx:alpine` containers and `docker compose config`

## Issues Found
- The introduction incorrectly implied Docker containers typically default to `8.8.8.8`. I changed it to reflect current Docker behavior: containers on the default `bridge` network copy the host's `/etc/resolv.conf`, while containers on user-defined networks use Docker's embedded DNS server at `127.0.0.11`.
- The single-container example used `--dns-opt`, which is not the current `docker run` flag. I changed it to `--dns-option`, which matches the current CLI. The `dns-opts` key in `daemon.json` and the `dns_opt` key in Compose were already correct and were left unchanged.
- The `/etc/resolv.conf` example was presented as an exact expected file. I changed it to "Relevant entries" because Docker also adds generated comments and the displayed order can vary.
- The Compose example used `version: "3.8"`. I removed it because the top-level `version` field is now obsolete in Compose and produces a warning.
- The testing section used `dig` inside `nginx:alpine`, but that image does not include `dig` by default. I replaced it with `getent ahostsv4`, which is present in the image and also matches the post's IPv4 focus.
- The embedded DNS section said Docker adds custom `--dns` servers after `127.0.0.11` inside the container. I corrected this to explain that on user-defined networks Docker keeps `127.0.0.11` in the container and forwards external lookups to the configured upstream DNS servers.

## Review Notes
- `systemctl restart docker` is valid on systemd-based Linux hosts. Other environments may use a different service-management command.
- The post's single-container example implicitly uses the default `bridge` network because it does not pass `--network`. That is consistent with the updated `resolv.conf` explanation.
- `nginx:alpine` includes `nslookup`, `ping`, `nc`, and `getent`, which makes the revised examples executable without installing extra packages.
