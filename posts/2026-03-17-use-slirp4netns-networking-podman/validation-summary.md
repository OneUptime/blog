# Validation Summary: How to Use slirp4netns Networking with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- slirp4netns
- Rootless container networking
- containers.conf
- pasta

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `podman-info` official documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- containers/common `containers.conf` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- slirp4netns official repository and manual information: https://github.com/rootless-containers/slirp4netns
- Local `slirp4netns --help` and `slirp4netns --version` output

## Issues Found
- The post used `podman info --format '{{ .Host.Slirp4NetNs.Executable }}'`, which depends on an uncertain Go template field spelling for the slirp4netns info object. Changed it to `podman info | grep -A3 slirp4netns`, matching the documented `podman info` output shape.
- The connectivity check ran `ping` inside `docker.io/library/nginx:latest`; that image normally does not include ping. Changed the outbound connectivity check to use a short-lived Alpine container.
- Later examples reused the `web` container name and port `8080`, which would fail if the tutorial examples were run sequentially. Renamed the rootlesskit example container and changed its host port to `8082`; changed the pasta example host port to `8083`.
- The host access example said it mapped the host gateway to a hostname, but the command only enables slirp4netns host-loopback access and pings the gateway IP. Updated the comment to describe the command accurately.
- The `default_rootless_network_cmd` example placed the option under `[containers]`. Current containers.conf documentation places it under `[network]`, so the snippet now uses `[network]`.

## Review Notes
The slirp4netns network options shown in the post are current in official Podman documentation. Podman documentation now lists `pasta` as the default rootless networking stack, while slirp4netns remains supported and configurable.
