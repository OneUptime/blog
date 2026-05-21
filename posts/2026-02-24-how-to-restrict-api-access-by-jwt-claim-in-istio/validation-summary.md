# Validation Summary: How to Restrict API Access by JWT Claim in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JWT claims
- Kubernetes
- istioctl
- kubectl
- jq

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio security troubleshooting documentation: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519
- jq manual: https://jqlang.org/manual/

## Issues Found
- The multi-tier access control summary listed `POST/PUT/DELETE /api/v1/*` even though the preceding policy also allowed `PATCH`. Updated the summary to `POST/PUT/PATCH/DELETE /api/v1/*` so it matches the YAML.
- The JWT decoding command used `base64 -d` directly on the JWT payload. JWT segments are base64url-encoded per RFC 7519, so plain base64 decoding can fail for valid tokens. Replaced it with a `jq` command that decodes the JWT payload as base64url JSON.

## Review Notes
- The Istio API versions and field names used in the examples are current in the latest Istio documentation.
- `request.auth.claims[...]` matching is documented for string and list-of-string claims, including nested claims with bracket notation.
- Istio documents `scope` and `permission` as default space-delimited claims, so matching `values: ["write"]` against `"scope": "read write"` is valid. Custom space-delimited claims require `spaceDelimitedClaims`.
- `RequestAuthentication` validates a token when one is presented, but requiring a token is enforced by the accompanying `AuthorizationPolicy` rules using `requestPrincipals`.
