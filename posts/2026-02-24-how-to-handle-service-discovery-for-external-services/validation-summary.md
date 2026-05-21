# Validation Summary: How to Handle Service Discovery for External Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio VirtualService
- Istio egress traffic management
- Kubernetes
- Prometheus metrics

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Accessing External Services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Understanding DNS: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post implied that ServiceEntry gives full HTTP telemetry, traces, retries, and timeouts for all external traffic. I narrowed this to service-level telemetry for opaque traffic and HTTP-level controls for HTTP traffic, including HTTP traffic where Istio originates TLS.
- The traffic management example applied HTTP retries and timeouts to an application-originated HTTPS/TLS ServiceEntry. I changed the example to use an HTTP ServiceEntry port with `targetPort: 443`, a port-level `tls.mode: SIMPLE` DestinationRule, and a VirtualService route to port 80 so Istio can see HTTP and originate TLS.
- The TLS origination example routed to destination port 443 while the DestinationRule TLS policy matched port 80, and it did not set `targetPort: 443`. I corrected the ServiceEntry and VirtualService to match Istio's documented TLS origination pattern.
- The database subset section said DestinationRule could route reads to replicas and writes to the primary. I changed this to explain that DestinationRule defines subsets for explicit routing or policies, and that Istio does not inspect PostgreSQL queries to infer read/write intent.
- The DNS section described Istio DNS proxying as caching ServiceEntry DNS resolution. I corrected this to distinguish proxy-side ServiceEntry DNS resolution from DNS proxying for application DNS queries.

## Review Notes
The post remains a valid Istio ServiceEntry guide after correction. Future improvements could mention `REGISTRY_ONLY` outbound traffic policy and the newer `DYNAMIC_DNS` resolution mode for wildcard egress use cases, but those are not required for the examples in this article.
