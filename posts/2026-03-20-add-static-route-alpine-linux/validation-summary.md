# Validation Summary: How to Add a Static Route on Alpine Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Alpine Linux
- ifupdown-ng
- OpenRC
- Linux routing with `iproute2`
- BusyBox `route`
- Docker

## Sources Consulted
- Alpine Linux Configure Networking: https://wiki.alpinelinux.org/wiki/Configure_Networking
- Alpine Linux Ifupdown-ng: https://wiki.alpinelinux.org/wiki/Ifupdown-ng
- Alpine Linux OpenRC: https://wiki.alpinelinux.org/wiki/OpenRC
- Docker Engine, Running containers: https://docs.docker.com/engine/containers/run/
- ifupdown-ng `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown-ng/interfaces.5.en.html
- BusyBox `route --help` output checked locally to verify legacy command syntax.

## Issues Found
- The introduction described Alpine as using a BusyBox-based networking stack by default. I corrected this to `ifupdown-ng`, which Alpine documents as the default network configuration manager.
- The legacy `route add` example used CIDR notation (`192.168.2.0/24`), but BusyBox `route` expects the destination and `netmask` as separate arguments. I changed it to `route add -net 192.168.2.0 netmask 255.255.255.0 gw 10.0.0.1`.
- The container example omitted the Docker capability required to modify a container's routing table. I added the requirement to run the container with `--cap-add=NET_ADMIN`.
- The description and conclusion implied an Alpine-specific `iproute2` configuration and said Alpine has no NetworkManager. I corrected this to reflect Alpine's default `ifupdown-ng` and OpenRC setup without implying NetworkManager is unavailable.

## Review Notes
- The post uses legacy `iface eth0 inet ...` syntax in `/etc/network/interfaces`. That syntax is still valid on current Alpine because `ifupdown-ng` is backward compatible with traditional `ifupdown`/BusyBox-style interface stanzas.
- Alpine documentation also shows persistent routes can be attached to interface lifecycle hooks such as `up`/`post-up`; the post's `post-up` and `pre-down` approach remains valid.
- Alpine has an OpenRC-based local startup mechanism under `/etc/local.d/`, so the `/etc/local.d/*.start` example is technically sound.
