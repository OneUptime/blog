# Validation Summary: How to Configure All RequestAuthentication Fields in Istio

## Status
validated

## Post Type
Technical reference guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Kubernetes custom resources
- JSON Web Tokens
- JWKS and OpenID Connect discovery
- istioctl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The examples used `security.istio.io/v1beta1`; updated them to `security.istio.io/v1`, which is the current stable API version shown in Istio's current examples.
- The top-level example used both `selector` and `targetRef`, which is invalid because selector-based and target-based policy attachment are mutually exclusive. Removed the target attachment from that example.
- The post used singular `targetRef`; updated it to `targetRefs`, the current documented field, and represented it as a list.
- The target reference explanation listed only Gateway and Service. Updated it to include the currently documented supported target types and group requirements.
- The JWKS section said inline `jwks` takes precedence over `jwksUri` when both are provided. Updated it to state that only one should be used.
- The audiences section said an empty `audiences` list accepts any audience. Updated it to match Istio documentation, which says the service name is accepted when audiences is empty.
- The token location section described a deterministic headers-then-params-then-cookies search order. Updated it because Istio documents that requests with multiple tokens in different locations are unsupported and the resulting principal is undefined.
- The claim-to-header example used a likely array-valued `groups` claim. Updated it to a scalar `role` claim and clarified that only string, integer, and boolean claims are supported.
- The post claimed to cover every RequestAuthentication field but omitted `spaceDelimitedClaims`. Added a concise section for that field.

## Review Notes
The `istioctl x describe pod <pod-name> -n <namespace>` command is valid as shorthand for `istioctl experimental describe pod`, but the official docs mark this command as under active development and not ready for production use.
