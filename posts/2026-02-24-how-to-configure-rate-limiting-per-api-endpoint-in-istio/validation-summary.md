# Validation Summary: How to Configure Rate Limiting per API Endpoint in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy global HTTP rate limit filter
- Envoy rate limit service descriptors
- Kubernetes ConfigMap and kubectl commands
- Envoy Lua HTTP filter
- Redis-backed rate limit service state

## Sources Consulted
- Istio task: Enabling Rate Limits using Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy route rate limit action API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy HTTP rate limit filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy ratelimit service configuration documentation: https://github.com/envoyproxy/ratelimit

## Issues Found
- The EnvoyFilter snippets used `cluster_name: rate_limit_cluster`, but Istio-generated outbound clusters normally use the `outbound|<port>||<service-fqdn>` form shown in the official Istio rate-limit task. Changed both rate-limit filter snippets to use `outbound|8081||ratelimit.rate-limit.svc.cluster.local` and added the matching `authority`.
- The path-parameter section said "Use Route Names", but the snippet used Envoy's `header_value_match` rate-limit action, not route names. Renamed the subsection and explanation to describe header match patterns accurately.
- The combined endpoint and per-user example said multiple descriptors were sent by one `rate_limits` entry. Envoy composes multiple actions into descriptor entries within a descriptor. Updated the wording to "multiple descriptor entries".
- The nested descriptor ConfigMap used `domain: combined-ratelimit`, while the surrounding EnvoyFilter examples used `endpoint-ratelimit`. Changed the domain to `endpoint-ratelimit` so the filter and service configuration match.
- The monitoring section described sidecar admin stats as "rate limit service stats". Updated the wording to say these are Envoy rate limit filter stats from the sidecar.

## Review Notes
The examples rely on EnvoyFilter, which Istio documents as exposing internal Envoy configuration details that should be monitored carefully across Istio proxy upgrades. The Redis `KEYS` example is acceptable for a simple check, but `SCAN` is safer for production-sized Redis databases.
