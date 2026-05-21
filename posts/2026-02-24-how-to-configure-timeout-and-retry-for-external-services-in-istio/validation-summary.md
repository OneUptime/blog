# Validation Summary: How to Configure Timeout and Retry for External Services in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes custom resources
- ServiceEntry
- VirtualService
- DestinationRule
- HTTP timeouts and retries
- Prometheus metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Envoy router filter retry and timeout documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats

## Issues Found
- The original HTTPS external-service examples used HTTP `VirtualService` timeout and retry rules directly against ServiceEntry port 443 with protocol `HTTPS`. Istio applies HTTP routes to HTTP/HTTP2/gRPC ServiceEntry ports, so HTTP timeout and retry policy cannot inspect application HTTPS traffic sent directly through TLS passthrough. I changed the examples to use an HTTP ServiceEntry port with `targetPort: 443`, added a `DestinationRule` with `tls.mode: SIMPLE`, and updated route ports and example Envoy cluster names to port 80 so the sidecar can apply HTTP policy while originating TLS upstream.
- The retry backoff example described configuring backoff but used `retryRemoteLocalities: true`, which controls retry locality behavior rather than delay between retries. I replaced it with `backoff: 100ms` and clarified the default Envoy backoff behavior.
- The best-practices section said retries can continue indefinitely without an overall timeout. Istio retry attempts are bounded by the configured retry count, although individual attempts may wait longer than intended without `timeout` and `perTryTimeout`. I corrected that explanation.

## Review Notes
The examples remain generic and assume matching ServiceEntry and DestinationRule resources exist for each external host. For applications that already send HTTPS directly to the external API, Istio cannot apply these HTTP-level policies unless traffic is changed to use TLS origination or routed through a component that terminates TLS.
