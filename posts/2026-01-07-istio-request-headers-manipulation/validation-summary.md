# Validation Summary: How to Manipulate Request Headers with Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio DestinationRule
- Istio Telemetry API
- Envoy HTTP routing and header manipulation
- Envoy substitution formatters
- Kubernetes YAML manifests
- `istioctl`, `kubectl`, `curl`, and `jq`

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio request routing task: https://istio.io/latest/docs/tasks/traffic-management/request-routing/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto

## Issues Found
- The response header flow diagrams implied that VirtualService response header manipulation always happens at the destination sidecar. Updated the diagrams to describe response header manipulation at the routing proxy, which matches Istio's VirtualService header operation model.
- The dynamic header section described Envoy values as "built-in variables" and added `%UPSTREAM_CLUSTER%` as a request header. Updated the wording to "substitution formatters" and moved `%UPSTREAM_CLUSTER%` to a response header, where upstream routing information is available after route selection.
- The CORS example manually added `Access-Control-*` response headers and described that as enabling CORS. Replaced it with Istio's documented `corsPolicy` fields so the example expresses CORS policy and preflight behavior through the VirtualService API.

## Review Notes
- The post uses `networking.istio.io/v1beta1`, which is still commonly accepted, but Istio v1 APIs have been stable since Istio 1.22. A future refresh could move examples to `networking.istio.io/v1`.
- YAML snippets were parsed locally with PyYAML after the edits; all 23 YAML code blocks parsed successfully.
