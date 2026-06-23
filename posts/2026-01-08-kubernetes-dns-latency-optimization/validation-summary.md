# Validation Summary: How to Reduce DNS Latency in High-Traffic Kubernetes Clusters

## Status
validated

## Post Type
Guide / Tutorial (operational how-to with configuration and code)

## Technologies Covered
- Kubernetes (kube-dns, kubelet, Pods, Deployments, StatefulSets, DaemonSets)
- CoreDNS (Corefile, cache plugin, forward plugin, kubernetes plugin)
- NodeLocal DNSCache (k8s-dns-node-cache)
- cluster-proportional-autoscaler
- Prometheus / PromQL and Grafana
- resolv.conf DNS options (ndots, single-request-reopen, timeout, attempts)
- Application DNS/connection pooling: Java/JVM, Go (net.Resolver, http.Transport), Node.js (dns), Python (requests, socket)

## Sources Consulted
- CoreDNS cache plugin documentation — https://coredns.io/plugins/cache/ (prefetch AMOUNT/DURATION/PERCENTAGE semantics; success/denial CAPACITY/TTL/MINTTL)
- CoreDNS forward plugin documentation — https://coredns.io/plugins/forward/ (max_concurrent, prefer_udp, force_tcp)
- Kubernetes NodeLocal DNSCache docs and upstream manifest — kubernetes/cluster/addons/dns/nodelocaldns
- Kubernetes DNS for Services/Pods & Pod DNS Config (dnsPolicy, dnsConfig options/searches, ndots)
- Go net package (net.Resolver, net.Dialer, http.Transport) and Node.js dns module docs
- Java networking properties (networkaddress.cache.ttl / negative.ttl)

## Issues Found
1. **Incorrect CoreDNS `prefetch` explanation (Strategy 2, "Cache Configuration Explained").** The inline comment for `prefetch 10 1m 10%` read: "Prefetch when TTL < 10s, queried in last 1m, > 10% of TTL remaining." This is wrong on two counts: the `10` is the query AMOUNT (an item must be queried at least 10 times within the DURATION to be considered popular), not a "TTL < 10s" threshold; and the `10%` means CoreDNS prefetches when **less than** 10% of the original TTL remains, not "> 10% remaining." Corrected the comment to: "Prefetch popular items: queried >=10 times within 1m, refresh when <10% of TTL remains."

2. **Missing `context` import in the Go `net.Resolver` snippet (Strategy 4).** The explicit import block listed only `net` and `time`, but the `Dial` closure uses `context.Context`, so the snippet would not compile. Added `"context"` to the import block.

## Review Notes
- The `success 9984 300 30` / `denial 9984 60 5` cache parameters and their comments (capacity, TTL, min-TTL) are correct.
- CoreDNS Prometheus metric names used in the monitoring section (`coredns_dns_requests_total`, `coredns_cache_hits_total`, `coredns_cache_misses_total`, `coredns_dns_request_duration_seconds_bucket`, `coredns_forward_request_duration_seconds_bucket`, `coredns_dns_responses_total`) are all valid.
- The NodeLocal DNS Corefile uses `bind 169.254.20.10` only, whereas the upstream manifest binds both the link-local IP and the kube-dns cluster IP (`bind __PILLAR__LOCAL__DNS__ __PILLAR__DNS__SERVER__`). The simplified form still functions for the link-local listener; not corrected as it is not an error, just a reduced configuration.
- Image tags (`registry.k8s.io/dns/k8s-dns-node-cache:1.22.28`, `registry.k8s.io/cpa/cluster-proportional-autoscaler:1.8.9`) use correct registry paths; readers should pin to the latest patch versions available for their cluster version over time.
- Node.js caveat (not an error): `Resolver.setServers()` affects `dns.resolve*` calls, but Node's HTTP stack uses `dns.lookup` (getaddrinfo), so pointing the resolver at NodeLocal DNS does not automatically redirect outbound HTTP DNS resolution. The shown code is valid as written.
- `-Dsun.net.inetaddr.ttl` / `-Dsun.net.inetaddr.negative.ttl` are legacy JVM fallback properties; `networkaddress.cache.ttl` (security property) is the preferred mechanism, which the post also shows. Both are valid.
