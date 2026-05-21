# Validation Summary: How to Configure Rate Limiting per Source Service in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- EnvoyFilter
- Envoy global rate limiting
- Envoy Lua HTTP filter
- Kubernetes ConfigMap and kubectl
- Redis-backed Envoy rate limit service
- SPIFFE workload identity and mTLS

## Sources Consulted
- Istio: Enabling Rate Limits using Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio: EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio: Mutual TLS Migration: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio: PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Envoy: Rate limit HTTP filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy: HTTP route rate limit actions: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy: Lua HTTP filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy: HTTP connection manager XFCC settings: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy: rate limit descriptor expression extension: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/rate_limit_descriptors/expr/v3/expr.proto
- Envoy: CEL/request attributes: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html

## Issues Found
- The post said mTLS is enabled by default in Istio. I corrected this to distinguish automatic sidecar mTLS from the default destination `PERMISSIVE` mode and noted that `STRICT` mTLS requires `PeerAuthentication`.
- The source identity explanation implied XFCC and peer metadata are always directly available. I changed it to state that XFCC depends on HTTP connection manager forwarding of the URI SAN and that Envoy connection attributes can also expose the identity.
- The Lua filter used the deprecated `inline_code` field and added a potentially duplicate `x-source-service` header. I changed it to `default_source_code.inline_string` and `headers():replace(...)`.
- The global rate limit filter configured a custom `rate_limit_cluster`. I changed it to the documented Istio pattern of referencing the generated outbound service cluster, `outbound|8081||ratelimit.rate-limit.svc.cluster.local`, with authority set.
- The peer metadata alternative used an unsupported `envoy.filters.http.rbac` / `source.principal` metadata lookup. I replaced it with Envoy's computed descriptor extension using `connection.uri_san_peer_certificate`.
- The combined source-and-path descriptor config did not show a route action that sends the path descriptor. I added the corresponding two-action `rate_limits` example.
- The summary still referred to peer metadata. I updated it to connection attributes.

## Review Notes
EnvoyFilter patches expose Envoy internals and should be retested during Istio upgrades. The examples assume the rate limit service is present as a Kubernetes service so Istio creates the referenced outbound cluster.
