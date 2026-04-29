# Validation Summary: How to Understand Mobile IPv6 Protocol Overview

## Status
validated

## Post Type
Tutorial / Protocol overview guide

## Technologies Covered
- Mobile IPv6 (MIPv6) protocol (RFC 6275)
- IPv6 Mobility Header (Next Header value 135)
- UMIP / MIPL2 (`mip6d`) Linux user-space daemon
- IPsec for Mobile Node ↔ Home Agent authentication (RFC 4877)
- Mermaid diagrams (graph TB, sequenceDiagram)

## Sources Consulted
- [RFC 6275 - Mobility Support in IPv6](https://datatracker.ietf.org/doc/html/rfc6275)
- [RFC 3775 - Mobility Support in IPv6 (obsoleted)](https://datatracker.ietf.org/doc/html/rfc3775)
- [RFC 4877 - Mobile IPv6 Operation with IKEv2 and the Revised IPsec Architecture](https://datatracker.ietf.org/doc/html/rfc4877)
- [mip6d.conf(5) man page (systutorials mirror)](https://www.systutorials.com/docs/linux/man/5-mip6d.conf/)
- [mip6d(1) man page (CentOS / unix.com mirror)](https://www.unix.com/man_page/centos/1/mip6d/)
- [UMIP project documentation](http://www.umip.org/)
- IANA Protocol Numbers registry (Next Header 135 = Mobility, 59 = No Next Header)

## Issues Found
1. **Invalid `mip6d.conf` keywords (`HomeAgent`, `Home`).** The original config used bare top-level keywords `HomeAgent 2001:db8:home::1;` and `Home 2001:db8:home::100/64;`, neither of which exists in the `mip6d.conf(5)` grammar. Per the man page, the Mobile Node's home link is configured inside an `MnHomeLink "iface" { ... }` block with the directives `HomeAgentAddress` and `HomeAddress`. Replaced the two stray lines with a correct `MnHomeLink "eth0" { HomeAgentAddress ...; HomeAddress ...; }` block so the example actually parses.
2. **Non-existent `mip6d -n` flag.** The post recommended `sudo mip6d -n` to "check binding status." `mip6d(1)` does not define a `-n` option — the documented flags are `-V/--version`, `-h/-?/--help`, `-c <file>`, `-d <number>`, `-C/--correspondent-node`, `-H/--home-agent`, `-M/--mobile-node`. The actual UMIP mechanism for inspecting the binding cache is the daemon's built-in virtual terminal on TCP port 7777, where the operator command `bc` prints binding cache entries. Replaced the incorrect command with `telnet localhost 7777` and a comment describing the `bc` command at the prompt.

## Review Notes
- The Mermaid diagrams render correctly and use valid syntax for both `graph TB` and `sequenceDiagram`.
- All RFC references are correct: RFC 6275 (current MIPv6 spec), RFC 3775 (obsoleted predecessor), RFC 4877 (MIPv6 + IKEv2/IPsec).
- Mobility Header facts are accurate: Next Header = 135, Payload Proto = 59 when no upper-layer header follows, MH Type 5 = Binding Update.
- Terminology table (MN/HA/CN/HoA/CoA/BU/BA) is consistent with RFC 6275 §1.7.
- Caveat for readers: UMIP / `mip6d` is largely unmaintained upstream; current Debian/Ubuntu releases no longer ship the `mip6d` package, and the kernel-side MIPv6 support has had limited testing in modern kernels. The tutorial commands target the legacy package and may need backports or out-of-tree builds on modern distributions. This is a scope/aging concern rather than a factual error in the post.
- The `2001:db8:home::/64` and `2001:db8:foreign::/64` notation is illustrative — `home` and `foreign` are not valid hex, so these are clearly placeholder/documentation strings rather than real prefixes. This is a common stylistic choice in tutorials and was left as-is since the surrounding text frames them as examples.
