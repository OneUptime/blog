# Validation Summary: How to Harden Istio Data Plane Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar data plane
- Envoy proxy
- Kubernetes Deployments, security contexts, and NetworkPolicy
- Istio CNI
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio Sidecar
- Istio ServiceEntry
- Istio Telemetry API
- IstioOperator and mesh configuration
- istioctl

## Sources Consulted
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The first IstioOperator example was described as configuring the sidecar security context, but the snippet only sets proxy privilege/resource defaults and proxy metadata. Updated the wording so it accurately describes what the configuration does.
- The workload override paragraph implied annotations override the whole security context. The annotations shown only set sidecar CPU and memory limits, while the `securityContext` is for the application container. Updated the wording to distinguish those concerns.
- The Istio CNI install snippet included an unrelated `sidecarInjectorWebhook.injectedAnnotations` block under `values.cni`. Replaced it with the official CNI component shape, including the CNI namespace and `values.cni.excludeNamespaces`.
- The Sidecar scoping section implied configuration scoping is an enforcement boundary. Istio documents Sidecar scoping as generated proxy configuration pruning, not an outbound firewall. Added that caveat.
- The external HTTPS ServiceEntry used `protocol: HTTPS`. Istio's current external HTTPS example uses `protocol: TLS` for SNI-based routing without terminating TLS. Updated the snippet to `TLS`.
- The outbound restriction section stated that `REGISTRY_ONLY` prevents compromised workloads from reaching arbitrary external endpoints. Istio documents that this mode is not an outbound security policy. Updated the explanation to describe failure of unknown destinations through the sidecar and recommend combining it with egress or network controls.
- The admin-port section was titled "Disable Admin Ports" but the snippet set `proxyAdminPort: 15000`, which is the default Envoy admin port. Renamed the section and corrected the explanation to focus on restricting exposure and avoiding untrusted containers in sidecar pods.

## Review Notes
The Istio APIs used in the examples are current for the latest Istio documentation reviewed. `istioctl x authz check` is available but documented under experimental commands, so operators should expect its output and behavior to be diagnostic rather than a stable application interface.
