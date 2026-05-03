# Validation Summary: How to Debug IPv6 Routing Issues with traceroute6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `traceroute6` / `traceroute -6` (Dmitry Butskoy's traceroute package, the standard on modern Linux distros)
- `mtr` (My Traceroute)
- IPv6 networking (ICMPv6, UDP, TCP probes)

## Sources Consulted
- traceroute(8) man page (man7.org / Dmitry Butskoy's traceroute, the package shipped on most modern Linux distros)
- mtr(8) man page (Arch Linux / upstream BitWizard mtr)
- Verified Google IPv6 prefixes (2607:f8b0::/32) and Google Public DNS IPv6 (2001:4860:4860::8888)

## Issues Found

1. **Incorrect description of `-U` flag.** The original comment said `-U` means "Use UDP instead of ICMPv6 (default is UDP on Linux)" — this conflates two things. The default on Linux already IS UDP (with destination ports incrementing from 33434), so there is no ICMPv6 to switch away from. What `-U` actually does is switch to UDP datagrams with a *constant* destination port (default 53). Updated the comment to describe this accurately, and added a separate `-I` example for those who do want ICMPv6 ECHO probes.

2. **Wrong claim that `-q 1 -N 1` sets probe packet size.** Verified against the man page:
   - `-q nqueries` sets the number of probe packets per hop (default 3)
   - `-N squeries` sets the number of probes sent simultaneously (default 16)
   - Probe packet size is set via the optional `packet_len` *positional* argument after the host (e.g., `traceroute6 host 1280`).
   Replaced the misleading comment with an accurate description of `-q` / `-N` behavior, and added a separate example demonstrating the correct way to set probe packet size.

## Review Notes
- The statement "Hop 1 is always your default gateway" is generally true for off-link destinations, but not universal — for an on-link destination, hop 1 is the destination itself. This is a minor simplification rather than a technical error and was left as written.
- The post implicitly assumes the Dmitry Butskoy traceroute package (the de-facto standard on Debian/Ubuntu/Fedora). The legacy inetutils `traceroute6` does not support `-T`, `-N`, or `-I`, but specifying which package is in use would be a stylistic addition outside the scope of this review.
- All IPv6 addresses used (Google DNS 2001:4860:4860::8888, Google's 2607:f8b0::/32 prefix, link-local fe80::1, and 2001:db8:: documentation prefix per RFC 3849) are correct.
- All `mtr` flags (`-6`, `-n`, `-r`, `-c`) verified against the upstream man page.
