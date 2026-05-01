# Validation Summary: How to Configure F5 BIG-IP for IPv6 Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- F5 BIG-IP / TMOS
- TMSH
- BIG-IP Local Traffic Manager (LTM)
- IPv6 and dual-stack load balancing
- SNAT pools
- HTTP health monitors
- iRules

## Sources Consulted
- F5 TMSH Reference: `ltm virtual` https://clouddocs.f5.com/cli/tmsh-reference/v14/modules/ltm/ltm_virtual.html
- F5 TMSH Reference: `ltm pool` https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_pool.html
- F5 TMSH Reference: `net self` https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/net/net_self.html
- F5 TMSH Reference: `ltm snatpool` https://clouddocs.f5.com/cli/tmsh-reference/v16/modules/ltm/ltm_snatpool.html
- F5 TMSH Reference: `ltm monitor http` https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_monitor_http.html
- F5 TMSH Reference: `sys connection` https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/sys/sys_connection.html
- F5 TMSH Reference: `sys provision` https://clouddocs.f5.com/cli/tmsh-reference/v16/modules/sys/sys_provision.html
- F5 TMSH Reference: `tmsh` https://clouddocs.f5.com/cli/tmsh-reference/latest/general/tmsh.html
- F5 BIG-IP Local Traffic Manager: Implementations, `Load Balancing to IPv6 Nodes` https://techdocs.f5.com/en-us/bigip-15-0-0/big-ip-local-traffic-manager-implementations/load-balancing-to-ipv6-nodes.html
- F5 BIG-IP CGNAT: Implementations, `Using NAT64 to Map IPv6 Addresses to IPv4 Destinations` https://techdocs.f5.com/en-us/bigip-15-1-0/big-ip-cgnat-implementations/using-nat64-to-map-ipv6-addresses-to-ipv4-destinations.html
- F5 iRules Reference: `IP::version` https://clouddocs.f5.com/cli/tmsh-reference/v14/modules/ltm/ltm_rule_command_IP_version.html

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::server1`, `2001:db8::vip`, and `2001:db8::snat-1`. I replaced them with valid documentation-prefix IPv6 addresses and explicit pool-member names so the examples are syntactically valid.
- The prerequisite section used `tmsh list sys db ipv6.state` and `tmsh modify sys db ipv6.state value enable`. I could not validate those as documented current prerequisites, so I replaced them with documented checks for TMOS version, provisioning, self IPs, and routes.
- The virtual-server examples used bracketed IPv6 destination syntax in `tmsh`. F5 documents IPv6 virtual destinations in `a:b:c:d:e:f:g:h[.port]` form, so I corrected the destination syntax.
- The post presented an IPv6 virtual server forwarding to an IPv4 pool as generic IPv6 load balancing. F5 documents IPv6-to-IPv4 handling under NAT64/CGNAT, while standard LTM IPv6 load-balancing guidance covers IPv4-to-IPv6 and IPv6-to-IPv6 patterns. I replaced the example with documented LTM patterns.
- The dual-stack example reused an existing virtual-server name and implied a single backend pool across both address families without clarifying translation. I renamed the virtual servers and switched the example to family-appropriate IPv4 and IPv6 pools to keep the configuration internally consistent.
- The HTTP monitor used an invalid placeholder in the `Host` header. I replaced it with a valid HTTP monitor request string that matches documented monitor syntax.

## Review Notes
- The post is technically valid after correction.
- If the author wants to cover IPv6 clients reaching IPv4-only servers, that should be documented separately as a NAT64/CGNAT workflow rather than a standard LTM virtual server and pool example.
- The examples now use RFC 3849 documentation-prefix IPv6 addresses (`2001:db8::/32`), RFC 5737 documentation IPv4 addresses (`203.0.113.0/24`), and RFC 1918 private IPv4 addresses (`10.0.0.0/8`), which is appropriate for a tutorial.
