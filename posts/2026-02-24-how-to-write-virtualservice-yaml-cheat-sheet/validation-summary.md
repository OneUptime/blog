# Validation Summary: How to Write VirtualService YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Istio VirtualService
- Istio traffic management
- Kubernetes custom resources
- YAML

## Sources Consulted
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio ingress gateway without TLS termination / SNI passthrough task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio secure gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/

## Issues Found
- The TLS routing example matched SNI on port 443 but routed to destination port 8080. Because Istio `tls` routes are for unterminated TLS traffic, that example would only work if `api-service` served TLS on port 8080. Updated the destination port to 443 to match the official SNI passthrough pattern and make the example accurate for a typical TLS backend.

## Review Notes
- The VirtualService field names and examples for HTTP routing, traffic splitting, URI and header matching, gateways, timeouts, retries, fault injection, rewrites, redirects, mirroring, CORS, header manipulation, TCP routing, TLS routing, AND/OR match behavior, and delegation were checked against the current Istio 1.30 documentation.
- Local checks: all YAML code blocks in the post parsed successfully with PyYAML, including the intentional fragment examples; `validation.json` parsed successfully with `jq`.
