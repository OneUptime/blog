# Validation Summary: How to Configure Istio Authorization Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio external authorization providers
- Kubernetes custom resources
- Envoy RBAC logging
- JWT-based authorization

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio dry-run authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- Updated all Istio security API examples from `security.istio.io/v1beta1` to the current documented `security.istio.io/v1` API version.
- Clarified the opening authorization description because AuthorizationPolicy can enforce L4 rules and HTTP-specific L7 rules, rather than being only Layer 7.
- Corrected the evaluation order summary to include Istio's documented behavior when no ALLOW policy applies and when ALLOW policies apply but none match.
- Replaced the JWT `email_verified` boolean claim example with a string `email` claim match, because Istio AuthorizationPolicy raw JWT claim conditions support string and list-of-string claims.
- Added port scoping to DENY and CUSTOM examples that match HTTP paths, because Istio treats missing HTTP attributes as matches for DENY and CUSTOM on TCP traffic.
- Corrected the debugging section from "Enable access logging" to "Enable RBAC debug logging" and changed RBAC log patterns to the documented `enforced denied`, `shadow denied`, and `enforced allowed` forms.
- Corrected the dry-run section to use the `istio.io/dry-run: "true"` annotation on an ALLOW or DENY policy instead of using the AUDIT action as a dry-run mechanism.

## Review Notes
The examples assume sidecar-mode policy enforcement and mutual TLS where source principals or namespaces are used. In ambient mode, policies attached with selectors may not apply to waypoint traffic in the same way; Istio's current docs recommend target references for waypoint-attached policies.
