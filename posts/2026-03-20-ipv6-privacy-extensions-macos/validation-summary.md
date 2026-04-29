# Validation Summary: How to Configure IPv6 Privacy Extensions on macOS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS networking
- IPv6
- SLAAC
- IPv6 privacy extensions
- `ifconfig`
- `networksetup`
- `curl`
- VPN tunnel interfaces on macOS

## Sources Consulted
- Apple Support: Change TCP/IP settings on Mac — https://support.apple.com/guide/mac-help/mh14129/mac
- Apple Support: About `networksetup` in Remote Desktop — https://support.apple.com/guide/remote-desktop/apdd0c5a2d5/mac
- Apple Xcode man page mirror: `NETWORKSETUP(8)` — https://keith.github.io/xcode-man-pages/networksetup.8.html
- Apple Xcode man page mirror: `SCUTIL(8)` — https://keith.github.io/xcode-man-pages/scutil.8.html
- Apple Xcode man page mirror: `NETSTAT(1)` — https://keith.github.io/xcode-man-pages/netstat.1.html
- Apple official source: `ifconfig` IPv6 flag display — https://github.com/apple-oss-distributions/network_cmds/blob/main/ifconfig.tproj/af_inet6.c
- Apple official source: IPv6 interface flag definitions — https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6_var.h
- Apple official source: IPv6 temporary-address defaults — https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6.h
- Apple official source: IPv6 temporary-address creation and preference logic — https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6.c
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://datatracker.ietf.org/doc/html/rfc4862
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC — https://datatracker.ietf.org/doc/html/rfc7217
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 — https://datatracker.ietf.org/doc/html/rfc8981

## Issues Found
- The opening claim that macOS has supported privacy extensions since OS X 10.7 Lion was removed. I did not find Apple documentation in the reviewed sources that directly supported that specific historical version claim, so I replaced it with a current, source-supported description.
- The example `secured` address originally contained an `ff:fe` EUI-64 pattern, which contradicted the surrounding explanation. I replaced it with a non-EUI-64 example.
- The post equated the `secured` flag with an RFC 7217 stable privacy address and claimed it was used for inbound connections. Apple source only describes `IN6_IFF_SECURED` as `cryptographically generated`; it does not document that flag as an RFC 7217 marker in the reviewed Apple docs. I rewrote those passages to match the source-supported wording.
- The `networksetup -getv6transporttype "Wi-Fi"` command is not present in the current `NETWORKSETUP(8)` documentation I checked. I replaced it with `networksetup -getinfo "Wi-Fi"`.
- The `scutil --nwi` command was removed from the post because the current `SCUTIL(8)` documentation reviewed for this validation does not document that option. I replaced that step with a supported `ifconfig` check.
- The comment that `netstat -rn -f inet6` shows which source IP is preferred for outbound traffic was incorrect. `NETSTAT(1)` documents it as a routing-table view, so I changed the description accordingly.
- The `curl -6 -v ... | grep "Connected to"` step did not reliably validate the local source IPv6 address. I replaced it with a direct comparison between the public IPv6 shown by `curl -6` and the local temporary address from `ifconfig`.
- The temporary-address rotation section was too absolute about forcing a new address and about reconnect behavior. Apple source shows current default preferred and valid lifetimes, but reconnects do not guarantee immediate regeneration on every attempt. I softened that wording.
- The VPN section assumed fixed mappings like `utun0` for OpenVPN and `utun1` for WireGuard. On macOS, `utunN` numbering varies by client and connection, so I rewrote that section to describe the interface naming more accurately.
- The section titled “Disabling IPv6 Privacy Extensions” was misleading because the documented commands disable IPv6 entirely or switch to manual addressing; they do not expose a supported toggle for privacy extensions only. I renamed the section and clarified the behavior.
- The manual IPv6 example used `2001:db8::mac1`, which is not a valid IPv6 literal. I corrected it to a syntactically valid example address.

## Review Notes
- Apple’s public support docs document IPv6 modes such as `Automatically`, `Manually`, and `Link-local only`, but they do not give detailed end-user documentation for the `secured` flag shown by `ifconfig`; that interpretation comes from Apple source.
- The guide still uses `en0` as the working example interface, but it now notes that readers should replace it with their active interface if needed.
