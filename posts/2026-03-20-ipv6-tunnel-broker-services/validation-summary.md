# Validation Summary: How to Understand IPv6 Tunnel Broker Services

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6
- IPv6 tunnel brokers
- 6in4 / IPv6-over-IPv4 configured tunnels
- IP protocol 41 / SIT tunneling
- Hurricane Electric Tunnelbroker
- NetAssist Tunnel Broker
- Cisco IOS IPv6-over-IPv4 tunnels
- Linux `iproute2`
- `iptables`
- `curl` Dyn-compatible endpoint updates

## Sources Consulted
- RFC 3053, "IPv6 Tunnel Broker" - https://datatracker.ietf.org/doc/html/rfc3053
- RFC 4213, "Basic Transition Mechanisms for IPv6 Hosts and Routers" - https://datatracker.ietf.org/doc/html/rfc4213
- Hurricane Electric Tunnelbroker homepage - https://tunnelbroker.net/
- Hurricane Electric Tunnelbroker FAQ - https://ipv6.he.net/certification/faq.php
- Hurricane Electric Tunnel Server Status - https://ipv4.tunnelbroker.net/status.php
- Hurricane Electric Tunnelbroker API documentation - https://forums.he.net/index.php?topic=3153.0
- Hurricane Electric Dyn-compliant endpoint updates - https://forums.he.net/index.php?topic=1994.0
- NetAssist IPv6 service page - https://netassist.ua/en/service/ipv6
- NetAssist tunnel broker portal - https://tb.netassist.ua/
- SixXS sunset notice - https://www.sixxs.net/sunset
- Freenet6 TSP overview - https://www.freenet6.net/aboutfreenet6.shtml
- Cisco IOS, "Manually Configured IPv6 over IPv4 Tunnels" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/configuration/15-s/ir-15-s-book/ip6-man-tunls.html
- Local CLI help used to confirm command syntax: `ip tunnel help`, `ip route help`, `iptables -h`, `curl --help all`

## Issues Found
- The overview implied that tunnel brokers always use 6in4. I changed it to say 6in4 is common, but some services use other tunnel types.
- The signup flow said the broker always assigns a /48 for the LAN. I corrected this to reflect that brokers often route a /64 and some also offer a /48; HE provides a tunnel /64 and can route a /64 or /48.
- The provider table overstated or misstated some provider details. I corrected HE prefix wording, updated the NetAssist URL/prefix details, and changed Freenet6 / Gogo6 from `6in4` to `TSP / configured tunnels` with varied prefix allocation.
- The sample HE tunnel details reused the same example prefix for both the tunnel /64 and the routed /48 and incorrectly claimed a /48 contains `48 /64` subnets. I split the example prefixes and corrected the /48 size to `65,536 /64` subnets.
- The tunnel PoP latency example mislabeled HE endpoints. I replaced the hard-coded IP comments with current tunnel-server hostnames and pointed to HE's live status page.
- The dynamic update example used a generic `APIKEY` label. I updated it to `UPDATEKEY`, which matches HE's current tunnel-update terminology.
- The security section only mentioned outbound protocol 41. I corrected it to note that NAT setups also need a router that can forward protocol 41.

## Review Notes
- The Linux `ip tunnel`, `ip route`, `curl`, and `iptables` examples are syntactically valid based on current local CLI help.
- The Cisco IOS sample is consistent with Cisco's documented manually configured IPv6-over-IPv4 tunnel syntax.
- `iptables` remains valid, though many modern Linux distributions now implement it through nftables compatibility layers.
- Hurricane Electric's tunnel-server footprint changes over time. The post now points readers to the live status page instead of relying on stale fixed endpoint IPs.
- HE's FAQ documents practical limitations around NAT and CGNAT, and separate abuse-related SMTP/IRC filtering. Those caveats were not required to fix inaccuracies here, but they may be worth mentioning in a future expansion.
