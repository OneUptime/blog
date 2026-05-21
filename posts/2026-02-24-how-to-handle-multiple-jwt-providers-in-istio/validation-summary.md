# Validation Summary: How to Handle Multiple JWT Providers in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JSON Web Tokens (JWT)
- JWKS
- Kubernetes kubectl
- Mermaid diagrams

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- RFC 7519, JSON Web Token (JWT): https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The post incorrectly stated that a JWT with an unknown issuer is treated as if no token was provided and passes through without a principal. Istio's RequestAuthentication rejects JWTs whose `iss` claim does not match the configured issuer. I updated the diagram and the "Handling Unknown Issuers" section to say that unknown-issuer tokens are rejected, while requests with no JWT credentials pass through without a request principal unless AuthorizationPolicy requires one.
- The AuthorizationPolicy example in that section was named `deny-unknown`, which no longer accurately described the behavior after the correction. I renamed it to `deny-without-principal`.

## Review Notes
- The RequestAuthentication examples use current `security.istio.io/v1` fields including `jwtRules`, `issuer`, `jwksUri`, `audiences`, `fromHeaders`, `fromParams`, and `forwardOriginalToken`.
- The AuthorizationPolicy examples use the documented `<ISS>/<SUB>` request principal format and supported wildcard matching.
- The custom-header Keycloak test sends the raw JWT value, which matches a `fromHeaders` rule without a configured prefix.
