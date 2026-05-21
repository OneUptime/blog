# Validation Summary: How to Extract JWT Claims for Authorization in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes custom resources
- RequestAuthentication
- AuthorizationPolicy
- JWT
- RBAC-style authorization
- Python base64/JSON decoding
- istioctl
- kubectl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- RFC 7519 JSON Web Token (JWT), linked from Istio's RequestAuthentication reference: https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The post said any JWT claim could be used in AuthorizationPolicy and described `request.auth.claims` as all claims. Istio's Authorization Policy Conditions reference states that `request.auth.claims` matching supports string and list-of-string claims. I narrowed the wording to supported string and string-list claims.
- The combined-claims example used `email_verified` as if a boolean JWT claim could be matched by writing `values: ["true"]`. Istio documents `request.auth.claims` condition matching for string and list-of-string claims, so I changed the example to use a string `tier` claim.
- The section titled "Negation with notValues" used a `DENY` policy with `values`, not `notValues`. The configuration itself was valid for denying banned statuses, so I changed the heading to "Denying Specific Claim Values" to match the example.
- The debugging checklist repeated the incorrect boolean-claim guidance. I replaced it with the documented string/list-of-string limitation.

## Review Notes
The remaining Istio API fields, AuthorizationPolicy rule semantics, nested claim syntax, array string-claim matching, `outputPayloadToHeader` behavior, request principal format, and `istioctl proxy-config log --level` usage were consistent with the current Istio 1.30 documentation.
