# Validation Summary: How to Understand the IPv4 Precedence Field

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP Precedence / ToS
- DiffServ / DSCP
- ECN
- Python `socket`
- Linux `iptables`

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1349, "Type of Service in the Internet Protocol Suite": https://www.rfc-editor.org/rfc/rfc1349.html
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers": https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 3168, "The Addition of Explicit Congestion Notification (ECN) to IP": https://www.rfc-editor.org/rfc/rfc3168
- RFC 4594, "Configuration Guidelines for DiffServ Service Classes": https://www.rfc-editor.org/rfc/rfc4594.html
- Python `socket` documentation (`setsockopt`): https://docs.python.org/3/library/socket.html
- `iptables-extensions(8)` DSCP target documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help: `iptables -j DSCP -h` on iptables v1.8.10

## Issues Found
- The RFC 791 layout was incorrect. The post showed a `Minimize Cost` bit in the original IPv4 ToS byte, but RFC 791 defines bits 6 and 7 as reserved; `Minimize Monetary Cost` was introduced later by RFC 1349. I corrected the bit layout and added the RFC 1349 note.
- The precedence naming was partially inaccurate. Precedence value 5 was labeled `Critical`, but RFC 791 names it `CRITIC/ECP`. I corrected the name in both the precedence table and the Class Selector compatibility table, and updated the Python comment to match the corrected terminology.
- Several "Typical Use" examples were too specific and could mislead readers into treating informal usage patterns as RFC-defined mappings. I replaced them with broader descriptions that stay consistent with the RFC terminology.
- The modern QoS guidance overstated CS7 usage. RFC 4594 says CS6 SHOULD be used for routing/control traffic and CS7 SHOULD be reserved for future use. I corrected the DSCP explanation and the closing takeaway accordingly, and noted that the final two bits are used for ECN under RFC 3168.

## Review Notes
- The Python example is syntactically correct. I also validated the `IP_TOS` call locally: setting `DSCP_CS5 << 2` produced `0xA0`, and `getsockopt(IPPROTO_IP, IP_TOS)` returned `160`.
- The `iptables` example is current and valid. The DSCP target is supported in the `mangle` table, and `-p 89` is acceptable because `iptables` allows protocol selection by number or name.
- DSCP markings may still be rewritten, ignored, or policed by intermediate networks, so on-the-wire behavior depends on the surrounding network policy.
