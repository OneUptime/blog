# Validation Summary: How to Configure DHCPv6 Server on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OPNsense (firewall/router OS based on FreeBSD)
- Kea DHCPv6 server
- ISC DHCPv6 server (legacy reference)
- IPv6 (DHCPv6, SLAAC, ICMPv6, NDP)
- Router Advertisements (radvd)
- Unbound DNS (AAAA host overrides)
- OPNsense firewall rules
- OPNsense diagnostics tools (NDP Table, Ping, Packet Capture)

## Sources Consulted
- [OPNsense DHCP overview](https://docs.opnsense.org/manual/dhcp.html)
- [OPNsense KEA DHCP manual](https://docs.opnsense.org/manual/kea.html)
- [OPNsense IPv6 setup manual](https://docs.opnsense.org/manual/ipv6.html)
- [OPNsense Router Advertisements manual](https://docs.opnsense.org/manual/radvd.html)
- [OPNsense Interface Diagnostics manual](https://docs.opnsense.org/manual/diagnostics_interfaces.html)
- [OPNsense Neighbors manual](https://docs.opnsense.org/manual/neighbors.html)
- [OPNsense 25.1 "Ultimate Unicorn" release notes](https://docs.opnsense.org/releases/CE_25.1.html)

## Issues Found
1. **Incorrect version prerequisite.** The post listed "OPNsense 23.x or later" but the entire post is framed around the **Kea** DHCPv6 server, which was first introduced in OPNsense **25.1 "Ultimate Unicorn"**. Earlier releases shipped only the (now end-of-life) ISC DHCPv6 server. Updated the prerequisite to "OPNsense 25.1 or later" with a note that the legacy ISC DHCPv6 server can be used on older releases.
2. **Wrong menu path for the DHCPv6 server.** The post used `Services → DHCPv6 → [LAN]`, which is the legacy ISC path. The correct Kea path per the OPNsense KEA manual is **Services → Kea DHCP → DHCPv6**. Also fixed the "Quick Start" navigation list to point at `Services → Kea DHCP → DHCPv6` (with a parenthetical note about the legacy ISC location).
3. **Kea DHCPv6 settings did not match the actual UI.** The original snippet listed flat fields ("Range from", "Range to", "DNS Servers"). Kea's UI is tab-based (Settings, Subnets, PD Pools, Reservations, Options). Restructured the snippet to reflect the real flow: enable on the Settings tab, define a subnet plus a pool on the Subnets tab, and configure DNS servers via the Options tab.
4. **ARP Table described as showing IPv6 NDP entries.** This is incorrect — IPv4 entries live in the ARP Table and IPv6 neighbor discovery entries live in a separate **NDP Table** (`Interfaces → Diagnostics → NDP Table`). Updated the diagnostics snippet accordingly.

## Review Notes
- The Router Advertisements section is correct: `Services → Router Advertisements` continues to be the configuration location even when Kea DHCPv6 is in use, and the "Unmanaged / Assisted / Managed" mode names match the OPNsense UI.
- Firewall rules guidance (allowing ICMPv6) is accurate and important — RFC 4890 documents the ICMPv6 messages that must be permitted for IPv6 to function.
- The example uses documentation prefixes (`2001:db8::/32`, RFC 3849) and Google Public DNS IPv6 addresses (`2001:4860:4860::8888` / `::8844`), which are correct.
- The `nginx` code-fence language identifier on the "WAN - Static IPv6" block is just a syntax-highlighting hint and harmless; left as-is to avoid stylistic changes.
- For prefix delegation to work with the LAN "Track Interface" mode, the upstream must actually delegate a prefix; if only a /64 (no PD) is delegated, Track Interface will not assign LAN addresses. This is implicit in the post's framing but could be called out more explicitly in a future revision.
