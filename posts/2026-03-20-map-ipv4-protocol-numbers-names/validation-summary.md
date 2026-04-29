# Validation Summary: How to Map IPv4 Protocol Numbers to Protocol Names

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv4
- IANA protocol number registry
- `/etc/protocols`
- Python `socket` module
- `iptables`

## Sources Consulted
- IANA Assigned Internet Protocol Numbers: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `protocols(5)` manual page: https://man7.org/linux/man-pages/man5/protocols.5.html
- Linux `iptables(8)` manual page: https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
- The post said Python provides `socket.getprotobynumber()`, but current Python standard library documentation does not document that API and the local Python 3.12.3 runtime does not expose it. I changed the section to the documented `socket.getprotobyname()` API and clarified that reverse lookup from number to name should use `/etc/protocols`.
- The protocol table listed protocol number `4` as `IP`, which is incorrect for the IANA protocol-number registry entry. I corrected it to `IPv4` with the protocol description `IPv4 encapsulation`.
- The protocol table entry for `0` used `IPv6 Hop-by-Hop Options`; the IANA registry entry is `IPv6 Hop-by-Hop Option`. I corrected the label to match the authoritative registry.
- The numeric `/etc/protocols` lookup used a tab-specific `grep` pattern. Since `protocols(5)` defines the file as whitespace-delimited, I replaced it with `awk '$2 == 89' /etc/protocols`, which works regardless of spaces vs. tabs.
- The IANA reference was written as a bare domain path and the post did not explain why IPv6-specific names appear in an IPv4-oriented article. I replaced it with the full registry URL and added a brief clarification that the registry is shared with IPv6 Next Header values.

## Review Notes
- The `iptables` examples are technically correct for Linux and rely on protocol names from `/etc/protocols`; they are not portable to non-Linux firewall tools.
- `/etc/protocols` is useful for local lookups, but its exact names and aliases can vary slightly by platform or distribution even when the IANA-assigned numbers are the same.
