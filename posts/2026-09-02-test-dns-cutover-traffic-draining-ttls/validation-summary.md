# Validation Summary: How to Test DNS Cutover, Traffic Draining, and TTLs Before a Regional Failover

## Status
validated

## Post Type
Operational Guide / Disaster Recovery Runbook

## Technologies Covered
- DNS resource records, recursive caching, TTLs, and negative caching
- DNS serve-stale behavior
- IPv4/IPv6 address selection and split-horizon DNS
- BIND `dig`
- curl `--resolve`, HTTP authority/Host handling, TLS SNI, and certificate validation
- TCP, HTTP/1.1 keepalive, HTTP/2 multiplexing, WebSockets, and database connection pools
- Amazon Route 53 failover and weighted routing
- Amazon Application Recovery Controller (ARC) routing-control safety rules
- Regional disaster recovery, write fencing, RPO, RTO, rollback, and failback

## Sources Consulted
- RFC 1035, DNS implementation and TTL semantics: https://www.rfc-editor.org/rfc/rfc1035.html
- RFC 2181, DNS TTL and RRset clarifications: https://www.rfc-editor.org/rfc/rfc2181.html
- RFC 2308, negative caching: https://www.rfc-editor.org/rfc/rfc2308.html
- RFC 8767, serving stale DNS data: https://www.rfc-editor.org/rfc/rfc8767.html
- RFC 9803 Section 5.2, lowering TTLs before a planned change: https://www.rfc-editor.org/rfc/rfc9803.html#section-5.2
- RFC 9199, operational DNS cache and TTL considerations: https://www.rfc-editor.org/rfc/rfc9199.html
- RFC 6724 and RFC 8305, destination-address selection and A/AAAA connection behavior: https://www.rfc-editor.org/rfc/rfc6724.html and https://www.rfc-editor.org/rfc/rfc8305.html
- RFC 8484, DNS over HTTPS: https://www.rfc-editor.org/rfc/rfc8484.html
- RFC 9293, TCP connection semantics: https://www.rfc-editor.org/rfc/rfc9293.html
- RFC 9112, HTTP/1.1 persistent connections: https://www.rfc-editor.org/rfc/rfc9112.html
- RFC 9113, HTTP/2 persistent connections and multiplexing: https://www.rfc-editor.org/rfc/rfc9113.html
- RFC 6455 and RFC 6066, WebSockets and TLS SNI: https://www.rfc-editor.org/rfc/rfc6455.html and https://www.rfc-editor.org/rfc/rfc6066.html
- ISC BIND 9 `dig` manual: https://bind9.readthedocs.io/en/stable/manpages.html#dig-dns-lookup-utility
- curl command-line manual, `CURLOPT_RESOLVE`, and certificate verification documentation: https://curl.se/docs/manpage.html#--resolve, https://curl.se/libcurl/c/CURLOPT_RESOLVE.html, and https://curl.se/docs/sslcerts.html
- Oracle Java networking properties for positive, negative, and stale DNS caching: https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/doc-files/net-properties.html
- Amazon Route 53 failover record fields and health-based record selection: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html and https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- Amazon Route 53 weighted records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html
- AWS Elastic Load Balancing target deregistration: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DeregisterTargets.html
- PostgreSQL failover and old-primary fencing guidance: https://www.postgresql.org/docs/current/warm-standby-failover.html
- Amazon Aurora Global Database disaster-recovery and write-fencing guidance: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- Microsoft Azure failover and failback concepts: https://learn.microsoft.com/en-us/azure/reliability/concept-failover-failback
- Amazon Application Recovery Controller routing-control safety rules: https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.safety-rules.html

## Issues Found
- The opening stated that established connections do not consult DNS until reconnecting. Connections themselves are not rerouted by DNS, but an application can refresh DNS or open additional connections while an old connection remains active. The text now states the operationally precise rule: a DNS change does not reroute established connections, and new answers are generally used for new or replacement connections.
- The curl example passed the literal token `RECOVERY_IP` to `--resolve`, but curl requires a numeric address and rejects that literal entry. The command now expands a required `RECOVERY_IP` shell variable and identifies it as a numeric IPv4 address that the operator must set.
- The Route 53 paragraph presented the both-unhealthy selection behavior without saying that health must be evaluated for both failover records. It now documents the full behavior: with health evaluation on both records, Route 53 returns the primary if both are unhealthy; without health evaluation on the secondary, Route 53 treats that record as eligible and returns it when the primary is unhealthy, even if the secondary endpoint is actually unhealthy. The post's Route 53 reference was changed to the official health-based record-selection documentation.
- The rollback paragraph said rollback has “the same caching delay” as the forward change. Actual elapsed tails can differ by remaining cache lifetime, client cohort, TTL, and serve-stale behavior. It now says rollback is subject to the same cache-expiry constraints.
- The ARC reference used the older “AWS Application Recovery Controller” product name. Its link text now uses the current official name, “Amazon Application Recovery Controller (ARC).”

No other syntax, command-option, deprecation, configuration, protocol, or link issues were found.

## Review Notes
- The `dig` server names and service names are illustrative example-domain values and must be replaced with real names. The documented `@server name type +noall +answer` form is valid. `+norecurse` can optionally make the authoritative-server probe stricter, but its omission is not an error.
- The curl example is an interactive connectivity probe. If it becomes an automated acceptance gate, consider `--fail-with-body` so HTTP 4xx/5xx responses produce a nonzero exit status.
- The curl example explicitly requests an IPv4 address. curl requires brackets around a literal IPv6 address used with `--resolve`.
- DNS weighting controls authoritative answer selection, not an exact percentage of end-user requests; resolver caching can skew request-level traffic. The post already states this caveat correctly.
- No versions are pinned in the post, and no deprecated APIs or options are used.
