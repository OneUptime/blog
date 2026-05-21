# Validation Summary: How to Fix JWT Validation Failures in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS)
- Envoy JWT authentication filter logging
- Kubernetes kubectl
- istioctl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio JWT Token authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio security troubleshooting docs: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- RFC 7517, JSON Web Key (JWK): https://www.rfc-editor.org/rfc/rfc7517.html
- RFC 7519, JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- The JWT decoding examples used `cut` with `base64 -d`, which is unreliable for JWT base64url encoding and missing padding. Updated the examples to use `jq -R 'split(".")[...] | @base64d | fromjson | ...'`.
- The audience section said removing `audiences` skips audience validation. Istio documents that when `audiences` is empty, the service name is accepted as an audience. Updated the explanation.
- The JWKS refresh section stated the 20 minute refresh behavior generally. Istio's current docs distinguish JWKS fetching modes with `PILOT_JWT_ENABLE_REMOTE_JWKS`; updated the statement to scope it to the default istiod JWKS mode.
- The algorithm mismatch section implied every JWKS advertises an `alg` value. RFC 7517 makes `alg` optional, so the wording and `jq` command now check key type and any advertised algorithm.
- The multiple issuer section said a token with an unmatched `iss` is treated as unauthenticated. Istio documents that a JWT with a different `iss` claim is rejected, so the section now says the presented token is invalid and rejected.

## Review Notes
The core Istio examples use current `security.istio.io/v1` resources and valid fields. The `requestPrincipals: ["*"]` AuthorizationPolicy pattern is still documented, although Istio's authentication task also shows a DENY policy with `notRequestPrincipals: ["*"]` as another way to require JWTs.
