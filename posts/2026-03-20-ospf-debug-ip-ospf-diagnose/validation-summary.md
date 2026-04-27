# Validation Summary: How to Use debug ip ospf to Diagnose OSPF Problems

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OSPF (OSPFv2)
- FRRouting (FRR) / vtysh
- Cisco IOS
- Linux syslog / journalctl

## Sources Consulted
- [FRRouting OSPFv2 documentation](https://docs.frrouting.org/en/latest/ospfd.html) — for the canonical `debug ospf ...` command syntax (packet types, lsa subtypes, event/nsm/ism/zebra/etc.)
- [FRR ospfd source on GitHub](https://github.com/FRRouting/frr/blob/master/ospfd/ospf_packet.c) — confirmed packet-type tokens (hello/dd/ls-request/ls-update/ls-ack/all)
- [Cisco IOS Debug Command Reference (i2)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i2.html) — for `debug ip ospf ...` variants
- [Cisco OSPF Command and Configuration Handbook — Chapter 21 debug Commands](https://www.oreilly.com/library/view/cisco-ospf-command/1587050714/ch21.html) — confirmed the canonical IOS OSPF debug verbs: adj, events, flood, lsa-generation, packet, retransmission, spf
- [Cisco — Troubleshoot OSPF Neighbor Problems](https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13699-29.html) — confirmed `debug ip ospf hello` exists and what its output looks like

## Issues Found

1. **FRR: `debug ospf hello` is not a valid standalone command.** The canonical FRR syntax is `debug ospf packet (hello|dd|ls-request|ls-update|ls-ack|all) (send|recv) [detail]`. Replaced occurrences in the FRR vtysh code block, the FRR debug-options table, the Problem 1 example, and the Key Takeaways with `debug ospf packet hello recv [detail]`.

2. **FRR: `debug ospf packet lsa` is not valid.** `lsa` is not a packet type — the OSPF packet types are hello / dd / ls-request / ls-update / ls-ack / all. The correct command for LSA flooding events is `debug ospf lsa flooding`. Updated the table accordingly and added `debug ospf lsa generate` for self-originated LSAs (which fits the table's intent).

3. **FRR: `debug ospf spf` does not exist.** FRR has no standalone SPF debug verb; SPF scheduling and recalculation events are emitted under `debug ospf event`. Replaced the table row and the Problem 3 example to use `debug ospf event` with an updated description.

4. **Cisco IOS: `debug ip ospf database` is not a valid command.** Cisco's OSPF debug verbs are adj, events, flood, lsa-generation, packet, retransmission, spf (per the OSPF Command Handbook). For LSDB/database flooding visibility the correct command is `debug ip ospf flood`. Replaced.

5. **Cisco IOS: `debug ip ospf hello detail` — `detail` is not a keyword for the `hello` debug.** The `detail` keyword belongs to `debug ip ospf packet`. Replaced with `debug ip ospf packet detail` and updated the inline comment so it reflects what that command actually does (per-packet field decode), since the prior comment ("filter to a specific neighbor") was also misleading — Cisco IOS scopes per-neighbor debugging via conditional debug (`debug condition`), not via a `detail` keyword.

## Review Notes

- The FRR documentation lists the packet direction as `(send|recv)`. The previous example `debug ospf packet hello recv detail` is correct; I kept this form.
- The article uses the `vtysh -c "..."` shell invocation form, which is fine, but FRR's debug commands are normally entered in enable/configure mode inside vtysh — both forms work.
- `debug ospf nsm` accepts optional sub-keywords (`status|events|timers`) in modern FRR; the bare form is still accepted and matches the post's intent, so no change.
- The Cisco `logging buffered 1048576 debugging` example uses bytes (~1 MB) and the `debugging` severity level — both are valid IOS syntax.
- `journalctl -u frr` works on systemd-managed FRR installs (the standard distro packaging today). Older sysvinit setups would not have a `frr.service` unit, but this is a niche case and not worth caveating in the post.
