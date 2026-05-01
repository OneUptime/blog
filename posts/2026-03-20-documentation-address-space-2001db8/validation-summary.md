# Validation Summary: How to Use the Documentation Address Space (2001:db8::/32 and 3fff::/20)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 3849
- RFC 9637
- Python `ipaddress`
- `ping6`
- OpenSSH client
- `ip6tables`

## Sources Consulted
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 9637: Expanding the IPv6 Documentation Space - https://www.rfc-editor.org/rfc/rfc9637.html
- Python Standard Library `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- Local `ping6 -h` output from iputils
- Local `ip6tables --help` output (`ip6tables v1.8.10 (nf_tables)`)
- Local `ssh -G 2001:db8::1` output from OpenSSH

## Issues Found
- The introduction said the prefixes must never appear in production configurations. I changed this to say they must not be used as production addresses and should be filtered from production traffic, because production filters can legitimately reference these prefixes and RFC 9637 focuses on traffic and routed connectivity.
- The SSH example used `ssh 2001:db8::server`, which was not a valid IPv6 literal example. I changed it to `ssh 2001:db8::1`.
- The Python validator used `ipaddress.IPv6Address()`, which rejects prefixes like `2001:db8:1::/64`. I changed it to use `ipaddress.ip_network(..., strict=False)` so the validator correctly detects both IPv6 addresses and IPv6 prefixes from the documentation ranges.
- The `ip6tables` examples only dropped packets with documentation prefixes as source addresses. I added destination-address rules as well, matching RFC 9637 guidance that packets whose source or destination belongs to the prefix should be dropped over the public Internet.
- The explanation for why RFC 9637 added `3fff::/20` attributed it to hard-coded `2001:db8::/32` checks. I changed it to the RFC's stated rationale: `2001:db8::/32` is too small for many realistic current deployment scenarios, and `/20` better reflects contemporary allocation models for large networks.

## Review Notes
- `ping6` is accepted in the local iputils environment, although current help output documents the generic `ping` command with the `-6` flag.
