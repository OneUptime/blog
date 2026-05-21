# Validation Summary: How to Route Traffic to Different Services Based on User Identity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule subsets
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Kubernetes custom resources
- JWT claim extraction and HTTP header matching

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio security concepts: https://istio.io/latest/docs/concepts/security/

## Issues Found
- Updated all VirtualService examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version used by the official Istio reference.
- Corrected the statement that Istio does not have built-in user authentication. Istio supports request authentication for JWT validation, but does not manage application login sessions or user accounts.
- Added a caveat that routes using `subset` require the corresponding subsets to be defined in a matching `DestinationRule`, as required by Istio routing semantics.

## Review Notes
- The `outputClaimToHeaders` field is supported for copying individual JWT claims into request headers after successful token validation, but the Istio reference marks it as experimental.
- The AuthorizationPolicy example is syntactically valid, but it depends on a RequestAuthentication policy when using `requestPrincipals`.
