# Validation Summary: How to Set Up Multi-WAN Load Balancing for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (CE 2.7.x / pfSense Plus)
- Multi-WAN routing
- Gateway groups (load balancing and failover)
- dpinger (gateway monitoring daemon, ICMP-based)
- Policy-based routing
- Sticky connections (pf source tracking)

## Sources Consulted
- pfSense Multi-WAN load balance and failover: https://docs.netgate.com/pfsense/en/latest/multiwan/load-balance-and-failover.html
- pfSense Gateway Groups: https://docs.netgate.com/pfsense/en/latest/routing/gateway-groups.html
- pfSense Gateway Configuration / dpinger: https://docs.netgate.com/pfsense/en/latest/routing/gateway-configure.html
- pfSense Advanced Miscellaneous (Sticky Connections / Source tracking): https://docs.netgate.com/pfsense/en/latest/config/advanced-misc.html
- pfSense Policy Routing: https://docs.netgate.com/pfsense/en/latest/multiwan/policy-route.html
- pfSense Gateway log/monitoring: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/gateway.html

## Issues Found
- **Source tracking timeout description was inaccurate.** The original text said `Source tracking timeout: 0 (use state timeout)`. Per Netgate docs, the field defaults to "not set" (blank), in which case the source/destination association is removed as soon as the underlying states expire. Setting it to `0` is not the documented way to get default behavior. Updated the snippet in Step 5 to read `Source tracking timeout: blank (default - expires with states)`.

## Review Notes
- All navigation paths (Interfaces > Assignments, System > Routing > Gateways, System > Routing > Gateway Groups, Firewall > Rules > LAN, System > Advanced > Miscellaneous, Status > Gateways) are valid in current pfSense CE 2.7.x / pfSense Plus.
- Gateway tier semantics (same tier = load balance; lower tier number = higher priority; higher tier number = backup) are correctly described. pfSense supports up to 5 tiers.
- "Packet Loss or High Latency" is one of four valid Trigger Level options (Member Down, Packet Loss, High Latency, Packet Loss or High Latency).
- dpinger uses ICMP echo by default; the post's "ICMP pings" description is accurate. Worth noting in future revisions that dpinger pings the gateway twice per second by default.
- Policy-routing rule placement (specific rule above general load-balance rule) is correct because pf evaluates rules first-match-wins (with the usual quick-rule caveats).
- The example IP allocations (`203.0.113.0/24` and `198.51.100.0/24`) are RFC 5737 documentation/test ranges, which is appropriate for a tutorial.
