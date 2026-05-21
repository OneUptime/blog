# Validation Summary: How to Fix Authorization Policy Denying Legitimate Requests

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio mutual TLS and workload identity
- Kubernetes workloads and service accounts
- Envoy RBAC logging
- istioctl and kubectl troubleshooting commands

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio Ingress Access Control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Security Problems troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Application Requirements port reference: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/

## Issues Found
- The health-check allow rule only listed port 15021. Istio also rewrites Kubernetes application probes to the sidecar agent on port 15020 by default, while 15021 is used for sidecar status checks. Updated the example and explanation to include both ports and to note that disabled probe rewrite requires allowing the original application probe.
- The IP-based rules section incorrectly implied that mTLS makes the source IP appear as 127.0.0.1. Istio documents `ipBlocks` as matching the source address of the IP packet and `remoteIpBlocks` as matching the original client IP from X-Forwarded-For or PROXY protocol. Rewrote the guidance to match those semantics and mention trusted proxy/gateway topology configuration.
- The path matching section described glob-style segment matching and claimed `/api/v1/*` does not match deeper paths. Istio plain string matches use exact, prefix, suffix, and presence matching, so a trailing `*` is a prefix match. Updated the explanation to use Istio path template operators `{*}` and `{**}` for segment-aware matching.
- The `istioctl analyze` section overstated analyzer coverage by saying it catches nonexistent service accounts and conflicting policies. Updated it to accurately mention schema problems and selectors with no matching workloads.

## Review Notes
The core AuthorizationPolicy evaluation order, DENY precedence, default-deny behavior after applying ALLOW policies, source principal format, namespace/root namespace policy scoping, RBAC debug logging commands, and sidecar enforcement model match current Istio documentation. The post does not pin an Istio version, so the validation used the current `latest` Istio documentation available on 2026-05-21.
