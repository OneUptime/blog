# Validation Summary: How to Create a VXLAN Interface on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN, RFC 7348)
- Linux iproute2 (`ip link`, `ip addr`)
- Linux kernel networking (VTEP, overlay networks)
- iptables
- systemd-networkd (`.netdev`, `.network` files)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN)
- `ip-link(8)` man page — Linux iproute2 documentation for VXLAN link type
- `systemd.netdev(5)` man page — `[VXLAN]` section options
- Linux kernel VXLAN driver documentation (drivers/net/vxlan)
- IANA Service Name and Transport Protocol Port Number Registry (port 4789 / vxlan)

## Issues Found
- **systemd-networkd `[VXLAN]` section key**: The post originally used `Id=100` in the `[VXLAN]` section of the `.netdev` file. The current `systemd.netdev(5)` documentation only lists `VNI=` (added in systemd v243) as the documented key for the VXLAN Network Identifier. Updated `Id=100` to `VNI=100` to match current systemd documentation.

## Review Notes
- VXLAN support was indeed added in Linux kernel 3.7 (December 2012). Prerequisites are accurate.
- The 24-bit VNI giving ~16M segments vs 802.1Q's 4094 VLANs (12-bit VID, 0 and 4095 reserved) is correct.
- IANA-assigned VXLAN port is 4789; Linux kernel historically defaulted to 8472 (this is correctly noted in the post).
- The `ip link add ... type vxlan id <VNI> dstport <port> dev <iface>` syntax matches `ip-link(8)`.
- The `ip -d link show` sample output (`srcport 0 0 dstport 4789 ageing 300`) matches typical kernel output; `srcport 0 0` represents the source port range min/max defaults.
- The inline-comment style in the multi-line `ip link add` examples (e.g., `id 100 \           # VNI ...`) is illustrative documentation; bash will not actually treat the trailing `# ...` after `\` as a comment line continuation, so users should remove inline comments before executing. This is a common tutorial pattern and was left unchanged as the author's intent is clearly to annotate parameters.
- For systemd-networkd: `Id=` may still be accepted as a legacy alias in some systemd versions, but `VNI=` is the documented and forward-compatible key.
- The `local`, `remote`, `dstport`, `ttl`, and `dev` parameters are all valid VXLAN options per `ip-link(8)`.
- iptables port 4789 UDP rules are correct for IANA-standard VXLAN traffic.
