# Validation Summary: How to Configure L7 Authorization in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio AuthorizationPolicy
- Istio waypoint proxies
- ztunnel
- Kubernetes Gateway API
- Prometheus / PromQL
- kubectl and istioctl

## Sources Consulted
- Istio ambient waypoint proxy documentation: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient Layer 7 features documentation: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio ambient Layer 4 security policy documentation: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio waypoint troubleshooting documentation: https://istio.io/latest/docs/ambient/usage/troubleshoot-waypoint/

## Issues Found
- Waypoint creation did not enroll the namespace. Updated the setup command to use `istioctl waypoint apply --namespace default --enroll-namespace`, because deployed waypoints are not used until a namespace, service, or pod is explicitly configured to use them.
- L7 AuthorizationPolicy examples used workload `selector`. Updated waypoint-enforced L7 examples to use `targetRefs` pointing at Services, because waypoint policies in ambient mode are attached with `targetRefs`; selector policies are not applied by waypoint proxies for L7 enforcement.
- JWT-claim authorization was mentioned without noting request authentication. Clarified that JWT claims require request authentication to be configured first.
- The service-account-scoped waypoint command used a non-current `--service-account` flag. Reworked the section as service-scoped waypoint configuration using a named waypoint and the `istio.io/use-waypoint` service label.
- The PromQL examples used `app="waypoint"` and implied `request_path` is a standard metric label. Updated the waypoint filter to use the standard `destination_workload` label and clarified that path breakdown requires an explicit custom Telemetry tag.
- The debugging commands checked authorization on the application deployment and used `istioctl x describe pod` for waypoint association. Updated the examples to inspect the waypoint deployment with `istioctl x authz check` and verify service waypoint association with `istioctl ztunnel-config service`.

## Review Notes
The latency estimate remains workload-dependent and should be treated as guidance rather than a guarantee. The post does not pin an Istio version; the review used current Istio latest documentation, which is versioned as Istio 1.30 at the time of validation.
