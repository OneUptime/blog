# Validation Summary: How to Configure Istio Request Authentication with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Istio
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- JSON Web Tokens
- OIDC/JWKS

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authentication policy task guide: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization guide: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The first RequestAuthentication manifest said it applied to all services in the namespace and mentioned "no selector", but the manifest includes a workload selector. I changed the comment to say it applies to workloads in the production namespace with the configured label, which matches Istio's selector behavior.

## Review Notes
- The Istio API versions, RequestAuthentication fields, JWT token locations, AuthorizationPolicy request principal enforcement, and Flux Kustomization fields are current and match the official documentation.
- The examples assume sidecar mode or selector-applicable gateway workloads. In Istio ambient mode, waypoint-targeted policy behavior can differ and may require targetRefs.
