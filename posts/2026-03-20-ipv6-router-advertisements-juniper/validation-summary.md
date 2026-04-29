# Validation Summary: How to Configure IPv6 Router Advertisements on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos
- IPv6 Neighbor Discovery (NDP)
- ICMPv6 Router Advertisements
- SLAAC
- DHCPv6
- RDNSS and DNSSL

## Sources Consulted
- Juniper CLI reference for `protocols router-advertisement`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper hierarchy reference for `protocols router-advertisement`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/topic-map/hierarchy-edit-protocols.html
- Juniper CLI reference for `show ipv6 router-advertisement`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-router-advertisement.html
- Juniper CLI reference for `autonomous`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/autonomous-edit-protocols-router-advertisement.html
- Juniper CLI reference for `on-link`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/on-link-edit-protocols-router-advertisement.html
- Juniper example for recursive DNS server addresses in RA: https://www.juniper.net/documentation/us/en/software/junos/icmp/topics/example/example-configuring-rdnss-addresses-for-ipv6-hosts.html
- Juniper CLI reference for `show ipv6 neighbors`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106

## Issues Found
- The post used non-existent Junos statements `no-autonomous-flag` and `onlink-flag`. These were corrected to `no-autonomous` and `on-link` to match Junos CLI syntax.
- The explanation for disabling autonomous addressing implied that `no-autonomous` alone makes clients use DHCPv6 for addresses. This was corrected to clarify that disabling SLAAC should be paired with the M flag and DHCPv6 when stateful addressing is intended.
- The prerequisite `Junos 10.0 or later` was too broad for the article as written because the post includes `dns-server-address`, which Juniper documents as introduced in Junos 14.1. The prerequisite was updated accordingly.
- The DNSSL note claimed `Junos 18.1+` support without a verified primary-source basis. The version-specific claim was removed and replaced with release-agnostic wording tied to whether the target Junos release supports `dns-search-list`.
- The RA suppression example used `no-advertisement`, which is not a valid `protocols router-advertisement` interface statement in current Junos documentation. It was replaced with removal of the interface RA stanza, which is the correct way to stop advertising on that interface.
- The verification section used `show ipv6 router-advertisement interface ge-0/0/1.0 detail`, but the documented command syntax does not include a `detail` option. The command was corrected to the supported interface form.
- The verification command `show protocols router-advertisement` was ambiguous because it depends on CLI mode. It was updated to `show configuration protocols router-advertisement` so the command is explicit from operational mode.
- The sample output for `show ipv6 router-advertisement` did not match Junos field names or current command formatting. It was updated to use the documented field names such as `Managed`, `Other configuration`, `Current hop limit`, and `RDNSS address`.
- The full stanza-format example still used the incorrect `onlink-flag` token. It was corrected to `on-link`.

## Review Notes
- `show ipv6 router-advertisement` output varies by platform, release, and whether the interface is only sending RAs or is also receiving them from neighboring routers, so real output may differ from the sample.
- The final post is technically sound after the corrections above.
