# Validation Summary: How to Understand the Difference Between RFC 4941 and RFC 8981

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- RFC 4941 IPv6 temporary address privacy extensions
- RFC 8981 IPv6 temporary address extensions
- RFC 7217 stable privacy interface identifiers
- Linux IPv6 sysctl configuration
- Windows IPv6 temporary address configuration
- Apple OS IPv6 privacy behavior
- FreeBSD IPv6 temporary addresses

## Sources Consulted
- RFC 4941: Privacy Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc4941.html
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981.html
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC: https://www.rfc-editor.org/rfc/rfc7217.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel `addrconf.c` source reference for current temporary IID behavior: https://codebrowser.dev/linux/linux/net/ipv6/addrconf.c.html
- Microsoft `Set-NetIPv6Protocol` documentation: https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipv6protocol
- Apple Platform Security, IPv6 security: https://support.apple.com/guide/security/ipv6-security-seccb625dcd9/web
- FreeBSD source commit archive for RFC 8981 temporary IID generation: https://lists.freebsd.org/archives/dev-commits-src-main/2025-June/032996.html
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- RFC 8981 default valid lifetime was incorrectly listed as 7 days. Changed it to 2 days in the comparison table, lifecycle diagram, Linux sysctl notes, OS support notes, and conclusion context.
- RFC 8981 was described as using a SHA-256-based PRNG. Updated this to match RFC 8981: temporary IIDs can be generated from a suitable PRNG or a PRF-based algorithm; HMAC-SHA-256 is one possible PRF, not a mandated PRNG.
- RFC 4941 temporary IID generation was described as seeded by a stable EUI-64 address and a random value. Updated this to the RFC 4941 algorithm: the current interface identifier is combined with a 64-bit history value and hashed with MD5.
- RFC 4941 limitations omitted the key multi-prefix IID reuse problem and overstated same-network protection. Updated the limitations to include multi-prefix IID reuse and clarify that temporary addresses do not prevent tracking through prefixes, DNS names, cookies, or on-link observation.
- The post implied RFC 8981 requires or defines RFC 7217 stable addresses. Updated the wording to clarify that RFC 8981 allows temporary-only operation and RFC 7217 is recommended when stable SLAAC addresses are configured.
- Linux guidance incorrectly tied RFC behavior to kernel 5.7+ and SHA-256. Replaced this with documented sysctl checks for `use_tempaddr`, `temp_prefered_lft`, `temp_valid_lft`, and `addr_gen_mode`.
- The Linux configuration used `addr_gen_mode = 2` without setting `stable_secret`. Changed the example to `addr_gen_mode = 3`, which the Linux documentation defines as stable privacy address generation using a random secret if one is unset.
- The OS support matrix made unsupported precise claims for Linux 5.7+, macOS 12+, Windows 11, and FreeBSD 13+. Replaced it with conservative, source-backed notes about temporary-address support and release-specific RFC 8981 alignment.
- The conclusion overstated that both RFCs prevent tracking and that RFC 8981 is a SHA-256 PRNG improvement. Updated it to say temporary addresses reduce address-based tracking and to mention remaining correlation paths.

## Review Notes
The Linux examples use `eth0` as an example interface name; users may need to substitute their actual interface name. Distribution network managers can also override or manage IPv6 privacy settings outside raw sysctl files.
