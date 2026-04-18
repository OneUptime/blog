# Validation Summary: How to Configure VXLAN Learning Mode (Source Address Learning)

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- VXLAN (RFC 7348)
- Linux kernel VXLAN driver
- iproute2 (`ip link`, `bridge fdb`)
- FDB (Forwarding Database) / MAC learning
- EVPN (mentioned as an alternative control plane)
- Multicast BUM flooding

## Sources Consulted
- `ip-link(8)` man page (iproute2-6.1.0) — VXLAN options: `id`, `group`, `local`, `dstport`, `srcport`, `[no]learning`, `ageing`, `dev`
- `bridge(8)` man page — `bridge fdb add/show` syntax
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN)
- Linux kernel VXLAN driver source (`drivers/net/vxlan/vxlan_core.c`) — default ageing 300s, changelink support
- Local test of bash line-continuation behavior with `\` followed by inline `#` comment

## Issues Found

1. **Broken bash line continuation** (Enabling MAC Learning section): The line `group 239.1.1.10 \   # Multicast for initial BUM traffic` does not work as intended. The backslash escapes the trailing space, but the `#` that follows (after unescaped whitespace) still starts a comment that consumes the newline, breaking the continuation — `dev eth0` would be executed as a separate (failing) command. Verified by direct test (`bash -c '...'` returns exit 127 with `bash: line 2: bar: command not found`). **Fix:** moved the explanatory note to a comment on its own line above the command.

2. **Invalid iproute2 field name `syflowd`** (verification-output comment): `syflowd` is not a parameter emitted by `ip -d link show` for VXLAN interfaces. The actual VXLAN detail output shows `srcport MIN MAX dstport PORT ageing SECONDS ...` per the iproute2 source and man page. **Fix:** replaced `syflowd 0` with the correct `srcport 0 0 dstport 4789`.

## Review Notes

- `ageing` default of 300 seconds is correct per iproute2 and kernel source.
- `nolearning` and the `bridge fdb add 00:00:00:00:00:00 ... self permanent` syntax for BUM entries are correct.
- `ip link set vxlan10 type vxlan ageing 60` to change ageing at runtime is supported by the kernel's `vxlan_changelink` path.
- The partial command snippet on line 49 (`ip link add vxlan10 type vxlan id 10 dstport 4789 local 10.0.0.1 ageing 60 ...`) is illustrative rather than runnable as shown — the trailing `...` indicates a remote/group/dev must still be supplied. Acceptable as a stylistic shorthand.
- The comparison table is subjective but reasonable; no technical errors.
