# Validation Summary: How to Set the VXLAN Destination Port (UDP 4789)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- VXLAN (Virtual eXtensible LAN) per RFC 7348
- Linux `iproute2` (`ip link`)
- iptables and nftables
- UFW (Uncomplicated Firewall)
- `ss` (socket statistics) and `tcpdump`
- systemd-networkd (`.netdev` VXLAN configuration)
- VMware NSX, AWS, Azure, Cisco ACI (interoperability references)

## Sources Consulted
- RFC 7348 — "Virtual eXtensible Local Area Network (VXLAN)" (https://www.rfc-editor.org/rfc/rfc7348) — confirms UDP 4789 assignment and 2014 publication.
- Linux kernel source `drivers/net/vxlan/vxlan_core.c` — confirms kernel default `vxlan_port = 8472` retained for ABI compatibility.
- Linux kernel docs `Documentation/networking/vxlan.rst` — confirms the 8472/4789 history and default behavior.
- iproute2 source `ip/iplink_vxlan.c` — confirms `srcport MIN MAX` / `dstport PORT` output format and `IFLA_VXLAN_PORT` being create-only.
- `systemd.netdev(5)` man page — confirms `[VXLAN]` keys `VNI=`, `Local=`, `Remote=`, `DestinationPort=`.
- Vendor docs: VMware NSX-V vs NSX-T port defaults; AWS Traffic Mirroring (4789); Cisco ACI iVXLAN (4789).

## Issues Found

1. **Incorrect `ip -d link show` output format.** The post claimed the output would include `port 0 4789`. The actual iproute2 output uses two distinct fields: `srcport 0 0` (source port range min/max) and `dstport 4789` (destination port). Corrected the example output to `srcport 0 0 dstport 4789`.

2. **Fabricated `vxland` daemon in `ss -ulnp` output.** The post showed `users:(("vxland",pid=...))` as expected output. No `vxland` user-space daemon exists — Linux VXLAN is implemented entirely in the kernel via `udp_tunnel`/`udp_sock_create`, so `ss -ulnp` does not associate the UDP 4789 listener with any user-space process. Replaced the misleading output with a realistic kernel-socket line and added a clarifying comment that VXLAN is a kernel tunnel with no user-space process shown.

## Review Notes
- The Linux default port of 8472 still persists in the kernel for ABI/back-compat reasons; modern iproute2 actually refuses to create a VXLAN interface without an explicit `dstport`, which reinforces the post's recommendation to always set it.
- The nftables snippet is illustrative and does not include the `type filter hook input priority 0; policy accept;` line that a complete standalone chain would need — but this is fine as a "rule within an existing chain" example.
- The "VMware NSX: 8472" line in the history table is specifically true for NSX-V; NSX-T uses 4789. The post later qualifies this with "may use 8472" in the interoperability section, so no change needed, but readers should note the distinction.
- `IFLA_VXLAN_PORT` is a create-only netlink attribute, so the post's guidance that you must recreate the interface to change `dstport` is correct.
