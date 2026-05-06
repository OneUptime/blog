# Validation Summary: How to Implement BGP Anycast for DNS or CDN Load Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BGP
- IP anycast
- DNS
- ExaBGP
- Linux `iproute2`
- BIND / `dig`
- `traceroute`

## Sources Consulted
- RFC 4271: BGP-4 https://www.rfc-editor.org/rfc/rfc4271
- RFC 4786: Operation of Anycast Services https://www.rfc-editor.org/rfc/rfc4786.html
- RFC 5737: IPv4 Address Blocks Reserved for Documentation https://www.rfc-editor.org/rfc/rfc5737
- `ip-route(8)` man page https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-address(8)` man page https://man7.org/linux/man-pages/man8/ip-address.8.html
- BIND 9 Administrator Reference Manual (`listen-on`) https://isc-projects.gitlab-pages.isc.org/bind9/reference.html
- Cisco IOS BGP configuration guide (`network` command / address-family example) https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book/irg-basic-net.html
- ExaBGP upstream repository and packaged CLI help https://github.com/Exa-Networks/exabgp

## Issues Found
- The post described anycast routing as sending clients to the "nearest" instance. I changed this to BGP selecting the best path by routing policy, which is often but not always the topologically nearest instance. This matches RFC 4786 and BGP path-selection behavior in RFC 4271.
- The post used `192.0.2.0/24` and `203.0.113.0/24` as if they were deployable public prefixes. I added a note that these are TEST-NET documentation ranges and must be replaced with address space you control in production, per RFC 5737.
- The static `Null0` route guidance implied the prefix should remain present even if no servers are active. I corrected this to explain that the discard route must be installed and removed by health-state automation; otherwise the site can continue advertising the prefix and blackhole traffic.
- The Step 3 shell example incorrectly mixed Linux route manipulation on a host with BGP origination logic and used an unreliable pattern for "advertise/withdraw." I replaced it with a healthcheck script that cleanly exits success/failure, which can then drive route removal or BGP withdrawal.
- The ExaBGP Python announce/withdraw loop was not a safe current example. I replaced it with ExaBGP's built-in `healthcheck` helper, which is a current upstream-supported mechanism for health-based route advertisement and withdrawal.

## Review Notes
- The Cisco-style BGP snippet is syntactically valid as an example, but real deployments usually pair anycast announcements with vendor-specific tracking or automation on the BGP speaker.
- The `/etc/network/interfaces` persistence example is valid for ifupdown-based systems, but some modern Debian/Ubuntu deployments use other network managers, so persistence steps may vary by environment.
