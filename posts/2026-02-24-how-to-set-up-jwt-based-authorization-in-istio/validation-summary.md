# Validation Summary: How to Set Up JWT-Based Authorization in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JWT claims and request principals
- Kubernetes kubectl
- istioctl proxy-config and analyze
- curl and jq

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Corrected the response-code explanation for failed JWT requests. Missing tokens are denied by the AuthorizationPolicy with 403, while invalid tokens are rejected by RequestAuthentication before authorization evaluation, typically with 401.
- Clarified that public and health-check ALLOW rules remove the JWT requirement for requests without tokens, but do not allow malformed or invalid tokens through RequestAuthentication.
- Replaced the JWT payload decode command with a base64url-aware jq command. JWT segments use base64url encoding and may be unpadded, so plain `base64 -d` is not reliable for all valid JWTs.
- Changed the `istioctl proxy-config listener` example from `deploy/api-service` to `deployment/api-service`, matching the resource form shown in the official istioctl command reference.

## Review Notes
The Istio security API snippets use the current `security.istio.io/v1` resources and valid fields. Claim matching with `request.auth.claims[...]`, list-of-string claims, `requestPrincipals`, `principals`, `notPaths`, and DENY-before-ALLOW behavior are consistent with current Istio documentation.
