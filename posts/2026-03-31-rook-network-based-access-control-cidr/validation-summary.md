# Validation Summary: How to Configure Network-Based Access Control (CIDR) in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephX authentication, RADOS, capability strings)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (pod CIDR, NetworkPolicy, kubectl)

## Sources Consulted
- Ceph official documentation: User Management / Authorization (Capabilities) — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph official documentation: Auth subsystem and network restrictions in capability strings — https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/
- Ceph official documentation: rados man page — https://docs.ceph.com/en/latest/man/8/rados/
- Linux errno definitions (EPERM vs EACCES)
- Prior validated posts in this blog (`rook-restrict-users-to-specific-namespaces`, `rook-restrict-users-to-specific-pools`) for error code precedent

## Issues Found
1. **Incorrect error code and output format for CephX network restriction denial**: The post stated that accessing Ceph from an unauthorized network would produce `RADOS returned error: -13 (Permission denied)`. CephX capability/authorization failures (including network restriction violations) return EPERM (errno 1, "Operation not permitted"), not EACCES (errno 13, "Permission denied"). The rados tool also uses the format `error listing <pool>: (1) Operation not permitted`. Fixed the error output accordingly.

## Review Notes
- The post states network restrictions are "configured in the OSD capability string" which is the most common use case, but the `network` keyword can also be applied to monitor, MDS, and manager capability strings. This is not incorrect (the post never claims it is OSD-only), but could be expanded in a future update.
- The `kubectl cluster-info dump | grep -m1 cluster-cidr` command works for kubeadm-style clusters where kube-controller-manager runs as a visible pod. For managed Kubernetes services (EKS, GKE, AKS), the control plane may not be visible in the dump output and alternative methods may be needed. This is acceptable as a general-purpose approach.
- The Limitations section correctly notes that in Kubernetes environments, the IP seen by the OSD may be the node IP rather than the pod IP, and recommends combining with NetworkPolicy for defense in depth. This is accurate and important guidance.
