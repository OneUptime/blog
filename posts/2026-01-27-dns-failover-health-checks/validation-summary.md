# Validation Summary: How to Build DNS Failover with Health Checks

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- DNS failover
- Health checks
- AWS Route 53
- Cloudflare Load Balancing
- PowerDNS Lua records
- CoreDNS
- HAProxy
- Python with dnspython and requests
- Linux iptables and dig

## Sources Consulted
- Amazon Route 53 HealthCheckConfig API Reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- Amazon Route 53 ResourceRecordSet API Reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- Amazon Route 53 health check behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- Cloudflare Load Balancers API Reference: https://developers.cloudflare.com/api/resources/load_balancers/
- Cloudflare Load Balancing quickstart: https://developers.cloudflare.com/load-balancing/get-started/quickstart/
- Cloudflare Load Balancing steering policies: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/
- PowerDNS Authoritative Server Lua records: https://doc.powerdns.com/authoritative/lua-records/
- PowerDNS Lua record functions: https://doc.powerdns.com/authoritative/lua-records/functions.html
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS setup documentation: https://coredns.io/manual/setups/
- HAProxy health check documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Issues Found
- The post stated that HTTPS health checks verify SSL/TLS certificates. That is not universally true, and Route 53 explicitly does not fail HTTPS checks for invalid or expired certificates. Updated the wording to distinguish TLS transport checks from provider-specific certificate validation.
- The failover overview overstated DNS failover timing as seconds. Updated it to account for health check interval, failure threshold, TTL, and resolver cache behavior.
- The AWS Route 53 health check example was labeled as HTTP while using `Type: "HTTPS"`. Updated the comment to say HTTPS and added `EnableSNI: true` for host-name based HTTPS checks.
- The examples used documentation IP ranges without warning that provider health checks need reachable endpoints. Added notes to replace documentation IPs with reachable public endpoints or origins.
- The Cloudflare pool example used `notification_email`, which the current Cloudflare API marks as deprecated. Removed that field.
- The Cloudflare load balancer example used `steering_policy: "failover"`, which is not a current valid value. Changed it to `steering_policy: "off"` with ordered `default_pools` and `fallback_pool`.
- The Cloudflare steering policy list included `failover` and used `least_outstanding`; current API values use `off` for ordered default-pool failover behavior and `least_outstanding_requests` for outstanding-request steering. Updated the list.
- The PowerDNS Lua example looped over `ifurlup()` one address at a time, but `ifurlup()` falls back to supplied addresses when all are down, so the example could return an unhealthy primary instead of failing over. Replaced it with a grouped `ifurlup()` Lua record that prefers the primary group and falls back to the secondary group.
- The PowerDNS SQL example used a custom Lua function that was not actually defined in the record content. Updated the SQL to store the complete `ifurlup()` expression and used standard SQL quote escaping.
- The CoreDNS section implied CoreDNS could use the `health` and `forward` plugins for application A-record failover. Those plugins health check CoreDNS itself and upstream DNS resolvers, not web application endpoints. Reworded the section as resolver upstream failover and changed the example to a root resolver forwarding block.
- The HAProxy section described HAProxy as DNS-aware failover. HAProxy is an HTTP/TCP load balancer that can sit behind DNS; it does not provide DNS failover itself. Updated the heading and description.
- The HAProxy HTTP check used the older `option httpchk ...\r\nHost:` style. Updated the example to the current documented `http-check send` form with an explicit Host header and `http-check expect status 200`.

## Review Notes
The remaining YAML snippets for generic DNS, monitoring, alerting, and OneUptime are conceptual examples rather than vendor schemas. The DNS failover timing guidance is directionally correct, but real failover time still depends on recursive resolver TTL behavior, client DNS caching, health check interval, and provider-specific routing behavior.
