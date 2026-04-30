# Validation Summary: How to Implement Defense-in-Depth for IPv6 Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 network security architecture
- Linux `ip6tables` / `iptables`
- Linux `nftables`
- Suricata IDS/IPS rules
- Cisco IPv6 first-hop security features
- Nginx TLS and mutual TLS
- `tcpdump` packet capture and monitoring

## Sources Consulted
- RFC 9099: Operational Security Considerations for IPv6 Networks — https://www.rfc-editor.org/rfc/rfc9099.html
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls — https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 5095: Deprecation of Type 0 Routing Headers in IPv6 — https://www.rfc-editor.org/rfc/rfc5095
- RFC 6105: IPv6 Router Advertisement Guard — https://www.rfc-editor.org/rfc/rfc6105.html
- RFC 7610: DHCPv6-Shield: Protecting against Rogue DHCPv6 Servers — https://www.rfc-editor.org/rfc/rfc7610.html
- RFC 7039: Source Address Validation Improvement (SAVI) Framework — https://www.rfc-editor.org/rfc/rfc7039
- nftables wiki: Configuring chains — https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki: Matching packet headers — https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- Suricata Rules documentation — https://docs.suricata.io/en/latest/rules/
- Suricata Header Keywords — https://docs.suricata.io/en/latest/rules/header-keywords.html
- Suricata Thresholding Keywords — https://docs.suricata.io/en/latest/rules/thresholding.html
- Nginx: Configuring HTTPS servers — https://nginx.org/en/docs/http/configuring_https_servers.html
- Nginx `ngx_http_ssl_module` — https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `tcpdump(8)` — https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Cisco Catalyst IPv6 First Hop Security CLI Guide — https://www.cisco.com/c/en/us/td/docs/switches/campus-lan-switches-access/Catalyst-1200-and-1300-Switches/cli/C1300-cli/ipv6-first-hop-security.html

## Issues Found
1. **The perimeter filter example was using the `INPUT` chain for traffic described as edge/transit filtering.** That would only apply to packets destined for the firewall itself, not routed traffic. Changed the bogon examples to `FORWARD` and clarified the comment so the snippet matches the text.

2. **The nftables ICMPv6 rules were written in a way that was less reliable than current nftables guidance.** The original rules matched `ip6 nexthdr icmpv6`, which can miss packets when IPv6 extension headers are present. Updated the rules to use `icmpv6 type ...` syntax and quoted the base-chain creation commands to match documented nftables command-line usage.

3. **The Suricata examples were overstating what they actually detected.** The original "Rogue RA" rule matched any Router Advertisement, the "Type 0 Routing Header" rule matched any Routing Header, and the "scan" rule would alert on any burst of IPv6 traffic. Replaced them with rules whose match conditions align with their descriptions: observed Router Advertisements, Routing Header presence, and a high-rate Neighbor Solicitation sweep heuristic.

4. **The host firewall section contained an invalid IPv6 prefix and an overly broad ICMPv6 allow rule.** `fd00:mgmt::/48` is not valid IPv6 notation, and the "Allow NDP" rule actually allowed all ICMPv6 from link-local sources. Replaced the management prefix with a valid ULA example, narrowed the link-local rules to specific NDP message types, and added `parameter-problem`, which RFC 4890 treats as essential ICMPv6 traffic in relevant cases.

5. **The application-security example used the wrong layer and invalid sample data.** The strongSwan/IPsec example was placed under "Application Security" even though IPsec is a lower-layer control, and `2001:db8::server` is not a valid IPv6 literal. Replaced that section with an Nginx mutual TLS example, which is an application-layer control and uses current documented directives.

6. **The live monitoring pipeline could buffer output unexpectedly.** Added `tcpdump -l` so the pipeline is line-buffered when sending packet events to `logger`.

## Review Notes
- The post now reads correctly as a layered IPv6 security guide, but the command snippets are still intentionally minimal examples rather than complete production policies.
- The perimeter filtering list is representative, not exhaustive. In practice, operators should maintain current bogon/reserved prefix filters and explicitly document any approved transition-tunnel exceptions.
- The Linux examples mix `ip6tables` and `nftables`, which is acceptable for illustration, but modern Linux deployments generally standardize on `nftables` where possible.
