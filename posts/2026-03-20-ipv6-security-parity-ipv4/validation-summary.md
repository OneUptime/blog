# Validation Summary: How to Achieve IPv6 Security Parity with IPv4 Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- Linux `iptables` / `ip6tables`
- `nftables`
- ICMPv6 / Neighbor Discovery Protocol (NDP)
- Cisco IOS ACLs
- Nginx
- OpenSSH

## Sources Consulted
- RFC 9099, *Operational Security Considerations for IPv6 Networks*: https://www.rfc-editor.org/rfc/rfc9099.html
- RFC 4890, *Recommendations for Filtering ICMPv6 Messages in Firewalls*: https://www.rfc-editor.org/rfc/rfc4890
- NIST SP 800-119, *Guidelines for the Secure Deployment of IPv6*: https://doi.org/10.6028/NIST.SP.800-119
- RFC 4193, *Unique Local IPv6 Unicast Addresses*: https://www.rfc-editor.org/rfc/rfc4193.html
- RFC 4291, *IP Version 6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, *IPv6 Address Prefix Reserved for Documentation*: https://www.rfc-editor.org/rfc/rfc3849.html
- netfilter `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- `ip6tables` / `iptables` man page: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Cisco IOS IPv6 ACL documentation: https://www.cisco.com/en/US/docs/ios-xml/ios/sec_data_acl/configuration/15-2s/ip6-acls.html
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- OpenSSH `sshd_config` documentation: https://man.openbsd.org/sshd_config
- `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The example IPv6 prefix `2001:db8:mgmt::/48` was syntactically invalid. I replaced it with `2001:db8:100::/48`, which stays inside the documentation prefix space reserved by RFC 3849.
- The comment `10.0.0.0/8 → fd00::/8` implied a false one-to-one mapping between RFC 1918 IPv4 space and IPv6 local addressing, and it used the wrong ULA supernet. I changed this to tell readers to map IPv4 private networks to their actual IPv6 GUA or ULA prefixes and noted that ULAs come from `fc00::/7` per RFC 4193.
- The `-m state --state` examples used the older state match. I updated them to `-m conntrack --ctstate`, which is the current superset documented by `iptables-extensions`.
- The ICMPv6 guidance was incomplete. Allowing only neighbor discovery and router advertisements can still break IPv6 because PMTU and error handling depend on ICMPv6. I added `destination-unreachable`, `packet-too-big`, `time-exceeded`, and `parameter-problem`, and I added the missing router solicitation example for completeness.
- The nftables rule used `ip6 nexthdr icmpv6` inside an `inet` table. The official nftables man page warns that `ip6 nexthdr` only matches the next header and can miss packets with IPv6 extension headers. I changed the rule to `meta l4proto ipv6-icmp icmpv6 type { ... }`.
- The router ACL verification command used `show ipv6 access-lists`, but Cisco documents `show ipv6 access-list`. I corrected the command and marked it as a Cisco IOS example.
- The sentence saying many applications "bind to IPv4 only by default" was too absolute. I softened it to say applications do not always expose identical IPv4 and IPv6 listeners.

## Review Notes
- The post is now technically sound, but the exact ICMPv6 allow-list still depends on device role. Hosts using SLAAC need router discovery traffic; routers and statically addressed servers may use a narrower policy.
- The Linux firewall examples remain valid, but modern distributions often run `ip6tables` through the nftables backend. The post already recommends `nftables` as the preferred unified ruleset, which is the right direction.
- I also verified the updated `ip6tables` rule syntax locally with `ip6tables --help` and `ip6tables-translate`.
