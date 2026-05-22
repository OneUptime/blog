# Validation Summary: How to Configure Custom Headers at Istio Ingress Gateway

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio Ingress Gateway
- Kubernetes custom resources
- VirtualService
- EnvoyFilter
- Envoy HTTP header manipulation
- CORS
- istioctl
- curl
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy HTTP route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy common types API reference for HeaderValueOption: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto.html
- Envoy tracing architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy HTTP/1.1 header casing documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/header_casing

## Issues Found
- The post said Istio `add` creates duplicate headers. Istio documents `add` as appending values, and Envoy may comma-concatenate or add another header-map entry depending on the header. Updated the wording to describe appended and multi-value behavior instead of always duplicate headers.
- The EnvoyFilter examples used the deprecated Envoy `append` field. Updated them to `append_action: OVERWRITE_IF_EXISTS_OR_ADD`, which is the current replacement for overwriting existing header values.
- The request ID section said Envoy generates `x-request-id` automatically without qualification. Updated it to note that Envoy generates the header when request ID generation is enabled and the request lacks one.
- The forwarded headers example used `%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%` as `x-real-ip` in a load-balancer scenario. That value is only the immediate downstream peer, so the example now uses `%REQ(x-envoy-external-address)%` and adds a note about trusted hop settings.
- The header casing pitfall described lowercasing only for HTTP/2. Updated it to reflect that HTTP header field names are case-insensitive, HTTP/2 requires lowercase names, and Envoy normalizes HTTP/1.1 header keys unless HTTP/1 casing behavior is configured.

## Review Notes
- All YAML snippets were parsed successfully after the edits.
- The `kubectl logs ... | grep headers` command is environment-specific and may not show application request headers unless the workload logs them, but the command syntax itself is valid.
