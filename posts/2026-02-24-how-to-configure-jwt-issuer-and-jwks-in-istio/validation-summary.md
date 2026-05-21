# Validation Summary: How to Configure JWT Issuer and JWKS in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio RequestAuthentication
- JWT
- JWKS
- OpenID Connect Discovery
- Envoy JWT authentication filter
- Kubernetes kubectl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio security troubleshooting: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio pilot-discovery environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Envoy JWT authentication filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter.html
- Envoy JWT authn API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/jwt_authn/v3/config.proto.html
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html
- RFC 7519, JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519
- RFC 7517, JSON Web Key: https://www.rfc-editor.org/rfc/rfc7517
- Keycloak OIDC endpoint documentation: https://www.keycloak.org/securing-apps/oidc-layers
- Microsoft identity platform signing key documentation: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Okta OAuth 2.0 and OIDC API documentation: https://developer.okta.com/docs/api/openapi/okta-oauth/guides/overview/
- Auth0 JWKS documentation: https://auth0.com/docs/get-started/tenant-settings/signing-keys/customer-signing-keys

## Issues Found
- The post said a JWT whose issuer does not match any configured RequestAuthentication rule passes through without a principal. Istio documents that requests with invalid authentication information are rejected, and that a JWT with a different `iss` claim is rejected. Updated the affected explanations to distinguish invalid tokens from requests with no credentials.
- The JWT decoding commands used `base64 -d`, but JWT segments are base64url encoded and may be unpadded. Replaced those examples with Python snippets that use `base64.urlsafe_b64decode` and add required padding.
- The post said the Envoy sidecar always fetches JWKS at runtime. Istio fetches JWKS through istiod by default, while Envoy remote JWKS fetching depends on `PILOT_JWT_ENABLE_REMOTE_JWKS`. Updated the reachability and latency notes to cover the configured fetcher.
- The JWKS caching section said Envoy refreshes JWKS approximately every 5 minutes. Istio's default istiod public key refresh interval is 20 minutes, while Envoy remote JWKS caching has its own cache duration. Updated the caching section and key rotation advice accordingly.

## Review Notes
Provider JWKS URLs listed in the post are plausible for common default configurations, but production deployments should still prefer the provider's OpenID Connect discovery document because custom domains, tenant-specific paths, and authorization server IDs can change the correct `issuer` and `jwks_uri` values.
