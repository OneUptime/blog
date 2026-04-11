# Validation Summary: How to Use Redis with Envoy Proxy for Rate Limiting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (v7 Alpine Docker image)
- Envoy Proxy (global rate limiting via HTTP filter)
- envoyproxy/ratelimit (official Rate Limit Service)
- Docker
- gRPC (communication between Envoy and RLS)

## Sources Consulted
- Envoy v3 Rate Limit HTTP filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy Cluster API (load_assignment, LocalityLbEndpoints, LbEndpoint): https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy HTTP Protocol Options (typed_extension_protocol_options): https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- envoyproxy/ratelimit GitHub repository: https://github.com/envoyproxy/ratelimit
- Envoy global rate limiting architecture guide: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting

## Issues Found

### 1. YAML indentation error in `lb_endpoints` cluster config
**What was wrong:** The `- endpoint:` block under `lb_endpoints:` was indented at the same column as the `lb_endpoints` key (column 10). In YAML, a block collection value must be indented more than its parent key. As written, `- endpoint:` would not be parsed as the value of `lb_endpoints:`, causing an Envoy config parsing error.

**What was changed:** Indented `- endpoint:` and its children by 2 additional spaces so they are properly nested under `lb_endpoints:`.

### 2. Deprecated `http2_protocol_options` at cluster level
**What was wrong:** The cluster config used `http2_protocol_options: {}` at the top level of the cluster definition. This field was deprecated in Envoy v1.19 and removed in later versions. Since gRPC requires HTTP/2 and readers in 2026 would be using current Envoy versions, this config would fail.

**What was changed:** Replaced `http2_protocol_options: {}` with the current `typed_extension_protocol_options` approach using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions` with `explicit_http_version_config`.

## Review Notes
- The `transport_api_version: V3` field in the `rate_limit_service` config is deprecated in newer Envoy versions (V3 is the only supported version), but it does not cause errors — it simply generates a deprecation warning. Left as-is since it's functional.
- The post shows partial Envoy configuration (http_filters and clusters). A complete working setup would also require route-level `rate_limits` actions to map request attributes (like the `x-user-id` header) to rate limit descriptors. Readers may need to consult Envoy docs for the full route configuration.
- The Redis key format shown in the "Inspect Redis Counters" section (`api_limits_user_id_user123_1706054400`) is illustrative. The actual key format used by the envoyproxy/ratelimit service may vary slightly depending on the version.
- The `request_type: external` field in the rate limit filter config is valid in the v3 API and correctly restricts rate limiting to external requests only.
