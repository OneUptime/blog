# Validation Summary: How to use Envoy JWT authentication filter for token validation

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Envoy HTTP JWT authentication filter
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS)
- OAuth2/OIDC-issued tokens
- Envoy route matching
- Prometheus-style Envoy metrics

## Sources Consulted
- Envoy JWT Authentication filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter.html
- Envoy jwt_authn v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/jwt_authn/v3/config.proto.html
- Envoy route match API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The description implied Envoy implements OAuth2/OIDC authentication flows. Envoy's JWT authentication filter validates JWTs and does not perform OIDC discovery or OAuth2 login flows, so the description now says it validates JWTs issued by OAuth2/OIDC identity providers.
- The claim-based routing example used `forward_payload_header`, which forwards the base64url-encoded full JWT payload, not individual claims. The example now uses `claim_to_headers` to copy a scalar `tier` claim to `x-user-tier` and route on that header.
- The claim-based routing example did not set `clear_route_cache`. Envoy documents this option for allowing JWT-derived headers to affect routing decisions, so it was added to the provider example.
- The custom claim section described `claim_to_headers` as custom claim validation. Envoy uses this field to copy claims into headers after validation, so the section was renamed and the explanation was corrected.
- The custom claim example used a likely array-style `roles` claim. Envoy's generated API documentation states `claim_to_headers` claims must be string, int, double, or bool and arrays are not supported, so the example now uses a scalar `role` claim.
- The monitoring examples omitted the HTTP connection manager stat prefix and used a generic cluster request counter for JWKS fetch success. The examples now use the documented `http.<stat_prefix>.jwt_authn.*` counters with an `ingress_http` stat prefix.
- The JWKS caching best practice referenced token expiration. JWKS cache duration is about key freshness and rotation, not JWT lifetime, so the best practice now refers to key rotation.

## Review Notes
The snippets are partial Envoy configuration fragments rather than a full runnable Envoy bootstrap. That is acceptable for this post's format, but a future revision could add surrounding `static_resources`, listener, and HTTP connection manager context for readers who want to run the examples directly.
