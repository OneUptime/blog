# Validation Summary: How to configure Envoy RBAC filter for authorization policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy HTTP RBAC filter
- Envoy RBAC v3 API
- Envoy HTTP route and header matching
- Envoy per-route filter configuration
- Envoy RBAC statistics

## Sources Consulted
- Envoy Role Based Access Control HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter
- Envoy HTTP RBAC filter v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/rbac/v3/rbac.proto
- Envoy RBAC v3 policy, permission, and principal API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/rbac/v3/rbac.proto
- Envoy HTTP route HeaderMatcher API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy StringMatcher API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/string.proto
- Envoy RBAC HTTP sandbox statistics example: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/rbac

## Issues Found
- Principal combinators used permission field names. The examples used `and_rules` under `principals`, but Envoy principals use `and_ids` with `ids`. Updated the affected principal examples so the YAML matches `config.rbac.v3.Principal`.
- Header examples used deprecated `exact_match` and `prefix_match` fields. Updated value matches to `string_match` with `exact`, and path checks to the RBAC `url_path` matcher with `path.prefix`.
- The monitoring section showed incomplete Prometheus-style metric names. Updated the snippet to Envoy's documented stats namespace: `http.<stat_prefix>.rbac.allowed`, `http.<stat_prefix>.rbac.denied`, `http.<stat_prefix>.rbac.shadow_allowed`, and `http.<stat_prefix>.rbac.shadow_denied`.

## Review Notes
The `authenticated` principal example is syntactically valid, but current Envoy documentation recommends using the `envoy.rbac.principals.mtls_authenticated` custom principal for most mTLS use cases because it provides improved security. That is a future improvement rather than a required correction for this post.
