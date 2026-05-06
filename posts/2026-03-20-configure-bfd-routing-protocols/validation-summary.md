# Validation Summary: How to Configure Bidirectional Forwarding Detection (BFD) with Routing Protocols

## Status
validated

## Post Type
Guide

## Technologies Covered
- Bidirectional Forwarding Detection (BFD)
- FRRouting (FRR)
- OSPF
- BGP
- Linux networking commands

## Sources Consulted
- FRRouting BFD documentation: https://docs.frrouting.org/en/stable-10.3/bfd.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/stable-10.3/bgp.html
- FRRouting VTY shell documentation: https://docs.frrouting.org/en/latest/vtysh.html
- RFC 5880, Bidirectional Forwarding Detection (BFD): https://datatracker.ietf.org/doc/html/rfc5880
- RFC 4271, A Border Gateway Protocol 4 (BGP-4): https://datatracker.ietf.org/doc/rfc4271/
- FRRouting basic setup documentation for daemon enablement: https://docs.frrouting.org/en/stable-7.4/setup.html

## Issues Found
- The introduction described BGP's "keepalive timeout (90 seconds)". I changed this to BGP's default hold timer because RFC 4271 defines a suggested 90-second HoldTime and a KeepaliveTime of one-third of HoldTime, so the original wording mixed the two timers.
- The BFD overview said endpoints send "Hello packets". I changed this to "BFD control packets" to match RFC 5880 terminology more closely.
- The verification section used `show bfd peers detail`, which is not documented in current FRR BFD CLI references. I replaced it with `show bfd peer 10.0.0.2`.
- The sample BFD output included fields and formatting that do not match the documented FRR examples, including `RTT min/avg/max` and the `BFD Peers` header for a single-peer lookup. I updated the sample to align with FRR's documented `show bfd peer` output structure.
- The failover test implied that shutting down the local interface validates BFD timing directly. I added a caveat because on directly connected peers the kernel may report interface-down before BFD expiration, so that test is not a pure BFD timing check.

## Review Notes
- FRR documentation contains some overlap between generic BFD peer configuration examples and routing-protocol-specific BFD commands. The post's OSPF and BGP configuration style is acceptable for illustrating protocol integration, but operators should still ensure the underlying routing session itself is otherwise fully configured.
