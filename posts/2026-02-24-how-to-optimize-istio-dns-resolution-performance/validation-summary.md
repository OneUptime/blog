# Validation Summary: How to Optimize Istio DNS Resolution Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DNS proxying
- Kubernetes DNS and Pod `dnsConfig`
- CoreDNS configuration and Prometheus metrics
- Kubernetes HPA
- Istio `DestinationRule` connection pooling
- Linux resolver behavior

## Sources Consulted
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio 1.25 Change Notes: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/
- Istio `pilot-agent` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS prometheus plugin: https://coredns.io/plugins/metrics/
- Linux `resolv.conf` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The IstioOperator example used deprecated `ISTIO_META_DNS_AUTO_ALLOCATE` in `proxyMetadata`. Changed it to `values.pilot.env.PILOT_ENABLE_IP_AUTOALLOCATE` and noted the Istio 1.25+ deprecation.
- The DNS proxy verification command used a non-documented `/dns_resolve/...` endpoint. Replaced it with checking DNS metrics on Istio's telemetry endpoint.
- The `/etc/resolv.conf` example showed `ndots:5` without the required `options` keyword. Changed it to `options ndots:5`.
- The post said all search-domain expansions for `my-service` consume resources even when the first expansion succeeds. Clarified that resolvers can stop after a successful early expansion, while later failed expansions still add overhead.
- The external FQDN recommendation said to always use trailing dots. Qualified it with "where your client library accepts them" because some application protocols or clients may not handle trailing-dot hostnames as intended.
- The CoreDNS Corefile omitted the `prometheus :9153` plugin while later recommending scraping CoreDNS metrics. Added the plugin to make the metrics command consistent.
- The CoreDNS cache explanation implied `cache 60` always caches for exactly 60 seconds. Clarified that it caches for up to 60 seconds, subject to record TTLs.
- The CoreDNS metrics command executed `wget` inside the CoreDNS container, which is not reliably available in minimal CoreDNS images. Replaced it with `kubectl port-forward` plus local `curl`.
- The CoreDNS cache hit-rate PromQL used deprecated `coredns_cache_misses_total`. Replaced the denominator with `coredns_cache_requests_total`.
- The DestinationRule example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are general operational guidance; exact commands may still vary by cluster distribution, CoreDNS deployment naming, Istio install method, and container image tooling.
