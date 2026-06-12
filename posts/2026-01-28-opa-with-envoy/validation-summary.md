# Validation Summary: How to Use OPA with Envoy

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Open Policy Agent (OPA)
- OPA-Envoy plugin
- Envoy External Authorization (`ext_authz`)
- Rego
- JWT verification
- Kubernetes
- Istio AuthorizationPolicy and extension providers
- Docker Compose
- Prometheus-style Envoy metrics

## Sources Consulted
- OPA-Envoy plugin documentation: https://www.openpolicyagent.org/docs/envoy
- OPA Envoy policy primer and input document examples: https://www.openpolicyagent.org/docs/envoy/primer
- OPA token verification built-ins (`io.jwt.decode_verify`): https://www.openpolicyagent.org/docs/policy-reference/builtins/tokens
- OPA string and glob built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/strings and https://www.openpolicyagent.org/docs/policy-reference/builtins/glob
- Envoy External Authorization filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto
- Envoy External Authorization filter configuration and statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The JWT policy used `io.jwt.decode()` and manually checked only `exp` and `iss`, which does not verify the JWT signature. Replaced it with `io.jwt.decode_verify()` using a configured public key, issuer constraint, and current time.
- The permission data used `/api/users/{id}` with `glob.match`, but OPA glob matching does not treat `{id}` as a route parameter. Changed the pattern to `/api/users/*`.
- The Envoy sidecar clusters used `STRICT_DNS` for loopback IP endpoints. Changed those local sidecar examples to `STATIC`, matching Envoy's usual local endpoint examples.
- The structured response example referenced undefined `verify_request` and `claims` values. Reworked it to use the earlier helper rules and added text saying it builds on those helpers.
- The Istio example used an `AuthorizationPolicy` provider name but only added an Envoy cluster through `EnvoyFilter`. Istio `CUSTOM` authorization requires a provider defined in mesh `extensionProviders`. Replaced the `EnvoyFilter` example with a `ServiceEntry`, `meshConfig.extensionProviders` entry, and current `security.istio.io/v1` `AuthorizationPolicy`.
- The Docker Compose setup reused sidecar-local `127.0.0.1` cluster addresses, which would not work across separate Compose containers. Added a note to use Compose service names (`opa:9191` and `backend:5678`) and set OPA's HTTP server to listen on `0.0.0.0:8181`.
- The performance section claimed the snippet enabled Envoy decision caching, but the shown fields (`stat_prefix`, `include_peer_certificate`) do not cache authorization decisions. Replaced that section with request-size tuning using `with_request_body`.
- The Envoy metric names were not the documented stat namespace. Updated them to `cluster.<route target cluster>.ext_authz.*` counters documented by Envoy.

## Review Notes
- YAML snippets were parsed successfully after edits.
- Rego snippets were parsed with `openpolicyagent/opa:latest-envoy` (OPA 1.17.1). The advanced pattern snippets are illustrative and depend on helper rules shown earlier in the post.
- The post still uses example image tags such as `latest-envoy` and `v1.28-latest`; pinning exact image digests or release versions would be better for production, but the examples are technically valid.
