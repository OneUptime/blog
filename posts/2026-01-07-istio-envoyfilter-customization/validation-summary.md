# Validation Summary: How to Customize Envoy Proxies with Istio EnvoyFilter

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy proxy configuration and xDS-generated resources
- Envoy HTTP, network, listener, compressor, local rate limit, Lua, TLS, and access log filters
- Kubernetes custom resources and kubectl debugging commands
- Lua scripting in Envoy
- JWT/JWS claim extraction concepts

## Sources Consulted
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Envoy rate limit task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy compressor filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/compressor/v3/compressor.proto
- Envoy route configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route.proto
- Envoy core HeaderValueOption API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto
- RFC 7515 JSON Web Signature: https://datatracker.ietf.org/doc/html/rfc7515
- RFC 7519 JSON Web Token: https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- The resource structure section claimed to show all available EnvoyFilter fields, but it omitted newer fields such as `targetRefs`. Changed the wording to describe it as a representative structure with commonly used fields.
- The `applyTo` table omitted `LISTENER_FILTER` and the deprecated `BOOTSTRAP` value. Added both so the table matches the current Istio reference.
- The route header example used Envoy's deprecated `append` field. Replaced it with `append_action: APPEND_IF_EXISTS_OR_ADD`.
- Several Lua examples used `os.clock`, `os.date`, or `os.time` for request timing. Replaced those with Envoy Lua stream-handle timestamp APIs.
- The outbound header injection example could add a nil `x-correlation-id` value if neither correlation header existed. Added a nil guard before adding the header.
- The conditional routing example implied that Lua alone routed to different upstreams. Clarified that it adds routing headers for route configuration to consume and added `clearRouteCache()` after route-affecting header changes.
- The JWT example described itself as JWT validation but did not verify the JWT signature. Changed the wording to claims extraction and noted that Istio RequestAuthentication or another auth filter should verify signatures.
- The JWT decoder handled normal base64 but JWT segments use base64url encoding. Updated the decoder to translate `-` and `_` before decoding.
- The JWT expiration check used `os.time`; updated it to use Envoy's timestamp API and compare against JWT NumericDate seconds.
- The API transformation example used a past `sunset` date for a post dated January 7, 2026. Updated it to `2026-12-31`.
- The compressor example comment said `disable_on_etag_header` disabled compression for specific paths. Corrected the comment to state that it disables compression when the response has an ETag header.

## Review Notes
The examples remain illustrative and depend on matching Istio-generated listener, route, cluster, and filter names for the deployed Istio/Envoy version. EnvoyFilter is still a low-level extension point, so these snippets should be tested with `istioctl analyze`, proxy config dumps, and the exact Istio revision used in production.
