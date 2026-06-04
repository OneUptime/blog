# Validation Summary: How to Tune CoreDNS Cache Settings for High-QPS Kubernetes Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS cache plugin
- CoreDNS kubernetes plugin
- CoreDNS forward plugin
- Prometheus Operator ServiceMonitor and PrometheusRule
- dnsperf
- NodeLocal DNSCache

## Sources Consulted
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS Corefile syntax documentation: https://coredns.io/2017/07/23/corefile-explained/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- DNS-OARC dnsperf documentation: https://www.dns-oarc.net/tools/dnsperf
- dnsperf man page: https://www.mankier.com/1/dnsperf
- Prometheus Operator ServiceMonitor API reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/ServiceMonitor/v1
- Prometheus Operator PrometheusRule API reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1

## Issues Found
- Corrected the description of `cache 30`. CoreDNS treats this as a maximum cache TTL and still respects lower record TTLs; it does not cache every answer for exactly 30 seconds.
- Corrected denial-cache wording. CoreDNS `denial` caching applies to denial-of-existence responses such as NXDOMAIN/NODATA; SERVFAIL is handled by the separate `servfail` cache option.
- Corrected `prefetch` explanations. The second argument is the popularity gap duration, not an expiry window; the percentage controls when remaining TTL drops below that threshold.
- Added a note that configured cache capacities are rounded down to a multiple of 256, matching CoreDNS cache capacity behavior.
- Corrected serve-stale wording. CoreDNS serves expired entries with TTL 0 and refreshes them according to the configured/default refresh mode; it is not only triggered after an upstream failure.
- Fixed the zone-specific Corefile example to use a multi-zone server block for `cluster.local`, `in-addr.arpa`, and `ip6.arpa`.
- Removed the invalid `ttl 30 10` directive and replaced the stampede guidance with valid CoreDNS mechanisms: bounded Kubernetes TTLs, prefetch, serve-stale behavior, and staggered rollouts.
- Updated cache hit-rate examples and alerts to use `coredns_cache_requests_total`; `coredns_cache_misses_total` is deprecated in current CoreDNS documentation.
- Replaced the nonexistent `coredns_cache_size` alert with an eviction-rate alert using `coredns_cache_evictions_total`.
- Corrected the benchmarking section to state that `dnsperf` reports throughput and latency, while cache hit rate should be read from CoreDNS metrics.
- Softened overbroad performance and DNS lookup claims that were not generally guaranteed.

## Review Notes
The examples remain intentionally generic. Operators should still validate CoreDNS Corefiles against the CoreDNS version bundled with their Kubernetes distribution or managed Kubernetes provider before applying them in production.
