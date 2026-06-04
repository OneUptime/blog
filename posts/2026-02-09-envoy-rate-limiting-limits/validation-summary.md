# Validation Summary: How to configure Envoy rate limiting with local and global limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy HTTP local rate limit filter
- Envoy HTTP global rate limit filter
- Envoy rate limit service
- Redis
- Kubernetes manifests
- Prometheus alerting and metrics

## Sources Consulted
- Envoy HTTP local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy HTTP local rate limit v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto
- Envoy HTTP global rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy HTTP global rate limit v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy HTTP route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy rate limit service documentation: https://github.com/envoyproxy/ratelimit

## Issues Found
- Replaced deprecated `append: false` header syntax with `append_action: OVERWRITE_IF_EXISTS_OR_ADD` in Envoy header additions.
- Corrected the rate limit service HTTP port from `6070` to `8080`; `6070` is the default debug port for the Envoy rate limit service, while HTTP endpoints listen on `8080`.
- Updated the Envoy cluster HTTP/2 configuration from deprecated cluster-level `http2_protocol_options` to `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- Fixed the remote-address descriptor example. Envoy's `remote_address` rate limit action emits the `remote_address` descriptor key and does not accept `descriptor_key: client_ip`, so the route and rate limit service descriptor were updated accordingly.
- Replaced invalid `request_type: shadow` usage. Envoy's `request_type` supports `internal`, `external`, and `both`; the shadow-mode example now uses `filter_enabled` at 100% and `filter_enforced` at 0%, with a note about the reference service's descriptor-level `shadow_mode`.
- Replaced unsupported `%RATE_LIMIT_*%` response header placeholders with Envoy's supported `enable_x_ratelimit_headers: DRAFT_VERSION_03` and a static custom response header.
- Corrected the Prometheus examples to include the configured local rate limit stat prefix and the route target cluster namespace used by Envoy's global HTTP rate limit stats.

## Review Notes
The post uses `envoyproxy/ratelimit:latest` for brevity. For production examples, pinning a specific image tag would be safer and more reproducible.
