# Validation Summary: How to Use Ceph Storage with Istio Service Mesh

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Istio (service mesh)
- Envoy proxy (Istio data plane)
- Kubernetes (namespaces, deployments, annotations)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Ceph CSI (Container Storage Interface drivers)
- mTLS (mutual TLS)

## Sources Consulted
- Istio documentation on sidecar injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio ServiceEntry documentation: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Rook-Ceph documentation on Istio integration: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/istio/
- Kubernetes CSI documentation: https://kubernetes-csi.github.io/docs/

## Issues Found

### 1. Incorrect mention of ServiceEntry (line 55)
- **What was wrong:** The text stated "create a ServiceEntry and VirtualService" but only showed a VirtualService. Since `rook-ceph-rgw-my-store` is an in-cluster Kubernetes service, no ServiceEntry is needed (ServiceEntry is for registering external services into the mesh).
- **What was changed:** Updated text to "create a VirtualService with appropriate timeout and retry settings."
- **Why:** Mentioning ServiceEntry is misleading and could cause readers to look for a missing configuration example.

### 2. Incorrect CSI/mTLS explanation (line 117)
- **What was wrong:** The text stated "pods accessing Ceph via CSI must be in the mesh." CSI storage access operates at the node/kernel level — the kubelet invokes the CSI driver (ceph-csi), which communicates directly with Ceph monitors and OSDs using Ceph's native protocol. This I/O path goes through the kernel (mounted filesystem or block device), not through the pod's network namespace where Envoy operates. Istio mTLS has no effect on CSI-based storage access.
- **What was changed:** Reworded to explain that non-meshed clients accessing Ceph services like RGW over the network will be rejected by strict mTLS, and PERMISSIVE mode allows both mTLS and plaintext traffic.
- **Why:** The original explanation conflated network-level service access (where mTLS applies) with kernel-level storage I/O (where it does not), which could confuse readers about when PERMISSIVE mode is actually needed.

### 3. Incorrect summary claim about CSI node plugins (line 132)
- **What was wrong:** The summary stated "allow unauthenticated traffic from CSI node plugins," repeating the same CSI misconception from issue #2.
- **What was changed:** Updated to "allow non-meshed clients to access Ceph services like RGW over the network."
- **Why:** Consistency with the corrected explanation above.

## Review Notes
- The Istio API versions used (`networking.istio.io/v1beta1` and `security.istio.io/v1beta1`) are still supported but newer Istio versions (1.22+) also offer `v1` for these resources. The `v1beta1` versions remain functional and are not deprecated, so no change was made.
- The VirtualService and Gateway YAML configurations are structurally correct and follow standard Istio patterns.
- The `retryOn: 5xx` value is valid Istio retry policy syntax.
- The namespace labeling approach (`istio-injection=disabled`) is the standard and recommended method for excluding namespaces from Istio sidecar injection.
- The pod-level annotation `sidecar.istio.io/inject: "false"` is the correct annotation for per-pod injection control.
