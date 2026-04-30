# Validation Summary: How to Implement IPv6 Ingress Filtering (BCP 38/RFC 2827)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BCP 38 / RFC 2827 ingress filtering
- RFC 3704 uRPF guidance
- RFC 7039 SAVI
- Cisco IOS / IOS XE IPv6 ACLs and IPv6 Source Guard
- Junos stateless firewall filters
- Linux nftables and ip6tables
- CAIDA Spoofer

## Sources Consulted
- RFC 2827: Network Ingress Filtering: https://www.rfc-editor.org/rfc/rfc2827.html
- RFC 3704: Ingress Filtering for Multihomed Networks: https://www.rfc-editor.org/rfc/rfc3704.html
- RFC 7039: SAVI Framework: https://www.rfc-editor.org/rfc/rfc7039.html
- RFC 4864: Local Network Protection for IPv6: https://www.rfc-editor.org/rfc/rfc4864.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `nft(8)` local man page
- `ip6tables(8)` local man page
- Cisco IOS IPv6 uRPF command reference: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_09.html
- Cisco IPv6 Source Guard and Prefix Guard documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-s/ip6f-15-s-book/ip6-src-guard.html
- Junos firewall filter documentation: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-stateless-guidelines-for-configuring.html
- Junos firewall filter configuration example: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/task/firewall-filter-ocx-series-cli.html
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry
- CAIDA Spoofer project page: https://www.caida.org/projects/spoofer/
- CAIDA Spoofer FAQ: https://www.caida.org/projects/spoofer/faq/

## Issues Found
- The post used invalid IPv6 example addresses such as `2001:db8:cust::/48` and `2001:db8:other::/32`. These were replaced with valid RFC 3849 documentation-prefix examples.
- The overview described BCP 38 as if RFC 2827 itself defined a route-reachability test. This was corrected to reflect RFC 2827 with the updated ingress-filtering guidance in RFC 3704.
- The NAT explanation was inaccurate. NAT does not validate source addresses, and the wording implying that every IPv6 host has a globally routable address was too broad. This was corrected.
- The Linux nftables example used the `input` hook, which only covers packets destined to the local host, not forwarded customer traffic on a router. It was corrected to use the `forward` hook.
- The Linux uRPF section used `net.ipv6.conf.*.accept_source_route`, which is unrelated to reverse-path validation. It was replaced with accurate guidance noting that Linux does not provide an IPv6 `rp_filter` sysctl equivalent and typically relies on netfilter rules for IPv6 source validation.
- The access-layer SAVI section used Cisco `ipv6 snooping` policy syntax while claiming it would drop packets with non-learned source addresses. That behavior is provided by IPv6 Source Guard, so the example and explanation were corrected accordingly.
- The bogon filter list included prefixes that are not categorically invalid IPv6 source addresses in all contexts, such as `64:ff9b::/96`, `100::/64`, `2001::/23`, and `2002::/16`. The section was corrected to a narrower, explicitly non-exhaustive list of obviously invalid or non-global sources and now points readers to the IANA special-purpose registry.
- The CAIDA Spoofer instructions referenced an old CGI script download and a `--protocol ipv6` invocation that do not match CAIDA’s current client guidance. The section was corrected to the current project download path and the client’s automatic IPv6-testing behavior.

## Review Notes
- The post is now technically sound at a practical operator-guide level, but the title and framing still center on RFC 2827/BCP 38. Operators specifically interested in modern uRPF guidance should also read RFC 8704, which updates RFC 3704.
- The router ACL examples intentionally show the anti-spoofing logic only. Real deployments may need explicit exceptions for control-plane traffic such as NDP, DHCPv6 PD, or customer BGP sessions before the final drop or discard.
- I could not perform a privileged live `nft` ruleset check in this environment, so the Linux examples were validated against the Linux kernel documentation and local `nft(8)` / `ip6tables(8)` man pages instead.
