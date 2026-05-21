# Validation Summary: How to Explicitly Deny Traffic with Authorization Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio DENY, ALLOW, CUSTOM, and AUDIT authorization actions
- Kubernetes custom resources and kubectl
- istioctl debugging commands
- Envoy RBAC logging
- JWT claim-based authorization

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts and authorization policy precedence: https://istio.io/latest/docs/concepts/security/
- Istio explicit deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said Istio evaluates DENY policies first. Current Istio evaluates CUSTOM first, then DENY, then ALLOW, while AUDIT does not affect allow/deny decisions. Updated the evaluation order section and the debugging reminder to reflect the official precedence.
- The service principal example did not mention that `principals` are derived from peer certificates and require mTLS. Added that prerequisite.
- The namespace-based DENY example did not mention that `source.namespaces` matching requires mTLS. Added that caveat.
- The JWT claim-based DENY example did not mention that JWT identity and claims require a RequestAuthentication policy. Added that prerequisite.

## Review Notes
The YAML snippets use the current `security.istio.io/v1` AuthorizationPolicy API and valid fields. The `kubectl` and `istioctl proxy-config log --level rbac:debug` commands are consistent with the current Istio documentation. Future revisions could add a TCP-port caveat for DENY policies that use HTTP-only attributes, because Istio treats missing attributes as matches for DENY rules on TCP traffic.
