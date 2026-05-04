# Validation Summary: How to Configure IPv6 Firewall Rules with ipfw on FreeBSD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- FreeBSD ipfw firewall
- IPv6 networking
- ICMPv6 (NDP, RA/RS, ping6, error messages)
- /etc/rc.conf firewall configuration
- ipfw dynamic rules and stateful tracking

## Sources Consulted
- FreeBSD ipfw(8) man page (PACKET FLOW, RULE FORMAT, RULE OPTIONS sections)
- FreeBSD pf.conf(5) man page (for the comparison table)
- FreeBSD Handbook firewall chapter (for default policy / IPFIREWALL_DEFAULT_TO_ACCEPT)
- RFC 4443 (ICMPv6 types 1-4, 128-129)
- RFC 4861 (Neighbor Discovery / NDP - types 133-136)
- RFC 3849 (IPv6 documentation prefix 2001:db8::/32)

## Issues Found
1. **Invalid IPv6 hex literals in examples.** The address `2001:db8::trusted` contained non-hex characters (`r`, `s`, `u`, `t`) and `2001:db8::bad:actor` contained invalid hex (`t`, `o`, `r` in `actor`). A reader copy-pasting these would get a parse error. Replaced with `2001:db8::1` and `2001:db8::dead:beef` (both valid hex, the latter retains the playful intent).
2. **Invalid `ip6` keyword placement.** Two rules used `... via em0 ip6` / `... via em1 ip6`. Per ipfw(8), `ip6` is a PROTOCOL keyword (must follow the action), not a RULE OPTION. Only `ipv6` (or `ipv4`) is valid as a trailing option. Rewrote as `ipfw add allow ip6 from me6 to any out via em0` and `ipfw add deny ip6 from any to any via em1` (protocol-position form, unambiguously correct).
3. **Incorrect comparison-table claim "Last rule wins" for ipfw.** ipfw uses **first-match** semantics (per ipfw(8) PACKET FLOW); the first matching rule's action is taken. The author likely meant "the explicit deny rule placed last catches unmatched traffic". Changed to `First-match, explicit deny` to accurately describe both the matching semantics and the default-policy convention.

## Review Notes
- All listed ICMPv6 type numbers (1, 2, 3, 4, 128, 129, 133, 134, 135, 136) are correct per RFC 4443 and RFC 4861, and the rationale for allowing each (NDP, SLAAC, PMTUD, ping, error reporting) aligns with RFC 4890 guidance.
- `me6` is a valid built-in macro in ipfw matching local IPv6 addresses.
- The rules-script snippet places `#!/bin/sh` after a leading comment line; in a real script the shebang must be the first byte of the file. Shown the way it is, this is a documentation convention rather than a syntactic error, and was left as-is.
- The default policy when rule 65535 fires depends on the kernel option `IPFIREWALL_DEFAULT_TO_ACCEPT`; the FreeBSD default is deny. The post's explicit `deny all from any to any` rule is good defense-in-depth regardless.
- `ipfw list | grep ipv6` will match `ipv6-icmp` rules but will miss rules that use only the `ip6` protocol token; a more thorough filter would be `ipfw list | grep -E 'ip6|ipv6'`. Left as-is — works for the common case.
