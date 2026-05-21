# Validation Summary: How to Use Exclusion Matching in Authorization Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio security configuration
- Kubernetes
- Envoy RBAC debugging
- istioctl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The available exclusion fields list omitted `serviceAccounts` / `notServiceAccounts` and `trustDomains` / `notTrustDomains`, both documented Source fields. Added them to make the "every matching field" claim accurate.
- The `notHosts` example used `hosts` with a DENY rule and `notIpBlocks`, so it did not demonstrate `notHosts`. Changed the example to an ALLOW rule using `notHosts` and updated the explanatory sentence.
- The maintenance-mode and unauthenticated-write DENY examples used HTTP-only method matching without a port scope. Added example HTTP ports to align with Istio's guidance that DENY policies using HTTP attributes should be scoped to intended ports because missing HTTP attributes are treated as matches.
- The first `notIpBlocks` example claimed to allow all IPs except bad ranges but used `ipBlocks` in a DENY rule. Changed it to an ALLOW rule with `notIpBlocks`.
- The private-network example combined `notIpBlocks: ["0.0.0.0/0"]` with private `ipBlocks`, which could never match for IPv4 traffic. Changed it to a DENY rule that matches sources not in the private ranges.

## Review Notes
The examples assume mTLS is enabled where source identity fields such as `principals`, `namespaces`, and `serviceAccounts` are used, and request authentication is configured where JWT fields such as `requestPrincipals` and `request.auth.claims[...]` are used. `istioctl` was not installed locally, so CLI validation was performed against the official Istio command reference.
