# Validation Summary: How to Configure IPv6 Firewall Rules with firewalld on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- nftables
- IPv6
- ICMPv6
- Linux packet forwarding

## Sources Consulted
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld concepts documentation for zones, policies, and forwarding behavior: https://firewalld.org/documentation/concepts.html
- firewalld ICMP type documentation: https://firewalld.org/documentation/icmptype/
- Red Hat Enterprise Linux 9 firewall and packet filter documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- Local nftables CLI version check (`nft --version`)

## Issues Found
- The post said firewalld creates entries in both IPv4 and IPv6 tables when adding a service. On RHEL 9 with the nftables backend, firewalld uses an `inet` ruleset that can match both protocol families. Updated the wording to avoid implying separate IPv4 and IPv6 tables.
- The ICMPv6 "must be allowed" table omitted important error messages from RFC 4890: Destination Unreachable, Time Exceeded, and Parameter Problem. Added those entries while keeping the existing Neighbor Discovery and Packet Too Big guidance.
- The ping6 block example used `--add-icmp-block=echo-request`, which is not IPv6-specific and can also affect IPv4 echo requests. Replaced it with an IPv6-family rich rule using `icmp-block`.
- The forwarding section used `--query-masquerade` as a forwarding check. Masquerading is NAT, not a forwarding status check. Replaced it with kernel IPv6 forwarding commands and `--query-forward` for intra-zone forwarding.

## Review Notes
- The examples use documentation prefixes such as `2001:db8::/32`, which are correct for examples but should be replaced with real assigned prefixes in production.
- Blocking echo requests is technically possible, but RFC 4890 generally recommends not dropping echo request/reply traffic for local configuration traffic unless there is a specific policy reason.
