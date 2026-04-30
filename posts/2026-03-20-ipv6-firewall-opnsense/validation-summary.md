# Validation Summary: How to Configure IPv6 Firewall Rules on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense firewall/router platform
- FreeBSD `pf` packet filter
- IPv6 addressing and routing
- ICMPv6 / Neighbor Discovery Protocol (NDP)
- Path MTU Discovery (PMTUD)
- `pfctl` firewall diagnostics
- pfSense (product comparison only)

## Sources Consulted
- OPNsense Manual — Rules: https://docs.opnsense.org/manual/firewall.html
- OPNsense Manual — Interface configuration: https://docs.opnsense.org/manual/interfaces.html
- OPNsense Manual — IPv6 setup: https://docs.opnsense.org/manual/ipv6.html
- OPNsense Manual — Firewall log files: https://docs.opnsense.org/manual/logging_firewall.html
- OPNsense Manual — Firewall diagnostics: https://docs.opnsense.org/manual/diagnostics_firewall.html
- OPNsense Manual — IPv6 for generic DSL dialup: https://docs.opnsense.org/manual/how-tos/ipv6_dsl.html
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 8201 — Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- FreeBSD `pfctl(8)` man page: https://man.freebsd.org/pfctl
- pfSense Documentation — Configuring Firewall Rules: https://docs.netgate.com/pfsense/en/latest/firewall/configure.html
- pfSense Documentation — Rule Methodology: https://docs.netgate.com/pfsense/en/latest/firewall/rule-methodology.html
- pfSense Documentation — Viewing Firewall States in the GUI: https://docs.netgate.com/pfsense/en/latest/monitoring/status/firewall-states-gui.html
- pfSense Documentation — Viewing the Firewall Log: https://docs.netgate.com/pfsense/en/latest/monitoring/firewall-logs.html

## Issues Found
1. **Incorrect LAN IPv6 tracking guidance.**
   - Before: the LAN example said to select WAN and set a `/48` prefix delegation size on the LAN interface.
   - After: updated the LAN steps to use **Track IPv6 Interface: WAN** and **IPv6 Prefix ID**, which are the actual OPNsense fields for a tracked LAN.
   - Why: In OPNsense, **prefix delegation size** is part of the WAN DHCPv6 configuration. A tracked LAN uses the tracked interface plus a per-LAN prefix ID.

2. **Firewall rule setting mislabeled as stateful behavior.**
   - Before: `Allow options: ✓ (enabled by default - stateful)`
   - After: `State Type: Keep state (default)`
   - Why: In OPNsense, the `Allow options` control is about IP options / IPv6 routing extension headers, not state tracking. Stateful behavior is controlled by the rule's state type.

3. **Several IPv6 examples were syntactically invalid.**
   - Before: examples used non-hexadecimal hextets such as `fd00:mgmt::/48`, `2001:db8:ops::/64`, `2001:db8:monitor::/48`, and `2001:db8:client::1`.
   - After: replaced them with valid documentation or ULA prefixes such as `2001:db8:100::/48`, `2001:db8:200::/48`, and `fd00:1234:5678::/48`.
   - Why: IPv6 hextets must contain hexadecimal digits only. The original examples would not parse as valid IPv6 addresses.

4. **ICMPv6 rule fields and explanation were inaccurate.**
   - Before: the custom rule used `Protocol: ICMP`, `ICMP type`, and implied the relevant ICMPv6 handling was simply visible under Floating rules.
   - After: updated the rule to `Protocol: IPv6-ICMP` with `ICMPv6 type`, and rewrote the explanation to focus on essential ICMPv6 traffic required for NDP and PMTUD.
   - Why: OPNsense exposes a dedicated IPv6 ICMP protocol and `ICMPv6 type` field. RFC 4861, RFC 4890, and RFC 8201 all make clear that IPv6 depends on specific ICMPv6 message types.

5. **Floating-rule example used the wrong term for the example prefix.**
   - Before: the comment described `2001:db8::/32` as a bogon-source example.
   - After: changed it to an explicit example of blocking a specific prefix and kept the description as the IPv6 documentation prefix.
   - Why: `2001:db8::/32` is the RFC 3849 documentation prefix. It is suitable for examples, but calling it a general bogon rule is imprecise.

6. **State-table filtering and example output were misleading.**
   - Before: the post suggested `Protocol: IPv6` as a state filter and showed invalid IPv6 endpoint examples.
   - After: updated the example to filter by interface and search string, and replaced the sample connection endpoints with valid IPv6 addresses.
   - Why: OPNsense's state diagnostics are searched by text/interface criteria, and the previous sample addresses were invalid.

7. **Firewall logging UI path and CLI example were wrong.**
   - Before: the post pointed readers to `Reporting → System Health → Firewall` and used `clog /var/log/filterlog.log`.
   - After: corrected the UI path to **Firewall → Log Files → Live View** and replaced the CLI example with `tail -f /var/log/filter.log`.
   - Why: OPNsense documents firewall logs under **Firewall → Log Files**. The original path and filename did not match current OPNsense documentation.

8. **The OPNsense vs pfSense comparison contained subjective and partially inaccurate entries.**
   - Before: the table included claims like "ICMPv6 auto rules visible in Floating" and "plugin security audit checks" as a product difference.
   - After: replaced the table with objective, documented differences in rule-family field names, diagnostics locations, automatic-rule visibility, and log locations.
   - Why: The revised table stays within what can be verified from current vendor documentation.

9. **Connectivity commands were updated for better current portability.**
   - Before: `ping6` and `traceroute6`
   - After: `ping -6` and `traceroute -6`
   - Why: The `-6` form aligns with current documentation patterns and is more portable across modern Unix-like systems.

## Review Notes
- The WAN inbound HTTPS and SSH examples target **WAN address**, which means traffic to the firewall itself. If the intent is to expose a host behind OPNsense over IPv6, the destination would typically be that host's global IPv6 address rather than the firewall's WAN address, and traditional IPv4-style PAT is usually not involved.
- OPNsense currently documents both the traditional **Firewall → Rules** pages and the newer **Rules [new]** implementation. The post uses the traditional workflow, which is still valid.
- The exact set of automatic rules present in a live OPNsense system depends on enabled features and interface roles. Inspecting the active rules view or the generated ruleset is more reliable than assuming a fixed list from memory.
- Using `2001:db8::/32` in examples is correct because it is reserved for documentation, but it should be treated as an illustrative prefix, not a production blocklist recommendation.
