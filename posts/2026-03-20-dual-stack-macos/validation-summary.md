# Validation Summary: How to Configure Dual-Stack on macOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS networking
- IPv4
- IPv6
- Dual-stack networking
- `networksetup`
- `ifconfig`
- `scutil`
- `dns-sd`
- `ping` / `ping6`
- `netstat`
- `curl`
- `pf`
- Wireless Diagnostics

## Sources Consulted
- Apple Support: Change TCP/IP settings on Mac — https://support.apple.com/guide/mac-help/mh14129/mac
- Apple Support: Enter TCP/IP settings on Mac — https://support.apple.com/guide/mac-help/mh141292/mac
- Apple Support: Use IPv6 on Mac — https://support.apple.com/guide/mac-help/mchlp2499/mac
- Apple Support: Change DNS settings on Mac — https://support.apple.com/guide/mac-help/mh14127/mac
- Apple Support: About networksetup in Remote Desktop — https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- Apple Support: IPv6 security — https://support.apple.com/guide/security/ipv6-security-seccb625dcd9/web
- Apple Developer: Recording a Packet Trace — https://developer.apple.com/documentation/network/recording-a-packet-trace
- Apple Developer: Recording a Wi-Fi Packet Trace — https://developer.apple.com/documentation/network/recording-a-wi-fi-packet-trace
- Apple OSS Distributions: `configd` (`scutil`) — https://github.com/apple-oss-distributions/configd
- Apple OSS Distributions: `network_cmds` (`ping`, `ping6`, `ifconfig`) — https://github.com/apple-oss-distributions/network_cmds
- Apple OSS Distributions: `mDNSResponder` (`dns-sd`) — https://github.com/apple-oss-distributions/mDNSResponder
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://www.rfc-editor.org/rfc/rfc4862
- RFC 4941: Privacy Extensions for Stateless Address Autoconfiguration in IPv6 — https://www.rfc-editor.org/rfc/rfc4941
- RFC 6724: Default Address Selection for IPv6 — https://www.rfc-editor.org/rfc/rfc6724

## Issues Found
- The post used `ping -4 8.8.8.8`, but Apple’s `ping` usage does not support a `-4` selector on macOS. I changed it to `ping 8.8.8.8`, which is the correct IPv4 test on macOS.
- The `scutil --dns` explanation overstated what the command does. Apple’s `scutil` documentation says `--dns` reports DNS configuration; it does not directly show the exact destination address choice for a connection. I rewrote the explanation and tightened the RFC 6724 claim to say IPv6 generally has higher precedence when both families are available and usable.
- The privacy-extensions section suggested `networksetup -getv6automatic "Wi-Fi"` as a way to check privacy-extension status. That is not an appropriate check for RFC 4941 temporary-address use. I removed that line and left the `ifconfig`-based verification, which matches Apple’s documented behavior and the `ifconfig` source output for `temporary` addresses.
- The GUI section placed DNS under the TCP/IP path. On current Apple documentation, DNS is configured under `Details → DNS`, not `Details → TCP/IP`. I corrected the path and removed the misleading “tab” wording for IPv4/IPv6.
- The Wireless Diagnostics troubleshooting note was too specific and inaccurate for current macOS UI. Apple documents Wi-Fi captures via Wireless Diagnostics `Window > Sniffer`, selecting channel and width rather than “capture on en0.” I corrected the instruction to match Apple’s packet-trace documentation.
- The PMTUD example used `ping6 -s 1400`, which does not meaningfully probe a standard 1500-byte MTU path. I changed it to `ping6 -D -s 1452`, which uses an unfragmented IPv6 probe aligned with a 1500-byte path-MTU check.

## Review Notes
- Apple’s user-facing support pages confirm the Ventura/Sonoma System Settings paths and default IPv6 behavior, but they do not publish a complete online `networksetup` command reference. The reviewed `networksetup` examples that remain in the post were cross-checked against Apple support material where available and against the post’s surrounding macOS behavior.
- The statement that macOS “supports dual-stack out of the box” is accurate for normal dynamic network configurations, but real-world enterprise networks may also use DHCPv6 for supplementary IPv6 configuration in addition to SLAAC.
