# Validation Summary: How to Configure CoreDNS Cache Plugin with Custom TTL and Negative Caching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS cache plugin
- CoreDNS kubernetes plugin
- CoreDNS prometheus metrics
- Prometheus / PromQL
- kubectl

## Sources Consulted
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- Kubernetes volumes documentation for ConfigMap-backed volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post described `cache TTL` as caching all responses for the specified duration regardless of upstream TTL. Updated the explanation to state that CoreDNS treats these values as maximum TTL caps, with entries still bounded by DNS TTLs.
- The post described `success` and `denial` TTL values as fixed cache durations. Updated comments and descriptions to call them maximum TTL values.
- The post described `prefetch` arguments incorrectly as seconds remaining, check interval, and minimum hit rate. Updated the comments and explanation to match CoreDNS documentation: `AMOUNT` is the number of queries needed for popularity, `DURATION` is the maximum allowed gap between those queries, and `PERCENTAGE` is the remaining TTL threshold.
- Two examples used `prefetch ... 5%`, but CoreDNS documents valid percentages as 10% through 90%. Changed those examples to `10%`.
- The post used `coredns_cache_misses_total` directly for miss rate. CoreDNS marks that metric deprecated, so the PromQL was changed to derive misses from `coredns_cache_requests_total - coredns_cache_hits_total`.
- The post described `serve_stale` as returning expired entries only when upstream servers are unavailable. Updated it to reflect CoreDNS behavior: stale entries can be served for the configured duration while CoreDNS refreshes them, and stale responses have TTL 0.
- The post referred broadly to failed query caching. Updated wording to denial-of-existence responses, because CoreDNS `denial` cache is not a general failed-query cache.

## Review Notes
The Kubernetes manifests and kubectl commands are syntactically plausible. The Grafana dashboard ConfigMap is illustrative rather than a complete deployable Grafana dashboard resource, but the embedded PromQL examples are technically valid after the miss-rate correction.
