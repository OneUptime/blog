# Validation Summary: How to Handle Authorization Policy Ordering and Precedence

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio security policy actions: CUSTOM, DENY, ALLOW, AUDIT
- Kubernetes custom resources
- istioctl debugging commands
- Envoy RBAC logging

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The flowchart treated the existence of any CUSTOM policy as the decision point. Istio evaluates CUSTOM policies when their rules match the request, so the flowchart now says "Any CUSTOM policy matches?".
- The post omitted AUDIT when describing Istio authorization actions. Added a short clarification that AUDIT marks matching requests for audit but does not affect allow/deny decisions.
- The closing shorthand said "CUSTOM beats DENY beats ALLOW", which could imply a CUSTOM allow bypasses DENY or ALLOW. Updated it to say matching CUSTOM policies are checked before DENY and ALLOW, while DENY still wins over ALLOW.
- The DENY examples matched HTTP methods without scoping to a port. Istio treats missing HTTP attributes as matches for DENY rules on TCP traffic, so the examples now scope DELETE matches to port 8080.

## Review Notes
- The post focuses on selector-based workload policies. Current Istio also supports targetRefs for Gateway, GatewayClass, Service, and ServiceEntry attachment, with waypoint-specific behavior.
- `istioctl` was not installed in the local workspace, so CLI verification was performed against the official Istio command reference instead of local `--help` output.
