# Validation Summary: How to Enable DHCPv6 Rapid Commit for Faster Address Assignment

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- ISC DHCP
- Kea DHCP
- `systemd-networkd`
- ISC `dhclient`
- `tcpdump`
- Wireshark

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc9915.html
- ISC DHCP 4.4 `dhclient.conf` manual - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 `dhcp-options` manual - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP official example configs - https://github.com/isc-projects/dhcp/blob/v4_4_3/doc/examples/dhcpd-dhcpv6.conf
- ISC DHCP official example configs - https://github.com/isc-projects/dhcp/blob/v4_4_3/doc/examples/dhclient-dhcpv6.conf
- Kea 2.7.7 Administrator Reference Manual, DHCPv6 server - https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html
- systemd `systemd.network(5)` - https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- Wireshark DHCPv6 display filter reference - https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- ISC DHCP end-of-life notice - https://kb.isc.org/docs/isc-dhcp-eol-dates

## Issues Found
- The ISC DHCP server snippets used `allow rapid-commit;`, but ISC DHCP’s documented DHCPv6 Rapid Commit configuration uses `option dhcp6.rapid-commit;`. I replaced both server examples with the correct syntax.
- The Kea “Global Rapid Commit” example was not valid for current Kea documentation. Kea documents `rapid-commit` at subnet and shared-network scope, not as a top-level `Dhcp6` parameter. I replaced the example with a valid shared-network scoped configuration and renamed the heading accordingly.
- The address-conflict caveat implied that only the standard exchange allows Decline. RFC 9915 requires clients to perform Duplicate Address Detection on assigned addresses and send Decline if an address is already in use, including after a Rapid Commit Reply. I corrected that explanation.
- The HA best-practice line was more specific than the protocol guidance supports. I replaced it with the RFC-backed recommendation to prefer designs where only one server responds to a given Solicit.
- The “Enable globally” best-practice line was too broad for Kea, which does not support top-level global `rapid-commit` in the way the post implied. I changed it to “all applicable scopes” so it remains accurate across the implementations covered.

## Review Notes
- ISC DHCP is end-of-life according to ISC. The corrected examples are still technically valid for existing deployments, but new deployments should prefer Kea or another actively maintained DHCP server.
- `systemd-networkd` currently supports `RapidCommit=` in the `[DHCPv6]` section, and the current manual documents it as enabled by default.
