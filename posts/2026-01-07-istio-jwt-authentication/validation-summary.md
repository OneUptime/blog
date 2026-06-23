# Validation Summary: How to Configure JWT Authentication in Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio ServiceEntry and DestinationRule
- Envoy JWT authentication and Lua filters
- Kubernetes
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS)
- Auth0, Keycloak, Okta, and Google/Firebase identity providers

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio Copy JWT Claims to HTTP Headers task: https://istio.io/latest/docs/tasks/security/authentication/claim-to-header/
- Istio pilot-discovery command reference for JWKS fetching modes: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519
- OpenID Connect Discovery specification: https://openid.net/specs/openid-connect-discovery-1_0.html

## Issues Found
- The post stated JWKS caching used a 5-minute default. Istio's current documented default for Istiod JWKS refresh is controlled by `PILOT_JWT_PUB_KEY_REFRESH_INTERVAL`, which defaults to 20 minutes. Updated the comment to reference the Istio setting instead of the incorrect duration.
- The architecture section implied only Istiod fetches JWKS. Current Istio supports multiple JWKS fetching modes through `PILOT_JWT_ENABLE_REMOTE_JWKS`. Added a note explaining the default Istiod behavior and Envoy remote JWKS mode.
- The ServiceEntry section implied it is generally required for external JWKS access. That is only relevant to proxy egress when Envoy remote JWKS fetching is used and egress is restricted. Updated the wording to include that caveat.
- Several `outputClaimToHeaders` examples mapped array claims such as roles and groups. Istio documents that `outputClaimToHeaders` supports only string, boolean, and integer claims, not arrays. Removed or changed those header mappings to scalar claims while preserving JWT claim-based authorization examples, which do support list-of-string claims.
- The complete default-deny AuthorizationPolicy example contained an invalid bare `{}` under `spec`. Replaced it with `action: ALLOW` and `rules: []`, which is valid YAML and creates a no-match ALLOW policy.
- The testing section said a request without a JWT should return `401 Unauthorized` when denied by AuthorizationPolicy. Istio's documented behavior for missing JWT with a require-JWT AuthorizationPolicy is `403 Forbidden`; invalid JWT verification remains `401`. Updated the expected result.
- The JWT decode command used plain `base64 -d`, which is unreliable for JWT base64url payloads. Replaced it with a `jq` command that decodes the payload more robustly.

## Review Notes
- `outputClaimToHeaders` is still documented by Istio as experimental, even though the field exists in the current `security.istio.io/v1` API.
- The EnvoyFilter Lua example is advanced and should be tested against the exact generated Envoy JWT metadata shape in a real mesh before production use.
