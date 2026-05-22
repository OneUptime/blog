# Validation Summary: How to Configure Layer 4 Security Policy in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio ztunnel
- Istio AuthorizationPolicy
- Kubernetes workloads and ServiceAccounts
- kubectl
- istioctl

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio Layer 4 security policy guide: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio Layer 7 features in ambient mode: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The L4 ztunnel policy examples used `targetRefs` pointing at Kubernetes `Service` resources. Istio's current documentation describes selector-scoped policies for ztunnel-enforced L4 policy, while `targetRefs` to services are used for waypoint-attached policy. Replaced those `targetRefs` blocks with `selector.matchLabels` blocks for the matching Bookinfo workloads.
- The text said the policy controlled access to the reviews service. Updated it to say reviews workloads, matching the selector-based policy target.
- The `istioctl ztunnel-config policies` sample showed selector-based allow policies with namespace scope. Updated those rows to `WorkloadSelector`.
- The troubleshooting note said to check `targetRefs`. Updated it to check selector labels against workloads.
- The evaluation summary said any ALLOW policies in a namespace implicitly deny unmatched traffic. Istio evaluates ALLOW policy presence per targeted workload, so the text now says "for a workload."
- The performance section made absolute claims about negligible impact and internal compilation details. Softened this to a workload-dependent statement and removed the unverified implementation detail.

## Review Notes
The corrected post is accurate for Istio 1.30 documentation as of 2026-05-22. If the post is later expanded to cover waypoint proxies, `targetRefs` should be reintroduced only for waypoint-attached policies or other supported attachment cases.
