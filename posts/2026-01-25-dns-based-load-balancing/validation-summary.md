# Validation Summary: How to Configure DNS-Based Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS load balancing
- BIND 9
- PowerDNS Recursor Lua scripting
- Python
- AWS Route 53
- dnspython
- dig
- dnstop

## Sources Consulted
- BIND 9 Configuration Reference, RRset ordering: https://bind9.readthedocs.io/en/latest/reference.html
- BIND 9 Manual Pages, dig usage: https://bind9.readthedocs.io/en/stable/manpages.html
- RFC 2136, RRset definition: https://datatracker.ietf.org/doc/html/rfc2136
- PowerDNS Recursor Lua scripting overview: https://doc.powerdns.com/recursor/lua-scripting/index.html
- PowerDNS Recursor Lua hook documentation: https://doc.powerdns.com/recursor/lua-scripting/hooks.html
- PowerDNS Recursor Lua script configuration: https://doc.powerdns.com/recursor/lua-scripting/configure.html
- PowerDNS Recursor YAML settings, lua_dns_script and lua_maintenance_interval: https://doc.powerdns.com/recursor/yamlsettings.html
- PowerDNS Recursor DNSName comparison documentation: https://doc.powerdns.com/recursor/lua-scripting/dnsname.html
- Amazon Route 53 ResourceRecordSet API Reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- Amazon Route 53 health checks documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html
- Boto3 Route 53 create_health_check reference: https://docs.aws.amazon.com/boto3/latest/reference/services/route53/client/create_health_check.html
- dnspython Resolver documentation: https://dnspython.readthedocs.io/en/latest/resolver-class.html

## Issues Found
- The weighted DNS section recommended duplicating identical A records in a BIND zone file. That is not a reliable or correct weighting mechanism because DNS answers are RRsets of distinct resource records, and Route 53 weighted routing requires separate weighted record sets with unique SetIdentifier values. I changed the example to use Route 53 weighted records and noted that plain BIND zone files do not provide true weighted round-robin this way.
- The PowerDNS Lua example declared a health check function but never called it, so backend health never changed. I added a PowerDNS Recursor maintenance() callback that refreshes backend health periodically.
- The PowerDNS configuration example used /etc/pdns/pdns.conf with launch=, which is for PowerDNS Authoritative configuration, while the shown preresolve() Lua hook is a PowerDNS Recursor feature. I changed the example to current Recursor YAML syntax in /etc/pdns/recursor.yml and added lua_maintenance_interval.
- The PowerDNS example described an HTTP health endpoint but only opened a TCP connection. I adjusted the wording and variables to describe a TCP health check port.
- The PowerDNS Lua script depends on LuaSocket for require("socket"). I added that prerequisite to the surrounding text.
- The client-side caching example said socket.gethostbyname uses caching. Python's socket resolver follows the system resolver path, but caching depends on the operating system and resolver services. I changed the comment to say it may be cached by nscd, systemd-resolved, or a local DNS forwarder.

## Review Notes
- The BIND round-robin example is technically valid, but BIND 9 documentation notes that current rrset-order cyclic behavior offsets ordering based on the query ID, so observed order may not rotate in a simple sequential pattern in every test setup.
- PowerDNS Recursor 5.2.0 and later expects YAML configuration by default; old-style recursor.conf settings require explicit enablement and are expected to be removed in a future release.
- DNS failover remains limited by resolver and client caching even with low TTLs; this is accurately described in the post.
