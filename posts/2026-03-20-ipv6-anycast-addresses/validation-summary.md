# Validation Summary: How to Understand IPv6 Anycast Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- IPv6 anycast
- BGP
- OSPFv3
- Linux `iproute2`
- Debian/Ubuntu `ifupdown`
- Public DNS

## Sources Consulted
- RFC 4291, *IP Version 6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291
- RFC 2526, *Reserved IPv6 Subnet Anycast Addresses*: https://www.rfc-editor.org/rfc/rfc2526
- Google Public DNS FAQ: https://developers.google.com/speed/public-dns/faq?hl=en
- Google Public DNS setup docs: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IP addresses: https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Linux `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `traceroute(8)` man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Local CLI docs checked with `ip address help`, `man 8 ip-address`, and `man 8 ping`
- NTP Pool usage docs: https://www.ntppool.org/en/use.html

## Issues Found
- The Linux `ip` example used incorrect syntax: `anycast` is not used as a standalone flag in `ip -6 addr add 2001:db8::1/128 anycast dev eth0`. I changed the example to add the `/128` address normally and clarified that the anycast behavior comes from routing.
- The Subnet-Router Anycast explanation was too specific about Mobile IPv6. I changed it to match RFC 4291 more closely: the address is for reaching any one router for a subnet without needing a specific router address.
- The DNS diagnostics used `traceroute6` and `ping6`. I updated them to `traceroute -6` and `ping -6`, which match current Linux man-page syntax.
- The `pool.ntp.org` example was inaccurate. The NTP Pool user documentation describes DNS-based server selection rather than an anycast time service, so I replaced that bullet with a correct generic anycast use case.
- The OSPFv3 example used an invalid IPv6 literal (`2001:db8:service::1`) and deprecated `netmask` formatting in `/etc/network/interfaces`. I replaced it with a valid `inet6 static` example using `address 2001:db8:100::1/128` and corrected the routing explanation.
- The “same prefix” wording in the routing explanation was imprecise for service anycast. I changed it to “same address, commonly as a /128 host route,” which aligns better with RFC 4291’s host-route discussion.

## Review Notes
- The remaining protocol-level explanations are consistent with RFC 4291: IPv6 anycast addresses come from the unicast space and are routed to the nearest instance by normal routing policy.
- The article is intentionally IPv6-scoped, although anycast is also widely used operationally with IPv4.
