# Validation Summary: How to Build a gRPC Proxy with Envoy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy (v1.28, xDS v3 API)
- gRPC / Protocol Buffers (proto3)
- gRPC-JSON transcoding (google.api.http annotations)
- Docker Compose
- Prometheus + statsd_exporter
- Jaeger (Zipkin-compatible tracing)
- grpcurl / curl

## Sources Consulted
- Envoy HTTP connection manager proto docs — https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy access logging usage / command operators — https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy issue #15559 (http2_protocol_options deprecation scope) — https://github.com/envoyproxy/envoy/issues/15559
- Envoy gRPC architecture overview — https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc
- Envoy gRPC-JSON transcoder filter docs (GrpcJsonTranscoder / PrintOptions)
- Envoy load balancer docs (RING_HASH, MAGLEV, LEAST_REQUEST)
- Envoy local/global rate limit filter docs

## Issues Found
No technical issues found.

The following potentially-suspect items were specifically verified and confirmed correct:

- **HCM `http2_protocol_options`** (downstream listener): Still valid and documented for client-facing (downstream) connections. The deprecation guidance applies to *cluster/upstream* usage, and the post correctly uses `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions` for all upstream gRPC clusters.
- **`typed_extension_protocol_options`** for upstream HTTP/2 — current, non-deprecated approach. Correct.
- **gRPC-JSON transcoder `print_options`** field names (`add_whitespace`, `always_print_primitive_fields`, `always_print_enums_as_ints`, `preserve_proto_field_names`) — valid for the v3 GrpcJsonTranscoder.
- **Maglev `table_size: 65537`** — correctly a prime number, as required.
- **Ring hash sizes** (`minimum_ring_size: 1024`, `maximum_ring_size: 8388608`, `hash_function: XX_HASH`) — valid.
- **`retry_on: "unavailable,resource-exhausted,cancelled"`** — all valid gRPC retry conditions.
- **`grpc_health_check`**, circuit breaker thresholds, weighted_clusters, priority-based endpoints — all match current v3 schema.
- **Rate limit filters** (`local_ratelimit` token_bucket / filter_enabled / filter_enforced, global `ratelimit` with `enable_x_ratelimit_headers: DRAFT_VERSION_03`, `rate_limited_as_resource_exhausted`) — correct.
- **Zipkin tracing config** (`ZipkinConfig`, `collector_endpoint_version: HTTP_JSON`, `custom_tags`, `random_sampling`) targeting Jaeger on port 9411 — correct, including `COLLECTOR_ZIPKIN_HOST_PORT=:9411` env var.
- **Docker image tags** (`envoyproxy/envoy:v1.28-latest`, `jaegertracing/all-in-one:1.50`, `prom/prometheus:v2.47.0`, `prom/statsd-exporter:v0.24.0`) — valid, existing tags.

## Review Notes
- The access logs use `%RESP(GRPC-STATUS)%` to capture gRPC status. This works and returns the numeric status code. Envoy also offers the dedicated `%GRPC_STATUS%` command operator, which returns the human-readable status name (e.g., `UNAVAILABLE`) and transparently checks both response headers and trailers. Either is acceptable; `%GRPC_STATUS%` would be slightly more idiomatic but the current form is not incorrect.
- `version: '3.8'` in `docker-compose.yaml` is now an obsolete/ignored key in Compose v2 (it emits a warning but is harmless). Left as-is since it is widely used and not technically wrong.
- The cluster-level `health_check` filter and `grpc_web` filter ordering correctly places the `router` filter last, as required.
