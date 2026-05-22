# Validation Summary: How to Configure Access Logs for TCP Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- IstioOperator meshConfig
- Envoy access logs
- Envoy TCP proxy
- Kubernetes Services
- CEL access log filters
- istioctl

## Sources Consulted
- Istio Envoy access log task documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Envoy TCP proxy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/tcp_proxy/v3/tcp_proxy.proto.html
- Envoy access log usage documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter

## Issues Found
- The introduction described gRPC streams as raw TCP workloads. Changed this to TLS passthrough connections because gRPC is HTTP/2-based and Istio can classify it as `grpc`/`http2` when configured or detected.
- The TCP logging summary implied logs capture when a TCP connection opens. Clarified that the logs capture connection-level information such as connection start time, while Envoy's default TCP proxy access log is emitted when the connection closes.
- The explanation of `requested_server_name` overstated its availability and tied it too broadly to mTLS routing. Updated it to say the field shows SNI when present and may be `-` for plain TCP connections.
- The response flag table listed `UC`, `DC`, `LR`, and `UR` as TCP-relevant flags, but Envoy documents those specific flags under HTTP-only response flags. Replaced them with TCP-applicable flags `UH`, `NC`, and `DT`.
- The EnvoyFilter example used the deprecated top-level `access_log_flush_interval` field on `TcpProxy`. Updated it to the current `access_log_options.access_log_flush_interval` field.
- The troubleshooting section said Istio defaults to opaque TCP handling without a `tcp-` prefix. Updated this to match Istio's protocol selection behavior: Istio attempts automatic HTTP/HTTP2 detection, then treats undetected traffic as plain TCP; server-first protocols such as MySQL should be named explicitly.

## Review Notes
The remaining IstioOperator, Telemetry API, Kubernetes Service, CEL filter, and `istioctl proxy-config` examples align with current official documentation. Istio recommends the Telemetry API for access logging, while meshConfig-based access log settings remain documented and valid.
