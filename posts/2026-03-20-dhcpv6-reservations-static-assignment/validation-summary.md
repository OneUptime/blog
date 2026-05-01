# Validation Summary: How to Configure DHCPv6 Reservations for Static Assignment

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- ISC Kea DHCP
- ISC DHCP (`dhcpd`, `dhclient`)
- Kea Control Agent
- DUID
- Linux networking tools (`ip`, `tcpdump`, `curl`, `jq`)

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 6355, Definition of the UUID-Based DHCPv6 Unique Identifier (DUID-UUID): https://www.rfc-editor.org/rfc/rfc6355.html
- ISC DHCP 4.4 manual page for `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 manual page for `dhclient`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC KB, Using Host Reservations in Kea: https://kb.isc.org/docs/what-are-host-reservations-how-to-use-them
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- Kea Control Agent documentation: https://kea.readthedocs.io/en/kea-2.6.4/arm/agent.html
- Kea API reference (`lease6-get-by-duid`): https://kea.readthedocs.io/en/kea-2.5.3/api.html

## Issues Found
- The overview said DHCPv4 uses MAC addresses, which was too absolute. ISC DHCP also supports matching host declarations with the DHCP client identifier. I changed this to say many DHCPv4 setups key reservations to MAC addresses, while DHCPv6 usually uses DUIDs.
- The DUID discovery commands were too distribution-specific, and the `systemd-networkd` lease-file path was not reliable as written. I replaced them with more portable `dhclient` searches, an explicit `systemd-networkd` DUID configuration check, and a packet-capture fallback that works regardless of client implementation.
- The ISC DHCP host reservation comment described DUID-LLT incorrectly by omitting the timestamp field. I corrected the comment to say DUID-LLT contains the hardware type, time, and link-layer address.
- The Kea lease lookup example implied any default REST setup would support `lease6-get-by-duid`. In Kea, this command is provided through the Control Agent path and requires the `lease_cmds` hook library. I clarified that prerequisite in the text.
- The summary told readers to verify the DUID specifically from a client lease file. I changed this to verifying it from the client itself or a captured DHCPv6 exchange, because lease-file locations and formats vary across DHCP clients.

## Review Notes
- The `dhclient` renewal examples are valid where ISC DHCP client tools are installed, but many current Linux systems use `systemd-networkd` or NetworkManager instead. The updated DUID lookup section now reflects that implementation variance.
- Kea supports global reservations, but address-based global reservations should still be used carefully. Current Kea documentation notes that a globally reserved address must be feasible for the selected subnet, and older releases before 2.3.5 handled that less safely.
