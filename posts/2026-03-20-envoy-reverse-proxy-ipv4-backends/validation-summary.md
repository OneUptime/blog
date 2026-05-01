# Validation Summary: How to Set Up Envoy as a Reverse Proxy for IPv4 Backend Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- HTTP reverse proxying
- Envoy v3 YAML configuration
- IPv4 upstream clusters
- HTTP path-based routing
- Load balancing
- `curl`
- `jq`

## Sources Consulted
- Envoy command line options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli.html
- Envoy bootstrap configuration: https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/bootstrap.html
- Envoy HTTP connection manager proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy HTTP header manipulation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy route configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route.proto.html
- Envoy route components proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy config dump shared admin proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump_shared.proto
- Envoy administration interface: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html

## Issues Found
- The description claimed the configuration accepted HTTP and HTTPS traffic, but the listener shown is plaintext HTTP only. I changed the description to scope the post to HTTP, which matches the actual configuration.
- The request-header example instructed readers to add `X-Forwarded-For` and hardcode `X-Forwarded-Proto`. Envoy’s HTTP connection manager already manages these headers, and the current docs recommend `use_remote_address: true` for edge reverse proxies. I added `use_remote_address: true` to the main config and replaced the example with a valid custom header example.
- The admin command queried `.dynamic_route_configs`, but this post defines inline static routes. Envoy exposes those under `static_route_configs`, so I updated the `config_dump` example to query the correct resource.
- The conclusion said the admin API provides introspection of routing decisions. The admin endpoints expose the loaded routing configuration and runtime stats rather than per-request routing decisions, so I adjusted that wording for accuracy.

## Review Notes
- The post is accurate against Envoy’s current v3 API after the fixes above.
- HTTPS termination is not covered by the shown configuration; adding HTTPS support would require additional TLS listener and certificate configuration beyond the scope of this post.
- The local workspace does not have the `envoy` binary installed, so command validation was performed against the official Envoy documentation rather than a live `envoy --help` or config validation run.
