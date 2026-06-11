# Validation Summary: How to Build Istio RequestAuthentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Kubernetes custom resources
- Envoy JWT authentication
- JSON Web Tokens (JWT)
- JWKS / OpenID Connect
- FastAPI request headers
- jwt-cli

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Copy JWT Claims to HTTP Headers task: https://istio.io/latest/docs/tasks/security/authentication/claim-to-header/
- Istio JWT Token authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- jwt-cli official repository and usage documentation: https://github.com/mike-engel/jwt-cli
- Auth0 JSON Web Key Sets documentation: https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-key-sets
- Auth0 Locate JSON Web Key Sets documentation: https://auth0.com/docs/secure/tokens/json-web-tokens/locate-json-web-key-sets
- Okta OpenID Connect and OAuth 2.0 API documentation: https://developer.okta.com/docs/api/openapi/okta-oauth/guides/overview
- Microsoft identity platform OpenID Connect documentation: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The basic RequestAuthentication snippet said the selector applied to all workloads in the namespace. Changed the comment to say it applies only to workloads matching the label selector.
- The audience explanation said Istio does not validate the audience claim when `audiences` is omitted. Istio documents that the Kubernetes service name is accepted when `audiences` is empty, so the text was corrected.
- A JWKS example comment mentioned caching options even though no cache options were configured. Changed it to describe the explicit JWKS URI.
- The custom token location section implied locations are checked in order. Istio documents that requests with multiple tokens at different locations are unsupported and have undefined principal output, so the wording was corrected and a warning was added.
- The `outputClaimToHeaders` example copied a `roles` claim and the FastAPI code parsed it as comma-separated roles. Istio only supports string, integer, and boolean claims for claim-to-header output, not arrays, so the example now uses a single string `role` claim.
- The AuthorizationPolicy section labeled the JWT requirement as applying to all requests, while the following health-check policy creates unauthenticated exceptions. Updated the comment to describe API requests.
- The JWT generation example used `npm install -g jwt-cli` and `jwt sign --algorithm`, which do not match the official jwt-cli installation and command syntax. Updated it to `cargo install jwt-cli` and `jwt encode --alg=RS256 --secret=@private-key.pem`.
- The test token expiration timestamp was `1735689600`, which is January 1, 2025 and already expired as of the review date. Updated it to `1893456000` for January 1, 2030.
- The common issues table said tokens are not validated without an AuthorizationPolicy. RequestAuthentication still rejects invalid presented tokens; AuthorizationPolicy is needed to reject missing credentials. Updated the issue text accordingly.
- The common issues table said missing claim forwarding is fixed with `forwardOriginalToken`. Forwarding the original token and copying claims to headers are separate features, so the table now distinguishes `forwardOriginalToken` from `outputClaimToHeaders`.

## Review Notes
The post is technically valid after edits. `outputClaimToHeaders` is documented by Istio as experimental, and only string, integer, boolean, and supported nested scalar claims should be used for header output. AuthorizationPolicy can still match string and list-of-string JWT claims directly.
