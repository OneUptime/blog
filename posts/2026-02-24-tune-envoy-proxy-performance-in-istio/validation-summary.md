# Validation Summary: How to Tune Envoy Proxy Performance in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- IstioOperator
- DestinationRule
- Sidecar
- EnvoyFilter
- Envoy admin statistics

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference and configuration scoping docs: https://istio.io/latest/docs/reference/config/networking/sidecar/ and https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio protocol selection docs: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DNS proxying docs: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio MeshConfig API source for protocol detection and Prometheus merge fields: https://raw.githubusercontent.com/istio/api/master/mesh/v1alpha1/config.proto
- Envoy admin interface and statistics docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html and https://www.envoyproxy.io/docs/envoy/latest/operations/stats_overview
- Envoy overload manager docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/operations/overload_manager/overload_manager

## Issues Found
- The curl timing output label had a typo, `time_starttlt`. Changed it to `time_starttransfer` to match curl's `time_starttransfer` variable.
- The post described `localhost:15000/stats | grep upstream_rq_time` as Istio p50/p95/p99 metrics. Changed this to Envoy histogram stats and used `stats?histogram_buckets=detailed`, which exposes percentile summaries in Envoy admin output.
- The post claimed Istio defaults proxy concurrency to 2. Current Istio ProxyConfig docs state that unset concurrency is automatically determined from CPU limits. Updated the text accordingly.
- The post said `concurrency: 0` uses CPUs available to the container. Current Istio docs state that `0` uses all cores on the machine. Updated the explanation and made the Kubernetes example use Istio sidecar resource annotations instead of defining an injected `istio-proxy` container directly.
- The post said `kubectl top pod --containers` checks Envoy throttling. That command reports current CPU and memory usage, not CFS throttling. Updated the text to describe what the command actually shows.
- The HTTP/2 section said Envoy uses HTTP/2 between sidecars for mTLS connections. mTLS does not imply HTTP/2; Istio detects or is explicitly configured for HTTP/2 and gRPC protocols. Updated the explanation.
- The protocol sniffing example used `protocolDetectionTimeout: 0s` to disable sniffing. The Istio API documents this as disabling the detection timeout, not protocol detection itself. Replaced the example with explicit Kubernetes Service port protocol naming using `appProtocol`.
- The stats section implied `proxyStatsMatcher.inclusionPrefixes` reduces the default metric set. Istio documents this as adding custom Envoy stats beyond the default subset. Updated the explanation to avoid that incorrect claim.
- The DNS proxy example included deprecated `ISTIO_META_DNS_AUTO_ALLOCATE`. Removed it and kept the current sidecar-mode DNS capture setting.
- The monitoring section used `server.days_until_first_cert_expiring` as part of an overloaded-worker check. That stat is certificate-expiration related, not worker overload. Replaced it with an overload manager stats grep that is meaningful when overload actions are configured.

## Review Notes
The remaining examples are version-sensitive because Istio APIs evolve, especially EnvoyFilter patches and alpha sidecar annotations. The reviewed content is aligned with current Istio 1.30 documentation and Envoy latest documentation as of 2026-05-21.
