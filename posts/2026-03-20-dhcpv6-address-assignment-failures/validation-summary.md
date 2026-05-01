# Validation Summary: How to Troubleshoot DHCPv6 Address Assignment Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- ISC Kea DHCPv6
- ISC DHCP (`dhcpd` and `dhclient`)
- `systemd`
- `tcpdump`
- `ip6tables`

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861.html
- Kea Administrator Reference Manual, DHCPv6 Server - https://kea.readthedocs.io/en/kea-2.5.2/arm/dhcp6-srv.html
- Kea Administrator Reference Manual, Statistics - https://kea.readthedocs.io/en/kea-2.5.2/arm/stats.html
- Kea Control Agent documentation - https://kea.readthedocs.io/en/kea-2.7.7/arm/agent.html
- Kea Management API documentation - https://kea.readthedocs.io/en/kea-3.1.6/arm/ctrl-channel.html
- Kea Messages Manual - https://kea.readthedocs.io/en/kea-3.0.0/kea-messages.html
- ISC DHCP 4.4 Manual Pages - dhclient - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- Local CLI help for `systemctl`, `journalctl`, `ss`, `tcpdump`, `ip6tables`, and `ip`

## Issues Found
- The post referenced Kea log message identifiers that do not match current documented message names. I replaced them with `DHCP6_PACKET_RECEIVED`, `DHCP6_SUBNET_SELECTION_FAILED`, and the documented `ALLOC_ENGINE_V6_ALLOC_FAIL*` allocation-failure family.
- The packet-flow section implied the four-message exchange is the only expected behavior. I corrected it to the typical sequence without Rapid Commit, because DHCPv6 also supports the two-message Solicit/Reply exchange.
- The subnet-selection section incorrectly said the client's link-local address must fall within a configured subnet. I corrected this to match Kea's documented behavior: local subnet selection is tied to the incoming interface, and relayed traffic uses the relay `link-address` or `interface-id`.
- The Kea statistics example omitted the documented `arguments` object and described the output as pool statistics. I updated the request shape to match the Management API examples and clarified that it is reporting per-subnet statistics.
- The troubleshooting table used imprecise wording for allocation and identifier problems. I updated the pool-exhaustion symptom to `NoAddrsAvail` (status code 2) and replaced the vague DUID-conflict line with a more accurate server-ID / DUID mismatch explanation.

## Review Notes
- The `isc-dhcp-server6` unit name and `/var/log/syslog` path are distro-specific. They are valid on some Linux distributions but may differ on others.
- Ubuntu's current server documentation marks `isc-dhcp-server` as deprecated since Ubuntu 24.04 LTS, while Kea remains the actively maintained ISC DHCP server.
- DHCPv6 client startup can also depend on client behavior and Router Advertisement signaling described in RFC 4861 and RFC 9915. The post is still technically sound after the fixes, but that is a useful future caveat if the guide is expanded.
