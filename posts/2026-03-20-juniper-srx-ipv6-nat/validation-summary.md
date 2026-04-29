# Validation Summary: How to Configure IPv6 NAT on Juniper SRX

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper SRX
- Junos OS IPv6 interface configuration
- IPv6 static routing
- Junos firewall filters for `family inet6`
- DHCPv6 local server
- IPv6 Neighbor Discovery and router advertisements

## Sources Consulted
- Juniper Networks, "IPv6 NAT" - https://www.juniper.net/documentation/us/en/software/junos/nat/topics/topic-map/security-ipv6-nat.html
- Juniper Networks, "DHCPv6 Server" - https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper Networks, "dhcp-attributes (Access IPv6 Address Pools)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/access-edit-dhcp-attributes-ipv6.html
- Juniper Networks, "forwarding-options (Security)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-forwarding-options.html
- Juniper Networks, "IPv6 Flow-Based Processing" - https://www.juniper.net/documentation/us/en/software/junos/flow-packet-processing/topics/topic-map/security-flow-based-for-ipv6.html
- Juniper Networks, "IPv6 Neighbor Discovery" - https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper Networks, "show ipv6 neighbors" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, "show ipv6 router-advertisement" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-router-advertisement.html
- Juniper Networks, "ping" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, "traceoptions (Protocols IPv6 Neighbor Discovery)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/traceoptions-edit-protocols-router-advertisement.html
- Juniper Networks, "system-services (Security Zones Host Inbound Traffic)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-system-service-zone-host-inbound-traffic.html

## Issues Found
- The post claimed to cover NAT66 and NAT64, but the body only documented general IPv6 interface, routing, filter, and DHCPv6 configuration. I corrected the title, tags, description, overview, and conclusion to match the actual content so the article no longer makes unsupported NAT claims.
- Several sample IPv6 addresses used non-hex placeholders such as `remote`, `wan`, and `lan`, which are not valid IPv6 syntax. I replaced them with valid examples from the documentation prefix space.
- The DHCPv6 example used `active-server-group` and `server-identifier-override`, which do not belong in a basic DHCPv6 local-server example on SRX. I replaced that block with valid `dhcp-local-server dhcpv6` syntax, a valid IPv6 address-assignment pool, router-advertisement settings, and the required `dhcpv6` host-inbound allowance on the interface's security zone.
- The verification command `show arp no-resolve table inet6` was incorrect for IPv6 on Junos. I replaced it with `show ipv6 router-advertisement`, while retaining `show ipv6 neighbors` for neighbor-cache verification.
- The post omitted the SRX300 Series IPv6 forwarding caveat. I added the documented prerequisite to enable `set security forwarding-options family inet6 mode flow-based` and reboot after the mode change on SRX300 Series devices.
- The traceoptions comment said "IPv6 routing debug" even though the commands trace router advertisement activity. I corrected the comment to match the actual subsystem being traced.

## Review Notes
- The article is now technically accurate as a general IPv6-on-SRX guide, not as a NAT66 or NAT64 guide. The directory slug still contains `ipv6-nat`, which could be updated later if URL stability is not a concern.
- `traceoptions flag all` is valid, but Juniper documents it as potentially high-overhead and recommends disabling tracing promptly after troubleshooting.
