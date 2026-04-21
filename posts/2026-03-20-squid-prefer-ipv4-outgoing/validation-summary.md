# Validation Summary: How to Configure Squid to Prefer IPv4 Over IPv6 for Outgoing Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Squid proxy configuration (`dns_v4_first`, `dns_nameservers`, `http_port`, `tcp_outgoing_address`)
- IPv4/IPv6 dual-stack behavior and Happy Eyeballs
- Squid Cache Manager and `squidclient`
- Linux `gai.conf` / glibc `getaddrinfo()` address selection
- `curl` and `tcpdump` verification commands

## Sources Consulted
- Squid configuration directive: dns_v4_first - https://www.squid-cache.org/Doc/config/dns_v4_first/
- Squid 5 release notes: Happy Eyeballs update and removed `dns_v4_first` directive - https://www.squid-cache.org/Versions/v5/RELEASENOTES.html
- Squid configuration directive: tcp_outgoing_address - https://www.squid-cache.org/Doc/config/tcp_outgoing_address/
- Squid configuration directive: dns_nameservers - https://www.squid-cache.org/Doc/config/dns_nameservers/
- Squid configuration directive: http_port - https://www.squid-cache.org/Doc/config/http_port/
- Squid Cache Manager documentation - https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid `squidclient` tool documentation - https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid Cache Manager `ipcache` report documentation - https://wiki.squid-cache.org/Features/CacheManager/IpCache
- Squid Happy Eyeballs `happy_eyeballs_connect_timeout` directive - https://www.squid-cache.org/Doc/config/happy_eyeballs_connect_timeout/
- Linux man-pages: `gai.conf(5)` - https://man7.org/linux/man-pages/man5/gai.conf.5.html
- RFC 6724: Default Address Selection for IPv6 - https://datatracker.ietf.org/doc/html/rfc6724

## Issues Found

1. **`dns_v4_first` was presented as current Squid configuration.** Official Squid docs list it only for Squid 4 and older, and Squid 5 release notes state that it was removed. Updated the title, description, introduction, examples, and conclusion to scope `dns_v4_first` to Squid 4 and older and document Squid 5+ alternatives.

2. **`dns_v4_first` was described as DNS resolution preference and IPv4-only DNS behavior.** Squid's docs state that it changes the order in which Squid contacts dual-stack sites while still performing both IPv4 and IPv6 DNS lookups. Reworded the article to describe it as a connection preference, not AAAA suppression.

3. **The IPv4-only DNS example was incorrect.** `dns_nameservers 8.8.8.8 1.1.1.1` selects DNS servers over IPv4 but does not stop those resolvers from returning AAAA records. Replaced it with guidance to use a local recursive resolver whose policy filters AAAA answers when DNS-level IPv4-only behavior is required.

4. **`http_port 0.0.0.0:3128` was claimed to contribute to complete IPv4-only operation.** Squid's `http_port` directive controls where Squid listens for client requests; it does not force outgoing origin-server connections to use IPv4. Clarified this in the configuration comments and conclusion.

5. **Cache Manager commands used invalid or stale report names.** `mgr:dns` and `mgr:all | grep -A5 dns` are not the documented DNS cache reports. Replaced them with `mgr:ipcache` and `mgr:idns`, and added the HTTP Cache Manager endpoint for Squid 7 and later because `squidclient` is no longer distributed there.

6. **Testing examples used non-dual-stack hostnames while saying they were dual-stack.** `ipv4.google.com` and `ipv6.google.com` are family-specific names, not a dual-stack test. Replaced them with `www.google.com` for the dual-stack proxy test.

7. **The `/etc/gai.conf` section incorrectly described label lines as Happy Eyeballs delay settings.** `gai.conf` affects glibc `getaddrinfo()` address sorting, not Squid's Happy Eyeballs delay. Replaced the snippet with a complete label/precedence table and clarified that this is a system-wide complement, not a Squid-only control.

8. **`tcp_outgoing_address` was over-described as part of the IPv4 preference mechanism.** Squid documents it as source address selection for matching destination address families. Clarified that it does not convert an IPv6 destination connection into IPv4.

## Review Notes
- The corrected post is valid as a Squid 4-and-older guide for `dns_v4_first`; Squid 5 and later require firewall policy, resolver policy, or a no-IPv6 build for strict IPv4-only behavior.
- Validation was based on official documentation and static review; no live Squid instance was run in this repository.
