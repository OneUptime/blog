# Validation Summary: How to Handle Prometheus Metric Scraping in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Prometheus
- Envoy sidecar metrics
- Kubernetes service discovery and pod annotations
- Prometheus scrape configuration
- Istio mutual TLS

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping task: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio MeshConfig and ProxyStatsMatcher reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus querying basics and staleness behavior: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post described all mTLS-enabled mesh traffic as blocking plain HTTP scrapes and implied that Prometheus only needed a sidecar to scrape through mTLS. I changed this to specifically describe STRICT mTLS for application metric endpoints and updated the Prometheus sidecar guidance to use Istio-issued certificates while disabling sidecar traffic interception, matching Istio's documented approach.
- The Envoy stats scrape example filtered on the `istio-proxy` container name and rewrote every matching target to port 15090, which can create duplicate targets when pod service discovery emits multiple container ports. I changed it to filter on container port names ending in `-envoy-prom`, which matches Istio's official scrape configuration.
- The inbound port exclusion annotation used `traffic.istio.io/excludeInboundPorts`, which is not the supported sidecar traffic annotation. I changed it to `traffic.sidecar.istio.io/excludeInboundPorts`.
- The stale metrics note said Prometheus keeps stale metrics for 5 minutes by default. I changed it to distinguish staleness markers from the default 5-minute query lookback behavior.

## Review Notes
- The post is now technically accurate against current Istio, Prometheus, and Kubernetes documentation. `kubectl` was not installed locally in this environment, so kubectl command syntax was checked against official Kubernetes documentation instead of local `--help` output.
