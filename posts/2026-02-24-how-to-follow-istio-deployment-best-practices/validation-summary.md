# Validation Summary: How to Follow Istio Deployment Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- IstioOperator
- Sidecar resources
- PeerAuthentication and mTLS
- Prometheus alerting
- HorizontalPodAutoscaler

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Global Mesh Options / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio PeerAuthentication task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl analyze` diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio certificate lifetime FAQ: https://istio.io/latest/about/faq/

## Issues Found
- The protocol selection section said unsupported or unnamed ports are always treated as opaque TCP. Istio first attempts automatic HTTP and HTTP/2 protocol detection, then falls back to plain TCP if it cannot determine the protocol. Updated the explanation to match the official protocol selection documentation.
- The supported protocol list omitted `mysql` and `redis`, which Istio documents alongside `mongo` as experimental application protocol support. Added them to the list.
- The PeerAuthentication section described namespace-level PERMISSIVE mode as needed for namespaces that communicate with non-mesh services. PeerAuthentication controls inbound authentication policy for workloads. Updated the text to say PERMISSIVE is for workloads that must accept both mesh mTLS and plaintext traffic from non-mesh clients.

## Review Notes
The remaining snippets use current Istio and Kubernetes API shapes. `istioctl` was not installed in the local workspace, so CLI validation was performed against the official Istio command reference rather than local `--help` output.
