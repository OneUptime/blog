# Validation Summary: How to Understand DHCPv6 Guard

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- DHCPv6 (RFC 8415)
- DHCPv6 Guard / DHCPv6-Shield (RFC 7610)
- IPv6 Neighbor Discovery / Router Advertisements (RFC 4861)
- RA Guard (RFC 6105)
- IPv6 Source Guard
- ip6tables (Linux netfilter)

## Sources Consulted
- IANA DHCPv6 Parameters registry — message type assignments: https://www.iana.org/assignments/dhcpv6-parameters/dhcpv6-parameters.xhtml
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- RFC 7610 — DHCPv6-Shield: Protecting Against Rogue DHCPv6 Servers: https://www.rfc-editor.org/rfc/rfc7610
- RFC 6105 — IPv6 Router Advertisement Guard: https://www.rfc-editor.org/rfc/rfc6105
- ip6tables / netfilter documentation for `-m mac --mac-source` and UDP port matching

## Issues Found
The DHCPv6 message type numbers in the post were incorrect for several types. Per IANA / RFC 8415, the correct numbering is:
- 5 = RENEW (post said REPLY)
- 6 = REBIND (post said RENEW)
- 7 = REPLY (post said REBIND)
- 8 = RELEASE (post said RECONFIGURE)
- 9 = DECLINE (post said RELEASE)
- 10 = RECONFIGURE (post said DECLINE)

Fixes applied to `README.md`:
1. "DHCPv6 Message Types Affected" table corrected so each name maps to its correct type number.
2. Summary line "DHCPv6 Guard drops Types 2, 5, 8" changed to "Types 2, 7, 10" (ADVERTISE, REPLY, RECONFIGURE — the actual server-to-client messages DHCPv6 Guard / DHCPv6-Shield blocks per RFC 7610).
3. Relay Agent section: "block Types 2, 5, 8" and "allows Types 2, 5, 8, 12, 13" updated to "Types 2, 7, 10" / "Types 2, 7, 10, 12, 13".
4. iptables comment "(Types 2=ADVERTISE, 5=REPLY, 8=RECONFIGURE)" corrected to "(Types 2=ADVERTISE, 7=REPLY, 10=RECONFIGURE)".

Other technical claims verified as correct:
- DHCPv6 UDP ports: 546 (client) and 547 (server). Correct.
- Server-to-client messages blocked by DHCPv6 Guard: ADVERTISE, REPLY, RECONFIGURE. Correct (matches RFC 7610 §3).
- RELAY-FORW = 12, RELAY-REPL = 13. Correct.
- M and O bits in Router Advertisement (M=managed address config, O=other config). Correct interpretation.
- ip6tables syntax (`-A`, `-p udp`, `--dport`, `-m mac --mac-source`, `-j ACCEPT/DROP`). Valid.

## Review Notes
- The phrasing "RA provides prefix + addresses" under the M=0/O=1 case is a slight simplification: RAs provide the prefix and the host derives addresses via SLAAC; RAs do not directly "provide" addresses. The meaning is clear in context, so left unchanged.
- The host-level ip6tables approximation matches a legitimate server by source MAC. In practice the visible source MAC for DHCPv6 server replies will be the upstream router/relay's MAC when the server is off-link, which the post implicitly acknowledges by calling this an "approximation" and recommending switch-level DHCPv6 Guard. Acceptable as written.
- DHCPv6-Shield (RFC 7610) is the IETF name for what most vendors market as "DHCPv6 Guard"; the post uses the vendor terminology consistently, which is fine for an operator-focused guide.
