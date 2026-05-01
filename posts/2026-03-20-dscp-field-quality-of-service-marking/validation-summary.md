# Validation Summary: How to Use the DSCP Field for Quality of Service Marking

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 DSCP / DiffServ
- Linux `tc` with HTB and `u32` filters
- Python `socket` API
- `iptables` DSCP target
- `tcpdump`
- TShark / Wireshark

## Sources Consulted
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" — https://datatracker.ietf.org/doc/rfc2474/
- RFC 2597, "Assured Forwarding PHB Group" — https://datatracker.ietf.org/doc/html/rfc2597
- RFC 3246, "An Expedited Forwarding PHB (Per-Hop Behavior)" — https://datatracker.ietf.org/doc/rfc3246/
- RFC 3168, "The Addition of Explicit Congestion Notification (ECN) to IP" — https://datatracker.ietf.org/doc/rfc3168/
- Linux `ip(7)` man page — https://www.man7.org/linux/man-pages/man7/ip.7.html
- Linux `tc-u32(8)` man page — https://man7.org/linux/man-pages/man8/tc-u32.8.html
- Linux `tc-htb(8)` man page — https://man7.org/linux/man-pages/man8/HTB.8.html
- Linux `iptables-extensions(8)` man page — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Python `socket` module documentation — https://docs.python.org/3/library/socket.html
- `tcpdump(8)` man page — https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Wireshark `tshark(1)` man page — https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference for IPv4 — https://www.wireshark.org/docs/dfref/i/ip.html

## Issues Found
- The post described DSCP as if it simply "replaced" the old IPv4 Precedence and ToS flags. I corrected this to reflect RFC 2474 more accurately: the IPv4 ToS octet was redefined as the DS field, while IP Precedence compatibility was preserved through class-selector codepoints.
- The DSCP value table labeled the octet values as fixed `ToS Byte` values. I updated the column to `DS Field (ECN=00)` because RFC 3168 assigns the low two bits to ECN, so the full octet changes when ECN is non-zero.
- The `tcpdump` verification comment said it would show the DSCP value directly. I corrected the wording to say it shows the DS field / ToS byte, which is what `tcpdump -v` prints.
- I updated the description and takeaway wording to use current DS field terminology while preserving the article's original style.

## Review Notes
- No code or command changes were required; the `tc`, Python `socket`, `iptables`, `tcpdump`, and TShark examples are technically valid as written.
- `tshark` was not installed in the local environment, so its field name and option usage were validated against the official Wireshark man page and display-filter reference rather than by local execution.
- Local `iptables -j DSCP --help` output on this system confirms both `--set-dscp` and `--set-dscp-class` are supported with the nftables-backed `iptables` frontend.
