# Validation Summary: How to Set Up a DHCP Relay Agent

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCP / BOOTP relay behavior
- ISC DHCP Relay (`dhcrelay`)
- Debian/Ubuntu `isc-dhcp-relay` packaging
- Cisco IOS `ip helper-address`
- Linux `iptables` DNAT
- `tcpdump` packet capture filters
- `systemd` service management

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/html/rfc2131
- RFC 1542: Clarifications and Extensions for the Bootstrap Protocol: https://www.rfc-editor.org/rfc/rfc1542.html
- ISC DHCP 4.4 `dhcrelay` manual page: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP end-of-life notice: https://www.isc.org/dhcp/
- Cisco IOS DHCP relay agent documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/12-4/dhcp-12-4-book/config-dhcp-relay-agent.html
- Linux `iptables-extensions(8)` DNAT documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local command checks: `apt-cache policy isc-dhcp-relay`, `tcpdump -d 'port 67 or port 68'`, `tcpdump -d 'port 67'`
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The post described DHCP relay as simply converting broadcasts to unicasts. Updated the wording to match RFC relay behavior more closely: the relay receives a client broadcast and sends a relay message, usually by unicast, to the DHCP server.
- The Linux section recommended ISC DHCP Relay without noting its upstream maintenance status. Added a brief caveat that ISC DHCP Relay is end-of-life upstream, while still acknowledging that distributions may package and support it.
- The direct `dhcrelay` example only listed client-facing interfaces. Updated it to use explicit downstream (`-id`) and upstream (`-iu`) interfaces, matching the ISC `dhcrelay` manual for a routed relay path.
- The Cisco IOS snippet used an inline `!` comment after `ip helper-address`, which is not a safe pasteable IOS command form. Removed the inline comment and kept the valid `ip helper-address <server-ip>` command.
- The post presented an `iptables` DNAT rule as a DHCP relay alternative. Replaced that with a warning that DNAT is not a DHCP relay because it does not set `giaddr` or generate a proper relay message, so the DHCP server cannot reliably select the client subnet or return replies through the relay.
- The `giaddr` explanation said the relay sets the field to its own IP address. Updated it to the more precise RFC behavior: when `giaddr` is zero, the relay sets it to the IP address of the interface that received the request; non-zero `giaddr` should not be modified.

## Review Notes
The remaining commands and configuration examples were technically valid after the fixes. `tcpdump` filter syntax was checked locally. The `isc-dhcp-relay` package is available in the local Ubuntu package index, but because ISC DHCP Relay is end-of-life upstream, future updates should consider a maintained relay implementation appropriate to the target distribution or network platform.
