# Validation Summary: How to Handle Large Headers Through Istio Proxy

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- EnvoyFilter
- HTTP/1.1 and HTTP/2 headers
- Kubernetes CLI commands
- istioctl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy response code details: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/response_code_details

## Issues Found
- The description mentioned buffer sizes, but the post did not configure buffer sizes. Changed it to mention header size limits and connection manager settings.
- The default limits list said initial connection window size affects HTTP/2 header handling. HTTP/2 flow-control windows affect data flow, not header size limits. Replaced this with HTTP/2 codec limits for individual header fields.
- The sample 431 access log used `via_upstream`, which indicates an upstream-generated response rather than an Envoy local header rejection. Changed it to `http1.headers_too_large`.
- The post used `istioctl proxy-config stats`, which is not a current documented `istioctl proxy-config` subcommand. Replaced it with the Istio-documented `pilot-agent request GET stats` command through `kubectl exec`.
- The post told readers to look for `downstream_rq_too_large` and `http1.response_flood`, but those counters relate to oversized buffered bodies and response flooding, not request header-size rejection. Replaced them with relevant access-log response details and the `http2.header_overflow` codec counter.
- The HTTP/2 example used `max_header_list_size`, which is not a current Envoy `Http2ProtocolOptions` field. Replaced it with `max_header_field_size_kb` and clarified that `max_request_headers_kb` still controls aggregate request header size.
- The mesh-wide EnvoyFilter explanation assumed `istio-system` is always the root namespace. Clarified that this is commonly true but depends on `meshConfig`.

## Review Notes
The EnvoyFilter examples use `networking.istio.io/v1alpha3`, which is still the documented EnvoyFilter API version. The HTTP/2 `max_header_field_size_kb` field is current in Envoy documentation, but operators should confirm their Istio release includes an Envoy version that supports it.
