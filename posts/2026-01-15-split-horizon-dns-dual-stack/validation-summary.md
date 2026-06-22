# Validation Summary: How to Configure Split-Horizon DNS for Dual-Stack Environments

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- DNS and split-horizon DNS
- IPv4, IPv6, and dual-stack networking
- BIND 9 views, ACLs, DNSSEC, and response rate limiting
- CoreDNS plugins: bind, acl, file, forward, view, rewrite, geoip, template, prometheus, kubernetes, cache, reload, health, ready, rrl
- Kubernetes ConfigMaps and Deployments for CoreDNS
- Prometheus alerting and PromQL
- dig and dnspython-based DNS testing

## Sources Consulted
- ISC Knowledgebase: Understanding views in BIND 9, https://kb.isc.org/docs/aa-00851
- BIND 9 Configuration Reference, https://bind9.readthedocs.io/en/stable/reference.html
- ISC Knowledgebase: BIND Best Practices - Authoritative, https://kb.isc.org/docs/bind-best-practices-authoritative
- ISC Knowledgebase: DNSSEC Key and Signing Policy, https://kb.isc.org/docs/dnssec-key-and-signing-policy
- CoreDNS bind plugin, https://coredns.io/plugins/bind/
- CoreDNS acl plugin, https://coredns.io/plugins/acl/
- CoreDNS file plugin, https://coredns.io/plugins/file/
- CoreDNS view plugin, https://coredns.io/plugins/view/
- CoreDNS rewrite plugin, https://coredns.io/plugins/rewrite/
- CoreDNS geoip plugin, https://coredns.io/plugins/geoip/
- CoreDNS template plugin, https://coredns.io/plugins/template/
- CoreDNS prometheus plugin, https://coredns.io/plugins/metrics/
- CoreDNS kubernetes plugin, https://coredns.io/plugins/kubernetes/
- CoreDNS rrl external plugin, https://coredns.io/explugins/rrl/
- Kubernetes documentation: Customizing DNS Service, https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- dnspython Resolver documentation, https://dnspython.readthedocs.io/en/latest/resolver-class.html
- RFC 6724: Default Address Selection for IPv6, https://datatracker.ietf.org/doc/html/rfc6724
- Local `dig -h` output for `-b`, `+subnet`, `+short`, and `+dnssec` option validation

## Issues Found
- Removed a global BIND `response-policy` example that referenced an undefined RPZ zone in a multi-view configuration, replacing it with a note that RPZ zones must be defined in every relevant view.
- Corrected CoreDNS rate limiting from a non-existent `ratelimit 100` directive to the external `rrl` plugin syntax and noted that the CoreDNS build must include that plugin.
- Moved CoreDNS zone-file reload settings into the `file` plugin blocks, because the standalone `reload` plugin reloads the Corefile, not zone file SOA changes.
- Corrected CoreDNS `view` plugin examples to use separate server blocks, matching the documented routing model.
- Replaced unsupported `rewrite` conditions with `view`-based server block selection.
- Replaced invalid IPv6 example prefixes such as `2001:db8:corp::/48`, `2001:db8:na::50`, `2001:db8:eu::50`, and `2001:db8:apac::50` with valid documentation-prefix addresses.
- Rewrote the CoreDNS GeoIP example to use `geoip`, `metadata`, and `view` expressions with documented metadata labels instead of unsupported nested `geoip { country ... }` syntax.
- Replaced the gradual migration example that implied repeated A/AAAA records provide reliable IPv4-vs-IPv6 weighting. DNS queries for A and AAAA are separate RRsets, so the post now recommends canary hostnames, views, or policy DNS.
- Removed unsupported `per_zone_stats true` from the CoreDNS `prometheus` plugin example.
- Fixed shell and Python validation examples so IPv4 source addresses query IPv4 resolver addresses and IPv6 source addresses query IPv6 resolver addresses.
- Updated the dnspython example to pass `source=source_ip`, because the original function accepted a source IP argument but did not bind queries to it.
- Replaced a troubleshooting `dig +subnet` example with `dig -b`, because BIND `match-clients` evaluates the packet source address rather than EDNS Client Subnet.
- Corrected dual-stack best-practice guidance that suggested record ordering and repeated records as protocol steering controls.

## Review Notes
The examples still use documentation-only IP ranges (`203.0.113.0/24`, `198.51.100.0/24`, and `2001:db8::/32`) and ULA addresses for illustration. Operators must replace these with real assigned prefixes and ensure any source addresses used with `dig -b` or dnspython `source=` are configured on the test host.
