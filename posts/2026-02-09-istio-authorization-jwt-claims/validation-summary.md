# Validation Summary: How to Create Fine-Grained Istio AuthorizationPolicies Based

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JSON Web Tokens (JWT)
- OAuth 2.0 scopes
- Kubernetes Deployments, Services, and ServiceAccounts
- kubectl and istioctl
- Python and PyJWT

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/latest/usage.html

## Issues Found
- Updated Istio security API snippets from `security.istio.io/v1beta1` to the current documented `security.istio.io/v1` examples for `RequestAuthentication` and `AuthorizationPolicy`.
- Corrected OAuth scope matching. The post used contains-style wildcard patterns such as `*read*` and `*write*`, but Istio documents exact, prefix, suffix, and presence matches. The policy now lists concrete scope values and the text explains when prefix patterns such as `read:*` are appropriate.
- Added `spaceDelimitedClaims` for the `scope` claim so space-delimited OAuth scope strings such as `read write` can be matched as individual values by AuthorizationPolicy conditions.
- Corrected the complex policy's write-scope condition to use the same exact/list-aware scope values.
- Replaced the time-based AuthorizationPolicy example that matched `request.auth.claims[exp]`. Istio AuthorizationPolicy conditions support JWT claims of type string or list of string, while `exp` and `iat` are numeric registered claims. The section now explains that token lifetime is enforced during JWT authentication through `exp` and `nbf`, and that time windows should be handled by token issuance and lifetimes.
- Fixed the PyJWT RS256 example to read a PEM private key from `key.pem` instead of passing the literal string `your-private-key`, which would not be a valid RSA signing key. Also updated the timestamp generation to timezone-aware UTC datetimes.
- Fixed the DELETE test command to use `curl -X DELETE`, since the original command would send a GET request to `/delete`.

## Review Notes
The remaining examples are technically valid as workload-level Istio authorization examples. In production, DENY policies should be scoped carefully, especially when HTTP attributes could be missing on non-HTTP traffic, and the JWKS endpoint must expose the public key corresponding to the private key used for test token generation.
