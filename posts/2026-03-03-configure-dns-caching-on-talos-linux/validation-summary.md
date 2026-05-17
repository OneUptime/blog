# Validation Summary: How to Configure DNS Caching on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- CoreDNS (cache, health, forward, kubernetes, prometheus plugins)
- Prometheus / PrometheusRule (kube-prometheus-stack CRD)
- dig / bind-tools
- Bash scripting
- Python (illustrative snippet)

## Sources Consulted
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/ and https://github.com/coredns/coredns/blob/master/plugin/cache/README.md
- CoreDNS health plugin documentation: https://coredns.io/plugins/health/ and https://github.com/coredns/coredns/blob/master/plugin/health/README.md
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Kubernetes DNS-Based Service Discovery & dnsConfig docs: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Prometheus Operator API reference (PrometheusRule, monitoring.coreos.com/v1)

## Issues Found
- The CoreDNS `health` plugin in both Corefile examples used `lazystart` as an option. This is not a valid directive — the only supported option for `health` is `lameduck DURATION`. Replaced `lazystart` with `lameduck 5s` (the value used by the standard Kubernetes CoreDNS ConfigMap) in both occurrences so the Corefiles will actually parse and load.

## Review Notes
- All `cache` plugin directives (`success`, `denial`, `prefetch`, `serve_stale`) match the documented syntax. The default per-cache capacity of 9984 (256 shards × 39 items) is correctly cited.
- The metric names used (`coredns_cache_hits_total`, `coredns_cache_misses_total`, `coredns_cache_entries`, `coredns_cache_evictions_total`) all exist. Note that `coredns_cache_misses_total` is documented as deprecated in current CoreDNS releases (the recommendation is to derive misses from `coredns_cache_requests_total` minus hits) — the alerting and hit-rate examples still work, but future-proof versions could switch to `requests_total - hits_total`.
- The ndots=5 default and the "up to 8 queries" amplification example (4 search-domain attempts × A/AAAA) is accurate for a typical Kubernetes pod with three search domains.
- The `awk '{print $6}'` parse of CoreDNS log lines matches the default `log` plugin format where field 6 is the queried name.
- Cache `success` eviction is documented as random (not LRU) — the post does not claim either, so this is not an error, just worth knowing if the section is ever expanded.
- The sidecar example uses `coredns/coredns:1.11.1`, which is a real Docker Hub tag. Note that recent CoreDNS images run as a non-root user; binding port 53 in the sidecar may require adding `CAP_NET_BIND_SERVICE` (or using a port above 1024 and rewriting resolv.conf accordingly) in some clusters. The example is illustrative and was left as-is.
- The `health` plugin is process-wide, so it can only be enabled in one Server Block. The per-domain example keeps `health` only in the `.:53` block, which is correct.
