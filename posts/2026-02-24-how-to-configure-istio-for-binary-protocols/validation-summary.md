# Validation Summary: How to Configure Istio for Binary Protocols

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Services and Deployments
- Envoy
- EnvoyFilter
- TCP and binary protocols
- Prometheus metrics
- Istio VirtualService, DestinationRule, and AuthorizationPolicy resources

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio TCP metrics task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy direct response network filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/direct_response_filter
- Envoy Wasm network filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/wasm_filter
- Kubernetes Deployment reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Istio networking examples used `networking.istio.io/v1beta1`. Istio promoted networking APIs to `v1`, and current documentation examples use `networking.istio.io/v1`, so the VirtualService and DestinationRule snippets were updated to `v1`.
- The Deployment snippet for the Prometheus metrics endpoint was missing the required `spec.selector` field for an `apps/v1` Deployment. Added `spec.selector.matchLabels` and matching pod template labels.
- The EnvoyFilter section suggested `envoy.filters.network.direct_response` or Lua for length-prefixed binary protocol handling. Envoy's direct response network filter only sends an immediate fixed response on new connections, and Envoy's Lua filter is an HTTP filter. Updated the text to recommend a custom native or Wasm network filter for protocol-aware binary handling, while clarifying the limited purpose of `direct_response`.

## Review Notes
- Istio also supports explicit protocol selection with Kubernetes `appProtocol` on Kubernetes 1.18 and later, and `appProtocol` takes precedence over the port name when both are set. The post's `tcp-` port naming guidance remains technically correct.
- `sourceLabels` in TCP VirtualService matches are selectors for source workloads, not packet-time protocol inspection. The example remains valid for mesh traffic, but this distinction is worth keeping in mind for future edits.
