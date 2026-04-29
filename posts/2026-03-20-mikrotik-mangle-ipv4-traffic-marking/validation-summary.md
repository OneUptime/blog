# Validation Summary: How to Configure Mangle Rules for IPv4 Traffic Marking on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS (v7)
- /ip firewall mangle (mark-connection, mark-packet, mark-routing, change-dscp)
- Policy routing with /routing table and /ip route
- DSCP / DiffServ remarking (EF / DSCP 46)
- /queue tree for bandwidth shaping
- IPv4 connection tracking

## Sources Consulted
- [MikroTik Mangle documentation](https://help.mikrotik.com/docs/spaces/ROS/pages/48660587/Mangle)
- [MikroTik Policy Routing documentation (RouterOS 7)](https://help.mikrotik.com/docs/spaces/ROS/pages/59965508/Policy+Routing)
- [MikroTik IP Routing documentation](https://help.mikrotik.com/docs/spaces/ROS/pages/328084/IP+Routing)
- MikroTik community forum threads on RouterOS 7 routing-table syntax and FIB flag

## Issues Found

1. **Policy routing — wrong creation order.** The original post added the route with `routing-table=ISP2-ROUTE` *before* declaring the routing table with `/routing table add name=ISP2-ROUTE fib`. In RouterOS 7 the route command will fail because the referenced routing table does not yet exist. Reordered the two commands so the table is created first, then the route is added to it.

2. **Per-host download marking — wrong match field.** The original rule used `src-address=192.168.1.100 in-interface=ether1`. With ether1 acting as the WAN, no packet whose source address is a private LAN IP can ingress from the WAN, so this rule would never match. Changed `src-address` to `dst-address=192.168.1.100`, which correctly matches inbound (download) traffic destined for that LAN host after NAT translation in connection tracking.

## Review Notes
- All mangle actions (`mark-connection`, `mark-packet`, `mark-routing`, `change-dscp`), chain names (`prerouting`, `forward`), and parameters (`connection-state=new`, `passthrough`, `new-connection-mark`, `new-packet-mark`, `new-routing-mark`, `new-dscp`) match the official RouterOS reference.
- DSCP value 46 = EF (Expedited Forwarding) is correct per RFC 3246.
- The `change-dscp` rule for VoIP could equivalently use `chain=postrouting`; `chain=forward` is also valid for transit traffic and was left unchanged.
- The Steam/Source game port range 27015–27020/UDP and the common SIP/RTP range 10000–20000/UDP are reasonable defaults — left unchanged.
- The two-step mark-connection then mark-packet pattern, with `passthrough=yes` on the connection mark and `passthrough=no` on the packet mark, follows MikroTik's recommended performance pattern.
- The `/queue tree` syntax with `parent=global packet-mark=...` is current RouterOS syntax.
