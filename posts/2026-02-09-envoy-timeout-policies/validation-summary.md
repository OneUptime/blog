# Validation Summary: How to configure Envoy timeout policies for request deadlines

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy
- Envoy HTTP connection manager
- Envoy route timeout and retry policy configuration
- Envoy upstream cluster HTTP protocol options
- gRPC timeout handling
- Prometheus metrics for Envoy

## Sources Consulted
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The request timeout explanation described route `timeout` as the maximum time for the entire request. Updated it to state that Envoy starts this timeout after receiving the full downstream request and waits for the complete upstream response, including retries.
- The upstream idle timeout snippet used the deprecated direct cluster `common_http_protocol_options` field. Updated it to use `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The stream idle timeout explanation implied streams were only HTTP/2 requests. Updated it to note that Envoy maps HTTP/1 requests to streams internally too.
- The per-try timeout explanation said only the retries get the per-try timeout. Updated it to clarify that the initial attempt and each retry get the per-try timeout.
- The HTTP/2 ping snippet used the deprecated direct cluster `http2_protocol_options` field. Updated it to use `typed_extension_protocol_options` with explicit HTTP/2 configuration.
- The downstream `max_connection_duration` explanation said connections close after one hour regardless of activity. Updated it to state that the connection starts draining and active streams are allowed to complete.
- The gRPC timeout explanation said Envoy passes the gRPC deadline to upstream services. Updated it to describe the configured behavior more accurately: Envoy honors the incoming `grpc-timeout` header for stream duration, capped by `grpc_timeout_header_max`.

## Review Notes
The snippets are partial Envoy configuration fragments rather than complete bootstrap files, which is appropriate for this guide. Prometheus metric names are plausible for Envoy stats exported with the standard `envoy_` prefix, but actual labels and names can vary by stats sink configuration.
