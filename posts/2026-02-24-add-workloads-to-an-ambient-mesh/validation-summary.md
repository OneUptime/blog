# Validation Summary: How to Add Workloads to an Ambient Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio ztunnel and HBONE
- Istio PeerAuthentication
- istioctl
- Kubernetes namespaces, pods, Deployments, and labels
- kubectl

## Sources Consulted
- Istio documentation: Add workloads to the mesh - https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio documentation: Verify mutual TLS is enabled - https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio documentation: Ambient data plane - https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio documentation: Ambient and the Istio control plane - https://istio.io/latest/docs/ambient/architecture/control-plane/
- Istio documentation: Resource labels - https://istio.io/latest/docs/reference/config/labels/
- Istio documentation: PeerAuthentication - https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes documentation: kubectl label reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The `apps/v1` Deployment examples omitted `spec.selector`, which is required in current Kubernetes Deployments. Added matching `spec.selector.matchLabels` entries to both Deployment snippets.
- The namespace enrollment text said every pod was instantly part of the ambient mesh. Updated it to say eligible pods are added within a short time and noted the official exceptions for pod opt-out labels and sidecar mode precedence.
- The `istioctl ztunnel-config workloads` example omitted the current `WAYPOINT` column. Updated the sample output to include `WAYPOINT`.
- The explanation of `HBONE` implied that HBONE alone proves all plaintext is rejected. Updated it to match Istio documentation: HBONE means the workload is configured to send and accept HBONE traffic, while plaintext rejection requires `PeerAuthentication` with `STRICT` mode.
- The non-mesh-to-ambient description implied source-side ztunnel involvement. Updated it to reflect that non-mesh pods send directly to the destination pod, while destination ztunnel enforces L4 policy and may accept plaintext unless policy rejects it.
- The behind-the-scenes flow said istiod "notifies" ztunnel and that certificates come directly from istiod. Updated the wording to the official xDS-based control-plane relationship and workload certificate handling.

## Review Notes
The post focuses on L4 ambient enrollment and verification. Future improvements could mention waypoint proxies for L7 features, but that is outside the scope of this article and was not necessary for correctness.
