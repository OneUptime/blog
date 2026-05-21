# Validation Summary: How to Configure L4 Authorization in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio ztunnel
- Istio AuthorizationPolicy
- Kubernetes
- Prometheus / PromQL

## Sources Consulted
- Istio ambient mode L4 policy guide: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio ambient mode L7 features guide: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio ambient authorization policy getting started guide: https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The migration section said ztunnel ignores L7 fields when no waypoint is present. Istio's ambient documentation says selector-targeted policies with L7 attributes are enforced by ztunnel and fail safe by becoming deny policies. Updated the wording to reflect fail-safe denial.
- The command for finding L7 policy fields searched for `headers:`, but Istio header matches are expressed as `request.headers[...]` conditions. Updated the grep pattern so it can find header-based rules.
- The metrics section used undocumented `ztunnel_tcp_authorization_allow_total` and `ztunnel_tcp_authorization_deny_total` metrics. Istio documents standard TCP metrics for ztunnel-only ambient traffic, including `istio_tcp_connections_opened_total` and `istio_tcp_connections_closed_total`. Updated the PromQL and alert example to use documented TCP metrics and `response_flags`.
- The ztunnel log command only searched for `authorization`, which is not the documented access-log wording. Broadened the grep pattern and adjusted the explanation so it does not promise an exact authorization log string.
- The `istioctl x authz check` example is documented for inspecting Envoy proxy authorization config. For ambient L4 ztunnel policy state, Istio documents `istioctl ztunnel-config policies`, so the command was updated.

## Review Notes
The AuthorizationPolicy YAML examples use the current `security.istio.io/v1` API and valid L4-compatible fields for ambient ztunnel enforcement. Policy behavior should still be verified with traffic tests and ztunnel logs/metrics because config propagation and workload enrollment affect the result.
