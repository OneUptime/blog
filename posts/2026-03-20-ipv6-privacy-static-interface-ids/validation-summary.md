# Validation Summary: IPv6 Privacy vs Static Interface IDs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SLAAC
- Modified EUI-64 interface identifiers
- RFC 8981 temporary addresses
- RFC 7217 stable privacy addresses
- DHCPv6
- Linux networking (`ip`, `sysctl`)
- `systemd-networkd`

## Sources Consulted
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 — https://www.rfc-editor.org/rfc/rfc8981
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC) — https://www.rfc-editor.org/rfc/rfc7217
- RFC 8064: Recommendation on Stable IPv6 Interface Identifiers — https://www.rfc-editor.org/rfc/rfc8064
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://www.rfc-editor.org/rfc/rfc8415.html
- Linux kernel IP sysctl documentation — https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `systemd.network(5)` — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `networkd.conf(5)` — https://www.freedesktop.org/software/systemd/man/257/networkd.conf.html
- Local command help and man pages: `ip address help`, `ip link help`, `sysctl --help`, `curl --help all`, `man ip-address(8)`, `man ip-link(8)`, `man systemd.network(5)`, `man networkd.conf(5)`

## Issues Found
- The introduction implied that privacy extensions fully replace MAC-derived stable IIDs. I corrected this to reflect current guidance: temporary addresses mitigate tracking for outbound traffic, while RFC 7217 stable addresses avoid exposing the MAC address in the stable address.
- The EUI-64 detection note was too absolute. I changed it to a heuristic because `ff:fe` in the IID is typical for MAC-derived modified EUI-64 from 48-bit MAC addresses, not a universal property of all stable IPv6 addresses.
- The `systemd-networkd` RFC 7217 example used outdated/incorrect configuration syntax (`[IPv6]` with `AddressGenerationMode=stable-privacy`). I replaced it with current SLAAC RA syntax using `[IPv6AcceptRA]` and `Token=prefixstable`.
- The address comparison section labeled the stable companion address as inherently `EUI-64`. I corrected that description to `stable public address` and noted that RFC 7217-based stable addresses are opaque rather than MAC-derived.
- The manual static IPv6 example used an invalid literal (`2001:db8::server1`). I replaced it with a valid IPv6 address.
- The DHCPv6 section incorrectly stated that DUIDs are random and do not expose hardware addresses, and then configured `DUIDType=link-layer`, which explicitly uses the MAC address. I corrected the explanation, added a proper `[Match]` section to the full `systemd-networkd` example, and changed the example to `DUIDType=vendor`, which systemd documents as being derived from hashed machine-id rather than the MAC address.

## Review Notes
- The Linux kernel `use_tempaddr` documentation still describes privacy extensions in terms of RFC 3041/RFC 4941 terminology, but current operational guidance for temporary addresses is RFC 8981. The post’s RFC 8981 framing is appropriate after the corrections.
- Older `systemd-networkd` releases used `IPv6Token=` for SLAAC IID generation; current documentation uses `Token=` in the `[IPv6AcceptRA]` section.
