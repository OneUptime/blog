# Validation Summary: How to Configure All PeerAuthentication Fields in Istio

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS
- Kubernetes workloads and probes
- Istio `istioctl`

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl describe` diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio health checking guide: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/

## Issues Found
- Updated all PeerAuthentication examples from `security.istio.io/v1beta1` to the current documented `security.istio.io/v1` API version.
- Clarified that mesh-wide PeerAuthentication policies belong in the Istio root namespace, commonly `istio-system`, rather than assuming `istio-system` is always the root namespace.
- Added the current root namespace caveat that PeerAuthentication policies with workload selectors are ignored there.
- Clarified that `portLevelMtls` applies only when a workload selector is specified and that the port number is the workload port, not the Kubernetes Service port.
- Replaced the port-level mTLS exception example for port `15021` with a workload health check port and clarified Istio's default probe rewrite behavior. Port `15021` is the sidecar status port, while `portLevelMtls` is for workload ports.
- Updated the `istioctl proxy-config listeners` command to use `-o json`, because the default short output is not where readers would inspect `transport_socket`.

## Review Notes
The post focuses on sidecar-mode behavior. Istio's current PeerAuthentication reference also notes ambient-mode behavior, including that `DISABLE` mode is not supported in ambient mode; that would be a useful future caveat if the article expands beyond sidecars.
