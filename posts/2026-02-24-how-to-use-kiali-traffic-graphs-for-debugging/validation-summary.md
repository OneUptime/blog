# Validation Summary: How to Use Kiali Traffic Graphs for Debugging

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kiali traffic graph
- Istio service mesh
- Istio VirtualService
- Istio DestinationRule
- Istio AuthorizationPolicy
- Kubernetes Service port protocol selection
- Envoy proxy behavior

## Sources Consulted
- Kiali Topology documentation: https://kiali.io/docs/features/topology/
- Kiali Graph FAQ: https://kiali.io/docs/faq/graph/
- Kiali Health documentation: https://kiali.io/docs/features/health/
- Kiali Console Customization documentation: https://kiali.io/docs/configuration/console-customization/
- Kiali Performance and Scalability FAQ: https://kiali.io/docs/faq/performance/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- MDN HTTP 426 Upgrade Required reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/426

## Issues Found
- The post referred to a Kiali graph display option as "Unused Nodes." Current Kiali documentation uses idle-node/idle-edge terminology, so the wording was changed to "Idle Nodes or Idle Edges."
- The section about services with zero traffic said to enable "Unused Nodes." This was changed to "Idle Nodes" or "Idle Edges" to match Kiali's current graph display behavior.
- The latency side-panel description implied that Kiali always presents P50, P95, and P99 breakdowns on graph edges. Kiali documents Response Time edge labels as 95th percentile response times and describes side-panel response-time charts more generally, so the wording was adjusted.
- The 426 explanation was too specific to HTTP/1.0 and HTTP/2. It was corrected to the standard meaning of HTTP 426 and tied back to Istio's explicit protocol selection behavior for HTTP/2 and gRPC services.
- The Find/Hide examples used outdated or unsupported-looking expressions such as `%healthy = true` and `%error > 0`. These were updated to current Kiali-style expressions: `healthy`, `name = reviews`, and `! healthy`.

## Review Notes
The VirtualService weighted routing example is structurally correct, but it is intentionally partial YAML. In a real manifest it would need the usual `apiVersion`, `kind`, `metadata`, `spec.hosts`, and matching DestinationRule subset definitions.
