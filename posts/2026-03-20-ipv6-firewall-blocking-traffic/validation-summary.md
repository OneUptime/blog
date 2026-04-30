# Validation Summary: How to Troubleshoot IPv6 Firewall Blocking Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- Path MTU Discovery (PMTUD)
- ip6tables
- nftables
- Linux firewall troubleshooting

## Sources Consulted
- Netfilter `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter `iptables-extensions` man page: https://ipset.netfilter.org/iptables-extensions.man.html?source=post_page---------------------------
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201

## Issues Found
- The introduction overstated the IPv4 comparison and implied that blocking all ICMPv6 still lets hosts get addresses. I changed this to say IPv6 relies much more directly on ICMPv6 and that blocking it can leave only partial connectivity, which better matches RFC 4861 and RFC 8201 behavior.
- The selective ICMPv6 example handled Router Solicitation and Router Advertisement in the wrong direction for a typical host. I changed Router Solicitation (Type 133) to `OUTPUT`, kept Router Advertisement (Type 134) on `INPUT`, and added a note that routers need the opposite direction too, based on RFC 4861.
- The selective allow-list omitted ICMPv6 Parameter Problem (Type 4), which RFC 4890 calls out as important firewall traffic. I added Type 4 to the examples and updated the conclusion accordingly.
- The diagnostic section said the commands flushed "all ip6tables rules", but the commands shown operate on the default filter table. I clarified that wording and updated `ping6` to `ping -6` to match current `ping` CLI usage.
- The minimal ip6tables ruleset used `-m state --state`. I replaced it with `-m conntrack --ctstate`, which is the current documented conntrack form in the iptables extensions documentation.
- The nftables example used `ip6 nexthdr icmpv6` to match ICMPv6. The nftables man page warns that `ip6 nexthdr` only matches the immediate next header and can miss packets with IPv6 extension headers, so I replaced it with `meta l4proto ipv6-icmp`.

## Review Notes
- The post is Linux-specific and assumes direct use of `ip6tables` or `nftables`; systems managed through higher-level frontends such as `firewalld` or `ufw` use different operational workflows.
- The selective ICMPv6 examples are host-oriented. Router/firewall appliances may need additional direction-specific allowances depending on whether they originate Router Advertisements or forward multicast traffic.
