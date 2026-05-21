# Validation Summary: How to Debug Why a VirtualService Route is Not Matching

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio sidecar proxy configuration
- Envoy route matching and access logs
- Kubernetes services and kubectl
- istioctl diagnostics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio proxy-config diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio Envoy access log documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy route matching API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy header sanitizing documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/header_sanitizing.html

## Issues Found
- The VirtualService example used `networking.istio.io/v1beta1`. Updated it to `networking.istio.io/v1` to match current Istio documentation examples and the stable API.
- The URI matching section said an `exact` match requires the complete path including query parameters. Envoy route path matching removes the query string, and Istio exposes `queryParams` for query parameter matching, so this was corrected.
- The access log example checked the destination workload proxy even though the relevant outbound route match is usually visible in the source client or gateway proxy. Updated the command to check `my-client`.
- The access log statement implied route names are always present. Clarified that access logging must be enabled and the format must include `%ROUTE_NAME%`, which Istio's default access log format does.
- The header matching section said headers starting with `x-envoy-` are stripped by Envoy by default. Envoy sanitizes many internal `x-envoy-*` headers depending on context, but the blanket statement was too broad, so it was corrected.
- The conflicting VirtualServices section said multiple VirtualServices targeting the same host are merged. Istio documents host merging for gateway-bound VirtualServices only; host merging is not supported for sidecars, so the text now distinguishes those cases.

## Review Notes
The commands and configuration snippets are generally accurate for current Istio and Kubernetes usage. The post intentionally uses placeholder workload, namespace, service, and gateway names, so readers still need to substitute values from their own cluster.
