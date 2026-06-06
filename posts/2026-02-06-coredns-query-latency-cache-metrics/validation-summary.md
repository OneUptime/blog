# Validation Summary: How to Monitor CoreDNS Query Latency, Cache Hit Rates, and DNS Request Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS
- Kubernetes DNS
- OpenTelemetry Collector
- Prometheus metrics scraping
- DNS monitoring and alerting

## Sources Consulted
- CoreDNS Prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Prometheus Kubernetes service discovery configuration: https://prometheus.io/docs/prometheus/3.2/configuration/configuration/
- Kubernetes CoreDNS documentation: https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post recommended `coredns_cache_misses_total` for cache hit-rate calculation. CoreDNS marks this metric as deprecated and recommends deriving misses from cache hits and requests counters. Updated the cache metrics list, cache hit-rate formula, transform example, and alerting note to use `coredns_cache_requests_total` with `coredns_cache_hits_total`.
- The post listed deprecated CoreDNS forward metrics such as `coredns_forward_requests_total`, `coredns_forward_responses_total`, `coredns_forward_request_duration_seconds`, and `coredns_forward_healthcheck_failures_total`. Updated the request, latency, response, and health check references to the current `coredns_proxy_*` metrics with `proxy_name="forward"`, while keeping non-deprecated `coredns_forward_max_concurrent_rejects_total` and `coredns_forward_healthcheck_broken_total`.
- The Collector metric filter included `coredns_forward_.*` but would not retain the current `coredns_proxy_*` forward metrics. Added `coredns_proxy_.*` to the filter include list.

## Review Notes
The Kubernetes pod discovery, `kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide` command, OpenTelemetry Collector processor structure, and CoreDNS Prometheus metrics endpoint details are consistent with the consulted documentation. The static target examples are syntactically valid, but production Kubernetes scraping may also need RBAC and network access from the Collector to CoreDNS pods.
