# Validation Summary: How to Access Host Services from a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- Podman bridge networks
- Rootless Podman networking with pasta and slirp4netns
- PostgreSQL host service access

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-network` documentation: https://docs.podman.io/en/stable/markdown/podman-network.1.html
- PostgreSQL `listen_addresses` documentation: https://www.postgresql.org/docs/17/runtime-config-connection.html
- pasta/passt project documentation: https://passt.top/passt/about/
- pasta/passt manual page: https://www.mankier.com/1/passt

## Issues Found
- The host-networking example used `curl` directly from `docker.io/library/alpine:latest`. Alpine does not include `curl` by default, so the command would fail in a fresh container. Updated the example to install `curl` before using it.
- The post said pasta allows access to host loopback by default and showed `--network pasta` with `host.containers.internal`. Podman's documentation describes `pasta:--map-gw` as the option that allows the container to directly reach the host through the gateway address. Updated the example to use `--network pasta:--map-gw` and connect through the default gateway discovered inside the container.
- The summary said pasta networking provides the easiest host loopback access for rootless containers. Updated it to state that direct host loopback access with pasta requires enabling gateway mapping with `pasta:--map-gw`.

## Review Notes
- `host.containers.internal` and `host-gateway` are supported by current Podman, but Podman notes that automatic host-gateway detection depends on network setup and can be skipped if Podman cannot determine the address.
- The default Podman bridge subnet is configurable, so `10.88.0.1` is a common default example rather than a universal value.
- The slirp4netns host-loopback example is accurate for the documented default `10.0.2.2` host loopback IP when `allow_host_loopback=true` is enabled.
