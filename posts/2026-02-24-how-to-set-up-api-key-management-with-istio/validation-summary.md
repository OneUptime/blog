# Validation Summary: How to Set Up API Key Management with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio MeshConfig extensionProviders
- Envoy Lua HTTP filter
- Envoy external authorization
- Envoy global rate limiting descriptors
- Kubernetes Deployment, Service, and Secret
- Go gRPC authorization service
- curl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy external authorization API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/auth/v3/external_auth.proto
- Envoy Go control-plane auth v3 package documentation: https://pkg.go.dev/github.com/envoyproxy/go-control-plane/envoy/service/auth/v3

## Issues Found
- The Envoy Lua examples used the deprecated `inlineCode` field. Updated both examples by replacing the Lua filter configuration with the current `default_source_code.inline_string` form.
- The Go external authorization example assigned `clientInfo` but did not use it, which would not compile, and it did not demonstrate how the later `x-client-tier` header would be injected. Updated the example to embed `auth.UnimplementedAuthorizationServer`, return `OkHttpResponse` headers, and include a small placeholder `validateAPIKey` implementation.
- The JWT approach implied that RequestAuthentication alone requires a token. Added a note that Istio rejects invalid JWTs but allows requests without JWTs unless an AuthorizationPolicy requires a request principal.
- The Secret section said Envoy Lua filters cannot directly read files. Reworded this to the more accurate limitation: mounting a Kubernetes Secret does not automatically make key data available to the Lua filter configuration.
- The rate limiting example added informational response headers with Lua rather than configuring rate limiting. Replaced it with an EnvoyFilter snippet that configures rate limit descriptors from the `x-client-tier` request header and clarified that Envoy's global rate limit filter and service are required for enforcement.

## Review Notes
The examples remain illustrative and assume common gateway labels and hostnames such as `istio: ingressgateway` and `api.example.com`. In a real cluster, these selectors, virtual host names, and extension provider locations must match the installed gateway and VirtualService configuration.
