# Validation Summary: How to Troubleshoot OSPF Subnet Mask Mismatches

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OSPFv2 (RFC 2328)
- FRR (FRRouting) — `vtysh`, `ospfd`
- Cisco IOS / IOS XE
- IPv4 subnetting / CIDR

## Sources Consulted
- RFC 2328 (OSPF Version 2), §10.5 "Receiving Hello Packets" — https://datatracker.ietf.org/doc/html/rfc2328#section-10.5
- FRR ospfd documentation — https://docs.frrouting.org/en/latest/ospfd.html
- FRR source code (`ospfd/ospf_packet.c`) for the actual mask-mismatch log string — https://github.com/FRRouting/frr/blob/master/ospfd/ospf_packet.c
- Cisco "OSPF Neighbor Problems Explained" — https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13699-29.html
- Cisco IOS Debug Command Reference (Commands I–L) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i2.html
- Cisco IOS IP Routing: OSPF Command Reference — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-s1.html

## Issues Found

1. **Wrong neighbor state for mask mismatch.** The intro claimed neighbors get "stuck in the `ExStart` or `Down` state". Per RFC 2328 §10.5, a Hello with a mismatched Network Mask on a broadcast/NBMA link is silently discarded and the neighbor never forms — it stays in `Down`. `ExStart` is reached after `2-Way` and is classically a symptom of MTU mismatch, not mask mismatch. Rewrote the opening paragraph to reflect the actual behavior and cite RFC 2328 §10.5.

2. **Invalid FRR debug command.** `debug ospf hello` is not a valid FRR command. Per the FRR ospfd CLI grammar the correct form is `debug ospf [(1-65535)] packet (hello|...) (send|recv) [detail]`. Replaced `debug ospf hello` / `debug ospf packet hello detail` with the canonical `debug ospf packet hello recv detail`. Updated the matching reference in "Key Takeaways".

3. **Fabricated FRR log message.** The post quoted `ospf_hello: Packet from 192.168.1.2 network address mismatch`, which does not appear in FRR. The real string emitted by `ospfd/ospf_packet.c` is `Packet <ip> [Hello:RECV]: NetworkMask mismatch on <ifname> (configured prefix length is X, but hello packet indicates Y).` Replaced the example log line and updated the `grep` filter from `network address mismatch` to `NetworkMask mismatch` to match the actual log output.

4. **Wrong Cisco show output line.** The post told readers to look for `Subnet Mask: 255.255.255.0` in `show ip ospf interface` output. Cisco IOS does not print such a line; it shows `Internet Address 192.168.1.1/24, Area 0` in CIDR form. Updated the comment accordingly.

5. **Undocumented Cisco debug command.** `debug ip ospf hello` is not a documented standalone subcommand in Cisco's IOS Debug Command Reference (the documented OSPF debug subcommands are `adj`, `events`, `flood`, `lsa-generation`, `packet`, `retransmission`, `spf`, `tree`). Replaced with `debug ip ospf adj`, which is the canonical command for adjacency/Hello-related debugging on Cisco IOS, and updated the matching reference in "Key Takeaways".

6. **Symptoms list cleanup.** Removed the stale "stays in `Init` or `Down`" bullet (which contradicted the corrected intro — Init is also not reached when Hellos are dropped) in favor of a more accurate "neighbor never forms" symptom, and re-anchored the FRR log line to the real FRR string.

## Review Notes
- The "OSPF treats loopbacks as /32 by default" item under Common Causes is correct (Cisco/FRR advertise loopbacks as /32 host routes regardless of the configured mask). It is only loosely related to a Hello-time mask mismatch, since /32 loopbacks are advertised in LSAs rather than checked in Hello — but the entry is technically accurate, so it was left alone.
- The "Special Case: OSPF on Unnumbered Interfaces" section is correct: switching the OSPF network type to `point-to-point` causes the receiver to ignore the Network Mask field per RFC 2328 §10.5 ("On point-to-point networks and on virtual links, the Network Mask in the received Hello Packet should be ignored"). Worth noting in a future revision that this also disables DR/BDR election and changes LSA generation, which has broader implications than just bypassing the mask check.
- The example `no ip address 192.168.1.2/30` / `ip address 192.168.1.2/24` sequence is FRR-valid syntax for replacing an interface address from `vtysh` config mode.
