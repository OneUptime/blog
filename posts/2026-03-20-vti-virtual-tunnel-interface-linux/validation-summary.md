# Validation Summary: How to Create a VTI (Virtual Tunnel Interface) on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux VTI (Virtual Tunnel Interface)
- IPsec
- iproute2 (`ip link`, `ip addr`, `ip route`)
- StrongSwan (ipsec.conf)
- XFRM marks
- Routing daemons (OSPF, BGP, FRRouting)

## Sources Consulted
- iproute2 `ip-link(8)` man page — `vti` link type parameters (`local`, `remote`, `key`, `ikey`, `okey`)
- StrongSwan documentation — ConnSection / ipsec.conf reference (`mark`, `mark_in`, `mark_out`, `if_id_in`, `if_id_out`)
- StrongSwan wiki — RouteBasedVPN / VirtualTunnelInterfaces page
- Linux kernel documentation — `Documentation/networking/vti.txt` (legacy) and XFRM interface notes
- `ip-tunnel(8)` man page

## Issues Found
- **StrongSwan configuration mixed VTI and XFRM-interface options.** The original config included both `mark=1` (the VTI mechanism) and `if_id_out=1`/`if_id_in=1` (which are options for XFRM interfaces, the modern replacement for VTI). These are two different mechanisms and should not be combined in a single connection — VTI tunnels are matched by mark, while XFRM interfaces are matched by `if_id`. Removed the two `if_id_*` lines so the config correctly describes a mark-based VTI configuration consistent with the rest of the post.

## Review Notes
- The `ip link add vti0 type vti ... key 1` syntax is correct; `key` sets both `ikey` and `okey` to the same value, which matches the expected `ip -d link show` output shown later in the post.
- The MTU value of 1400 is a reasonable rule-of-thumb for IPsec overhead, though the optimal value depends on outer transport, cipher, and PMTU. Acceptable as a starting point.
- For a fully working setup, StrongSwan typically also needs `installpolicy=no` (or a custom updown script) so it doesn't install conflicting kernel routing policies — the post intentionally focuses on the VTI/IPsec mark linkage and does not cover this, which is acceptable for an introductory guide but worth noting.
- XFRM interfaces (`ip link add type xfrm if_id ...`) are now the recommended modern alternative to VTI in newer kernels and StrongSwan versions; a future revision could mention this as a forward-looking note, but the VTI mechanism described in the post is still valid and widely used.
