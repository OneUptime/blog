# Validation Summary: How to Create a VLAN Interface Inside a Network Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux network namespaces (`ip netns`)
- iproute2 (`ip link`, `ip addr`, `bridge`)
- 802.1Q VLAN tagging
- veth pairs
- VLAN-aware Linux bridges (`vlan_filtering`)

## Sources Consulted
- `ip-netns(8)` man page — https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `ip-link(8)` man page — https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` man page — https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux kernel VLAN documentation — https://www.kernel.org/doc/Documentation/networking/vlan.txt
- Linux kernel VLAN-aware bridge docs — https://www.kernel.org/doc/html/latest/networking/switchdev.html
- IEEE 802.1Q standard overview
- iproute2 source: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git

## Issues Found
1. **Misleading section title**: The "Complete Test" section was titled "Two Namespaces on Different VLANs" but both namespaces in the example were configured for VLAN 10 (same VLAN). The inline comment in the code even stated "same VLAN, should communicate." Changed the title to "Two Namespaces on the Same VLAN" so it matches the actual configuration and the expected outcome in the comment.
2. **Incomplete test setup**: The host-side peer ends of the veth pairs (`veth-a-br` and `veth-b-br`) were created but never attached to `br0`, so the "Complete Test" would not actually allow the two namespaces to communicate over the VLAN-aware bridge. Added the minimum required commands: `ip link set <peer> master br0`, `ip link set <peer> up`, and `bridge vlan add dev <peer> vid 10 tagged` for each namespace's host-side veth, which is consistent with the bridge setup documented earlier in the post.

## Review Notes
- The section heading "Setup: Move a Physical Interface into a Namespace" introduces a veth pair rather than moving a physical NIC; the inline comment explains why (moving a physical NIC would break host connectivity). The heading is a little loose but the content is technically accurate, so no change was made.
- `ip link set br0 type bridge vlan_filtering 1` is the correct post-creation way to enable VLAN filtering on an existing bridge. It can alternatively be set at creation time with `ip link add br0 type bridge vlan_filtering 1`; either form is valid.
- The example `ip -d link show` output (`vlan protocol 802.1Q id 10 <REORDER_HDR>`) matches the current iproute2 output format.
- When `vlan_filtering 1` is enabled, newly added ports do not automatically carry any VLANs; the `bridge vlan add` commands shown are required (and correctly used tagged mode for trunk-style VLAN transport).
- IP addressing (192.168.10.0/24 on VLAN 10, 192.168.20.0/24 on VLAN 20) is an arbitrary RFC1918 choice and is fine for demonstration.
