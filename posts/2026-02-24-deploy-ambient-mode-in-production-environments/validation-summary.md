# Validation Summary: How to Deploy Ambient Mode in Production Environments

## Status
validated

## Post Type
Production operations guide

## Technologies Covered
- Istio ambient mode
- Kubernetes
- Helm
- ztunnel
- Istio waypoint proxies
- Prometheus
- Grafana
- Istio Telemetry API
- Istio security APIs

## Sources Consulted
- Istio ambient install with Helm: https://istio.io/latest/docs/ambient/install/helm/
- Istio ambient upgrade with Helm: https://istio.io/latest/docs/ambient/upgrade/helm/
- Istio waypoint proxy usage: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient workload labels and cleanup: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio Layer 4 security policy in ambient mode: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio security best practices for default-deny and waypoints: https://istio.io/latest/docs/ops/best-practices/security/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio ztunnel Helm chart values: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/ztunnel/values.yaml
- Istio ztunnel DaemonSet template: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/ztunnel/templates/daemonset.yaml
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The ztunnel Helm values example used `maxUnavailable: 1`. Current Istio ztunnel chart defaults use DaemonSet surge updates with `maxSurge: 1` and `maxUnavailable: 0`, and the Istio upgrade guide warns that in-place ztunnel upgrades can briefly disrupt ambient traffic on a node. Updated the snippet and explanatory text.
- The ztunnel sizing example used a `128Mi` memory request. Current ztunnel chart defaults request `512Mi`, with the chart noting this is intended for large cluster and connection counts. Updated the baseline request to `512Mi`.
- The Prometheus waypoint latency alert used `reporter="waypoint"`, but Istio standard metrics define `reporter` as `source` or `destination`. Updated the query to match waypoint source reporting with `reporter="source"` and a waypoint workload label selector.
- The connection-denial alert treated `connection_security_policy="unknown"` on closed TCP connections as denials. Istio documents that `unknown` is used for source reports where the security policy cannot be populated, not as a denial indicator. Replaced the alert with an HTTP authorization-denial query based on 403 responses with RBAC response flags.
- The default-deny guidance did not mention Istio's waypoint-specific default-deny pattern. Added the official `GatewayClass`-targeted `AuthorizationPolicy` example for `istio-waypoint`, while keeping the existing namespace-level default-deny policy.

## Review Notes
The post is technically relevant and mostly aligned with current Istio ambient guidance. Helm, IstioOperator, Gateway API, Telemetry, PeerAuthentication, AuthorizationPolicy, HPA, PDB, and RBAC snippets use current API versions. Helm and kubectl were not installed in the local environment, so command validation was performed against official Istio and Kubernetes-facing documentation rather than local CLI help.
