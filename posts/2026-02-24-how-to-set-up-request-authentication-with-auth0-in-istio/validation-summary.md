# Validation Summary: How to Set Up Request Authentication with Auth0 in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Auth0
- JWT and JWKS
- Kubernetes kubectl
- Python JSON/base64 token decoding

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Auth0 Locate JSON Web Key Sets: https://dev.auth0.com/docs/secure/tokens/json-web-tokens/locate-json-web-key-sets
- Auth0 Client Credentials Flow: https://dev.auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow
- Auth0 Get Access Tokens: https://auth0.com/docs/secure/tokens/access-tokens/get-access-tokens
- Auth0 JSON Web Token Claims: https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims
- Auth0 Actions overview: https://dev.auth0.com/docs/customize/actions/actions-overview
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The complete setup combined a broad `DENY` policy for unauthenticated requests with a separate `ALLOW` policy for health checks. In Istio, `DENY` policies are evaluated before `ALLOW`, and the existence of an `ALLOW` policy restricts non-matching traffic. That configuration would still deny unauthenticated health checks and could deny authenticated non-health requests. Changed the `DENY` rule to use `notPaths: ["/health", "/ready"]` and removed the separate health-check `ALLOW` policy from the complete setup.
- The JWT decode examples used `base64 -d` on the JWT payload segment. JWTs use base64url encoding and may omit padding, so that command can fail for valid tokens. Replaced it with a Python snippet that applies URL-safe base64 decoding and restores padding before parsing JSON.

## Review Notes
- `istioctl`, `kubectl`, `ruby`, and `yq` were not available in the local environment, so live CLI/schema validation could not be run here. The review was performed against official Istio, Auth0, and Kubernetes documentation.
- The post uses `apiVersion: security.istio.io/v1`, which is current in the Istio documentation reviewed.
