# Validation Summary: How to Debug L4 vs L7 Policy Issues in Ambient Mode

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Istio ambient mode
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- ztunnel
- waypoint proxies
- Kubernetes Gateway API
- kubectl
- istioctl

## Sources Consulted
- Istio ambient Layer 4 security policy documentation: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio ambient Layer 7 features documentation: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio ambient authorization policy getting started guide: https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio waypoint proxy configuration documentation: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio waypoint troubleshooting documentation: https://istio.io/latest/docs/ambient/usage/troubleshoot-waypoint/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/

## Issues Found
- Corrected the description of missing waypoint behavior. Current Istio documentation distinguishes between L7 policies that are not enforced because no waypoint handles the traffic and L7 attributes that are incorrectly targeted at ztunnel, which fail safe by denying traffic.
- Added `targetRefs` to L7 AuthorizationPolicy examples. Istio ambient waypoint policies must be attached with `targetRefs` to a Gateway or Service.
- Removed incorrect implication that a mixed L4/L7 policy automatically goes to a waypoint. It only does so when attached with `targetRefs`; otherwise ztunnel cannot evaluate the L7 attributes and denies matching traffic.
- Replaced `istioctl ztunnel-config authorization` with the current `istioctl ztunnel-config policies` command.
- Replaced the singular `targetRef` field with the correct `targetRefs` list field in the AuthorizationPolicy example.
- Updated the waypoint deployment command to include `--wait`, matching official examples for verifying readiness.
- Replaced the test client image with `nicolaka/netshoot` so the `nc` command in the example is available.
- Replaced direct Envoy admin `curl` from the waypoint container with `istioctl proxy-config ... -o json` inspection commands, avoiding reliance on `curl` being present inside the proxy container.
- Updated the ztunnel log command to reference the pod namespace using the documented `<pod-name>.<namespace>` form.

## Review Notes
The examples are intentionally generic and assume a `backend-svc` Service in the `backend` namespace and a namespace waypoint named `waypoint`. In a real cluster, readers should verify the effective waypoint attachment with `istioctl ztunnel-config service` or `istioctl ztunnel-config workload` when troubleshooting service-specific or pod-specific waypoint enrollment.
