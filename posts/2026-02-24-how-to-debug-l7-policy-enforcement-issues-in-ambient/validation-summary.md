# Validation Summary: How to Debug L7 Policy Enforcement Issues in Ambient

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Istio ztunnel
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Kubernetes Gateway API
- kubectl and istioctl CLI commands
- Envoy RBAC and admin configuration

## Sources Consulted
- Istio ambient waypoint proxy guide: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient Layer 7 features guide: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio waypoint troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-waypoint/
- Istio ambient workload label reference: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said a waypoint can be configured at the service account level with `kubectl label serviceaccount ... istio.io/use-waypoint=waypoint`. Current Istio documentation lists `istio.io/use-waypoint` for resources such as Namespace, Service, Pod, WorkloadEntry, and ServiceEntry, not ServiceAccount. Changed the text and command to use a Service-level waypoint label.
- The ztunnel troubleshooting example parsed `localhost:15000/config_dump` directly and assumed a `services` JSON shape. Istio's waypoint troubleshooting documentation recommends `istioctl ztunnel-config service` / `services` to confirm the waypoint column. Changed the example to use `istioctl ztunnel-config services "$ZTUNNEL.istio-system" | grep backend`.
- The post said to "Enable access logging" but only showed `kubectl logs`, which checks logs rather than enabling access logging. Changed the wording to "If access logging is enabled" to avoid implying that the command enables logging.

## Review Notes
The remaining claims about destination waypoint L7 enforcement, `targetRefs` for waypoint-applied AuthorizationPolicy and RequestAuthentication resources, uppercase HTTP method handling, JWT `requestPrincipals`, and proxy status/config inspection are consistent with the current Istio 1.30 documentation. Future improvements could add a short note that waypoint labels apply to destination resources and that service-attached waypoints only process service-addressed traffic by default.
