# Validation Summary: Understanding DHCPv6 DUID (DHCP Unique Identifier)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- DUID
- IAID
- Linux networking
- `systemd-networkd`
- ISC DHCP (`dhclient`, `dhcpd`)
- Kea DHCPv6
- Windows networking

## Sources Consulted
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 6355, Definition of the UUID-Based DHCPv6 Unique Identifier (DUID-UUID): https://www.rfc-editor.org/rfc/rfc6355.html
- `networkd.conf` man page: https://www.freedesktop.org/software/systemd/man/networkd.conf.html
- `systemd.network` man page: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- ISC DHCP `dhclient` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP `dhcp-options` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP `dhcpd.conf` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Kea Administrator Reference Manual, DHCPv6 server: https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- Microsoft `ipconfig` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Microsoft `Add-DhcpServerv6Reservation` documentation: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv6reservation?view=windowsserver2025-ps
- Microsoft `IP_ADAPTER_ADDRESSES_LH` documentation: https://learn.microsoft.com/en-us/windows/win32/api/iptypes/ns-iptypes-ip_adapter_addresses_lh

## Issues Found
- The opening explanation described DUID as the DHCPv6 equivalent of a MAC address and implied it always persists across interface changes. RFC 9915 defines DUID as the DHCPv6 identity token and requires implementations to treat it as an opaque value. I rewrote the introduction to describe DUID accurately without overstating the MAC-address comparison.
- The DUID-LL description said it is used when stable time is unavailable. RFC 9915 instead defines DUID-LL around a permanently attached link-layer address. I corrected that explanation.
- The DUID-UUID description said it is common on UEFI systems. RFC 9915 and RFC 6355 anchor this type to a stable platform UUID, not specifically UEFI. I corrected the wording.
- The Linux viewing examples had an incorrect comment for `dhclient`, an invalid `systemd-networkd` file path, and an imprecise `grep duid` example. I corrected the comments, replaced the invalid `systemd` path with `networkctl status eth0`, and changed the `dhclient` example to look for `default-duid` in the lease file.
- The Windows section relied on registry access to `Dhcpv6DUID`, which is not documented as a supported admin interface in current Microsoft docs. I replaced it with a simpler `ipconfig /all | Select-String "DUID|IAID"` example.
- The `systemd-networkd` configuration used `DUID=` under `[DHCPv6]`, but current `systemd.network` uses `DUIDType=` and `DUIDRawData=`. I corrected the snippet to the documented keys.
- The `dhclient` section showed `send dhcp6.client-id ...`, but ISC documents `dhcp6.client-id` as an opaque client-provided value that should not be manually configured. I replaced the example with the documented `dhclient -6 -D LL|LLT` usage for choosing the DUID type.
- The Kea example placed `reservations` directly under `Dhcp6` without the surrounding configuration needed for global reservations. I replaced it with a subnet-level `subnet6[].reservations[]` example that matches Kea’s documented DHCPv6 reservation structure.
- The DUID/IAID section said a full DHCPv6 client identifier is `DUID + IAID`. RFC 9915 defines the Client Identifier option as the DUID alone, while lease bindings are commonly keyed by `DUID + IAID + IA type`. I corrected both the IAID description and the explanatory sentence.
- The best-practices section made two overly strong claims: that DUIDs should never be changed and that DUID-UUID guarantees uniqueness. I softened both to match the standards and practical deployment guidance.

## Review Notes
- RFC 8415 was obsoleted by RFC 9915 in January 2026. The post now aligns with the current DHCPv6 base specification.
- I could not verify a Microsoft-supported registry workflow for reading the Windows DHCPv6 DUID, so the review keeps the Windows guidance on documented command-line surfaces.
