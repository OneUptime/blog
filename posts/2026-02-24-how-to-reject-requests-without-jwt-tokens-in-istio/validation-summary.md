# Validation Summary: How to Reject Requests Without JWT Tokens in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes custom resources
- RequestAuthentication
- AuthorizationPolicy
- JWT authentication
- SPIFFE identities
- kubectl
- istioctl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The "Allowing Public Endpoints" example used an ALLOW policy for public paths together with a DENY policy for requests without request principals. Istio evaluates DENY before ALLOW, so token-less requests to public paths would still be denied. Changed the example to use a single DENY policy with `notPaths` exceptions.
- The service-to-service internal traffic example used an ALLOW policy for internal traffic together with a DENY policy. Because the presence of an ALLOW policy causes unmatched traffic to be denied, external requests with valid JWTs would not be allowed by that example. Removed the ALLOW policy and kept a single DENY rule using both `notRequestPrincipals` and `notPrincipals`.
- The method-specific example used an ALLOW policy for public reads plus a DENY policy for unauthenticated writes. Valid authenticated writes would still be denied because they did not match the ALLOW policy. Changed the example to a single DENY policy that applies only to unauthenticated write methods.
- The final takeaway suggested adding ALLOW rules for public endpoints while recommending the DENY pattern. Updated it to recommend path or method exceptions instead.

## Review Notes
The core explanation is correct: `RequestAuthentication` validates JWTs but does not, by itself, require a token, and `AuthorizationPolicy` is needed to enforce access based on `requestPrincipals` or `notRequestPrincipals`. The examples use current `security.istio.io/v1` APIs. One operational caveat for future improvement: DENY rules that rely on HTTP attributes should be scoped carefully when TCP traffic may also reach the selected workloads, because missing HTTP attributes can match DENY rules.
