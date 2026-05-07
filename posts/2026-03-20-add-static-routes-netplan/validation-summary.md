# Validation Summary: How to Add Static Routes with Netplan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan
- Linux networking on Ubuntu and Debian
- Static routing
- `iproute2` / `ip route`

## Sources Consulted
- Netplan documentation: YAML configuration reference — https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan documentation: `netplan apply` CLI reference — https://netplan.readthedocs.io/en/stable/netplan-apply/
- Debian package reference for `netplan.io` — https://packages.debian.org/netplan.io
- `ip-route(8)` manual page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ip route help` output from the installed `iproute2` CLI

## Issues Found
1. **The conclusion overstated the minimum required route fields.** The post said every route requires both `to` and `via`, but Netplan's route schema only requires `to`. This mattered because the post's own blackhole route example correctly omits `via`. I updated the conclusion to state that `to` is required and that routed entries typically also include `via`.

2. **The verification comment for `ip route get` was inaccurate.** The post described `ip route get` as tracing a destination, but the command performs a kernel route lookup and shows the selected route rather than doing a traceroute-style path trace. I changed the comment to describe it as checking route selection for a destination.

## Review Notes
- The Netplan examples are consistent with the current route syntax, including `to: default`, route `metric`, `type: blackhole`, and `from` on route entries.
- Netplan is available on Debian, but unlike Ubuntu Server it is not typically the default network configuration layer on Debian installations.
- For remote systems, `netplan try` is often safer than `netplan apply` because it provides rollback on loss of connectivity. The post is still technically correct using `netplan apply`.
