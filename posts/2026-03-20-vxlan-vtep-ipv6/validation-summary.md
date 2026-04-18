# Validation Summary: How to Configure VXLAN VTEPs with IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- VXLAN (Virtual eXtensible LAN) overlay networking
- VTEP (VXLAN Tunnel Endpoint) configuration
- IPv6 underlay
- Linux networking with iproute2 (`ip link`, `bridge`, `ip neigh`)
- Linux bridge with ARP/ND suppression
- FDB (Forwarding Database) management and head-end replication for BUM traffic
- Linux VRF (virtual routing and forwarding)
- L3 VXLAN / symmetric IRB
- `tcpdump` for VXLAN packet capture

## Sources Consulted
- iproute2 `bridge(8)` man page — https://manpages.debian.org/unstable/iproute2/bridge.8.en.html
- iproute2 `ip-link(8)` man page (VXLAN + bridge_slave sections) — https://manpages.debian.org/unstable/iproute2/ip-link.8.en.html
- Linux kernel VXLAN documentation — https://www.kernel.org/doc/Documentation/networking/vxlan.txt
- Linux kernel `include/uapi/linux/if_link.h` — for `IFLA_BRPORT_NEIGH_SUPPRESS` attribute location
- NVIDIA/Cumulus Linux EVPN documentation — https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-56/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/
- Vincent Bernat, "VXLAN & Linux" — https://vincent.bernat.ch/en/blog/2017-vxlan-linux
- iputils `ping(8)` man page — https://manpages.debian.org/testing/iputils-ping/ping.8.en.html
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN) — https://www.rfc-editor.org/rfc/rfc7348
- IANA Service Name and Transport Protocol Port Number Registry (UDP/4789 for VXLAN)

## Issues Found

1. **Incorrect `via vxlan100` in `bridge fdb append`** — The `via DEVICE` parameter specifies the **underlay** outgoing interface the VXLAN driver should use to reach the remote VTEP; it is never the VXLAN device itself (that would be a circular reference). For a standard head-end-replication BUM entry, `via` is optional and normally omitted so the kernel can do a normal FIB lookup on the destination VTEP address. **Fix:** removed the `via vxlan100` line from the `bridge fdb append` command, leaving the canonical form `bridge fdb append 00:00:00:00:00:00 dev vxlan100 dst ${VTEP}`.

2. **`neigh_suppress` applied to the wrong object** — The original post used `ip link set br100 type bridge neigh_suppress on`, treating `neigh_suppress` as a bridge-master attribute. In fact, `neigh_suppress` is a per-port (bridge_slave) attribute — the kernel netlink attribute is `IFLA_BRPORT_NEIGH_SUPPRESS` (a `BRPORT_*` attribute), and it appears only in the `bridge_slave` section of `ip-link(8)`, not in the `bridge` master section. NVIDIA/Cumulus EVPN docs likewise show it enabled on the VXLAN slave port. **Fix:** replaced with `ip link set vxlan100 master br100` followed by `ip link set vxlan100 type bridge_slave neigh_suppress on`, and updated the comment to clarify that `neigh_suppress` is a per-port attribute.

## Review Notes
- `local 2001:db8:1::1` on the `ip link add ... type vxlan` command is correct for IPv6 underlay in modern iproute2 (≥ v4.11, kernel ≥ 4.13). There is no `local6` keyword — the single `local` parameter accepts both IPv4 and IPv6 addresses. The post is correct here.
- `dstport 4789` correctly uses the IANA-assigned VXLAN UDP port per RFC 7348.
- `ping6` as a separate binary was merged into `ping` in iputils s20150815 (2015); mainstream distros still ship a `ping6` symlink for compatibility, so the command in the monitoring section still works. A future revision could prefer `ping -6` for portability on minimal/embedded systems, but this is not a strict error.
- The L3 VXLAN (symmetric IRB) section enslaves the VXLAN interface directly to a VRF without an intermediate bridge/SVI. This is a simplified sketch — in a full symmetric-IRB deployment the L3 VNI VXLAN is typically enslaved to a bridge whose SVI is in the VRF (as used by FRR's EVPN). The shown syntax is valid kernel syntax, and the section is labelled as an overview rather than a complete production recipe, so I left it unchanged.
- `nolearning` on the VXLAN device is appropriate when FDB entries are being managed manually (as in the head-end-replication example here) or by a control plane such as BGP EVPN.
- The conclusion's recommendation to use BGP EVPN for production is accurate and a good pointer for readers.
