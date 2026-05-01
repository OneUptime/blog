# Validation Summary: How to Differentiate IPv4 Datagram Service Types

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv4
- DiffServ
- DSCP
- ECN
- Python 3 `socket`
- Linux `tc`
- `tcpdump`

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1349, Type of Service in the Internet Protocol Suite: https://www.rfc-editor.org/rfc/rfc1349.html
- RFC 2474, Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers: https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 3168, The Addition of Explicit Congestion Notification (ECN) to IP: https://www.rfc-editor.org/rfc/rfc3168
- IANA Differentiated Services Field Codepoints registry: https://www.iana.org/assignments/dscp-registry
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Local `ip(7)` manual page for `IP_TOS`
- Local `tc-pedit(8)` manual page
- Local `tcpdump(8)` manual page
- Local `tcpdump --help`, `tc -help`, and `tc filter add u32 help` output

## Issues Found
- The RFC 791 history was inaccurate. The post treated the original ToS octet as having a `C` cost bit, used the wrong bit numbers for precedence, and implied RFC 2474 introduced ECN. I corrected the table and the legacy ToS block to distinguish RFC 791, RFC 1349, RFC 2474, and RFC 3168 accurately.
- The opening explanation called the field "byte 1" of the IPv4 header, which is ambiguous. I corrected this to the second octet of the IPv4 header.
- The Linux `tc` example used `action dsfield set`, which is not a valid `tc` action on the installed toolchain. I replaced it with the documented `action pedit ex munge ip dsfield set ... retain 0xfc` form and simplified the qdisc setup to `clsact`.
- The `tcpdump` filter matched only the exact byte value `0xb8`, which excludes EF-marked packets when ECN bits are non-zero. I changed it to mask the low two bits so it matches the EF DSCP regardless of ECN.
- The Python comment described the DSCP shift in terms of bit numbers that conflicted with the RFC bit numbering used earlier in the post. I changed it to say "upper 6 bits" and clarified the `IP_TOS` comment.

## Review Notes
- The Python socket snippet was exercised locally to confirm that `setsockopt(IP_TOS, 0xB8)` is accepted and reads back the expected value on this Linux environment.
- The `tcpdump` filter was compiled locally with `tcpdump -d` to confirm the expression syntax.
- DSCP markings are hints, not end-to-end guarantees; intervening hosts or networks may ignore, rewrite, or zero them.
