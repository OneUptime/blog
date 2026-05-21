# Validation Summary: How to Implement Attribute-Based Access Control (ABAC) with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Kubernetes
- JWT authentication and claims
- istioctl debugging commands

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The path-based DENY rule was not scoped to a port. Istio treats missing HTTP attributes as matches for DENY rules on TCP traffic, so a DENY rule that uses HTTP attributes should specify a port to avoid denying unintended TCP traffic. I added `ports: ["8080"]` to the admin-path DENY operation.
- The payment example matched `request.auth.claims[account_verified]` against `"true"`. Istio authorization conditions support raw JWT claims of type string or list of string, so I clarified the comment to state that `account_verified` is expected to be a string claim set to `"true"`.

## Review Notes
The remaining AuthorizationPolicy and RequestAuthentication examples use current `security.istio.io/v1` APIs and valid fields. The examples assume mTLS is enabled where source identities, namespaces, and SPIFFE principals are matched, and assume a RequestAuthentication policy is applied before JWT-derived request principals and claims are used.
