# Validation Summary: How to Handle ARP Suppression in VXLAN Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iproute2`
- Linux VXLAN
- ARP and neighbor tables
- Linux bridge FDB
- BGP EVPN
- Open vSwitch

## Sources Consulted
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` Linux manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- RFC 7432, BGP MPLS-Based Ethernet VPN: https://www.rfc-editor.org/rfc/rfc7432.html
- RFC 9161, Operational Aspects of Proxy ARP/ND in Ethernet Virtual Private Networks: https://www.rfc-editor.org/rfc/rfc9161.html
- Open vSwitch VXLAN FAQ: https://docs.openvswitch.org/en/stable/faq/vxlan/
- `ovs-vswitchd.conf.db(5)` Open vSwitch database schema: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html

## Issues Found
- Fixed the `ip link set` example. `ip link set vxlan0 type vxlan proxy on` was not the documented VXLAN type-argument form; it was changed to `ip link set dev vxlan0 type vxlan proxy`.
- Fixed the FDB example. `bridge fdb add ... permanent` was incorrect for this command; it was changed to `bridge fdb add ... static dst ...` to match `bridge(8)` syntax for VXLAN FDB entries.
- Fixed the packet-capture example. The post referenced `br-vxlan`, but that interface was never created in the article, so the example was changed to `vxlan0`.
- Corrected the mapping direction from `MAC-to-IP` to `IP-to-MAC`.
- Clarified the EVPN explanation. Remote VTEPs do not generically "populate their neighbor tables" in all implementations; the text now refers to proxy ARP/ND and forwarding tables, which is the standards-based behavior described in RFC 9161.
- Replaced the Open vSwitch section. `other_config:mac-table-size` only controls MAC-learning table capacity and does not enable ARP suppression.
- Corrected the verification and conclusion language so it no longer implies that all ARP flooding disappears. Known-IP requests can be answered locally, while unknown requests may still need flooding unless the fabric has complete binding knowledge.

## Review Notes
- The Linux post is now technically correct for the VXLAN `proxy` feature it documents. In bridge-based Linux VXLAN designs, operators may also use bridge-port neighbor suppression features such as `neigh_suppress`; that is a related mechanism but was outside the original scope of this post.
- The OVS section is intentionally high-level after correction, because OVS behavior depends on the control plane above it rather than on a single bridge-level ARP-suppression toggle.
