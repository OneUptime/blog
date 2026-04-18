# Validation Summary: How to Use VXLAN with EVPN Control Plane on Linux

## Status
validated

## Post Type
Tutorial / Technical how-to guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN)
- EVPN (Ethernet VPN, RFC 7432)
- BGP (Border Gateway Protocol)
- FRR (Free Range Routing)
- Linux iproute2 (`ip link`, `bridge` commands)
- Linux bridge subsystem
- vtysh (FRR CLI)

## Sources Consulted
- [RFC 7432 — BGP MPLS-Based Ethernet VPN](https://www.rfc-editor.org/rfc/rfc7432.html)
- [FRR EVPN documentation](https://docs.frrouting.org/en/latest/evpn.html)
- [FRR BGP documentation](https://docs.frrouting.org/en/latest/bgp.html)
- [Linux kernel VXLAN documentation](https://www.kernel.org/doc/Documentation/networking/vxlan.txt)
- [bridge(8) manual page](https://man7.org/linux/man-pages/man8/bridge.8.html)
- [Vincent Bernat — VXLAN: BGP EVPN with FRR](https://vincent.bernat.ch/en/blog/2017-vxlan-bgp-evpn)

## Issues Found

1. **Incorrect FRR VNI configuration placement (Step 3).** The `vni 10` stanza with `rd` and `route-target` import/export was shown as a top-level block outside `router bgp`. Per FRR docs, `vni` is a sub-node of `address-family l2vpn evpn` inside `router bgp`, with its own `exit-vni` terminator. Fixed by nesting the block correctly under `router bgp 65001` → `address-family l2vpn evpn` → `vni 10` → `exit-vni`. Also renamed the section heading from "Map VNI to VRF (Optional for L3 EVPN)" to "Configure Per-VNI Route Distinguisher and Route Targets" since this configuration does not map a VNI to a VRF — that is a separate L3 EVPN concept using the `vrf` stanza.

2. **Inaccurate FDB flag example (Step 4).** The post showed EVPN-learned entries as `aa:bb:cc:dd:ee:01 dev vxlan10 dst 10.0.0.2 self` with the explanation that absence of `permanent` indicates EVPN origin. The `self` flag only means the entry belongs to the VXLAN device FDB (not the bridge FDB) and does not distinguish EVPN vs. manual entries. EVPN-installed entries actually carry the `extern_learn` flag. Updated the example to include `extern_learn` and corrected the explanatory comment.

## Review Notes
- The `advertise-all-vni`, `update-source lo`, `no bgp default ipv4-unicast`, and all `vtysh` show commands are correct per FRR documentation.
- The `nolearning` flag on the VXLAN interface is the correct pattern for EVPN deployments since the control plane (not data-plane learning) populates the FDB.
- `arp -n` in Step 5 is still widely available but is legacy; on newer distributions `ip neigh show` is the iproute2 replacement. Not changed because both still work.
- RFC 7432 remains the foundational EVPN spec; RFC 9136 extends it with IP Prefix routes (Type-5) for L3 EVPN, which is out of scope for this post but worth noting if the author expands into L3 EVPN material.
- For production EVPN deployments, an underlay IGP (e.g., OSPF) or eBGP unnumbered fabric is usually required so loopbacks can reach each other; the post assumes reachability between VTEP loopbacks is already established.
