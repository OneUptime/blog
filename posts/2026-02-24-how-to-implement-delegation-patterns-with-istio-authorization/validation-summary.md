# Validation Summary: How to Implement Delegation Patterns with Istio Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes service accounts
- JWT-based authentication and claims
- kubectl exec

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- Service principal matching was shown without noting the mTLS requirement. Added a caveat that examples using `principals` assume mutual TLS is enabled because Istio derives source principals from peer certificates.
- The service account delegation section said Istio validates the delegation token at the mesh level. Updated the explanation to clarify that the shown AuthorizationPolicy only enforces configured header matches and that a real delegation token still needs signature and expiry validation in application code or an external authorization service.
- Header presence checks used `notValues: [""]`. Replaced those with the documented Istio presence match `values: ["*"]` for non-empty delegation and impersonation headers.
- The impersonation example used a VirtualService to set `x-original-user` from `%REQ(authorization)%`, while later policies checked `x-impersonated-user`. Replaced it with a RequestAuthentication example using `outputClaimToHeaders` to copy the validated JWT `sub` claim into `x-impersonated-user`.
- The Envoy Lua filter used the outdated `inlineCode` field. Updated it to the current Envoy v3 Lua configuration shape with `defaultSourceCode.inlineString`.

## Review Notes
- The examples are valid patterns for HTTP workloads in sidecar mode. They remain illustrative and assume matching service account names, namespaces, trust domain, JWT issuers, and JWKS endpoints exist in the reader's environment.
- EnvoyFilter is powerful but low-level and can be sensitive to Istio and Envoy version changes; readers should test filters against their deployed Istio version before production use.
