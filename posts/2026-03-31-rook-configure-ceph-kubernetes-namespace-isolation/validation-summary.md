# Validation Summary: How to Configure Ceph for Kubernetes Namespace Isolation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (storage operator for Kubernetes)
- Kubernetes StorageClasses (storage.k8s.io/v1)
- Kubernetes ResourceQuotas (per-StorageClass quotas)
- Kubernetes NetworkPolicies (networking.k8s.io/v1)
- Ceph authentication (ceph auth get-or-create)
- Ceph RBD CSI driver (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Rook Ceph StorageClass documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Kubernetes NetworkPolicy documentation (https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- Kubernetes ResourceQuota documentation (https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- Ceph authentication documentation (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Kubernetes namespace labels documentation (https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#automatic-labelling)

## Issues Found

### Issue 1: Section title incorrectly called ResourceQuotas "RBAC"
- **What was wrong:** The section "Applying RBAC to Restrict StorageClass Access" described ResourceQuotas, not RBAC. RBAC (Role-Based Access Control) involves Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings. ResourceQuotas are a separate admission control mechanism for limiting resource consumption.
- **What was changed:** Renamed section title to "Applying ResourceQuotas to Restrict StorageClass Access". Also removed "RBAC" from the summary paragraph's mention of "RBAC ResourceQuotas".
- **Why:** Conflating ResourceQuotas with RBAC is a technical inaccuracy that could confuse readers about which Kubernetes mechanisms are being used.

### Issue 2: Egress NetworkPolicy missing DNS rule
- **What was wrong:** The `allow-rgw-egress` NetworkPolicy only allowed egress to the rook-ceph namespace on TCP port 80. By specifying `policyTypes: [Egress]`, this policy restricts all egress from selected pods to only the listed rules. This blocked DNS resolution (UDP/TCP port 53 to CoreDNS in kube-system), meaning pods could not resolve any hostnames, including the RGW service endpoint.
- **What was changed:** Added an egress rule allowing UDP and TCP port 53 to the kube-system namespace (using the `kubernetes.io/metadata.name: kube-system` label selector) so pods can resolve DNS.
- **Why:** Without DNS egress, the configuration is broken in practice. Pods cannot resolve service names, and the verification curl test would fail due to DNS failure rather than the intended network isolation.

## Review Notes
- The StorageClass omits optional parameters `imageFormat` and `imageFeatures`, which have reasonable defaults in the CSI driver. This is fine but could be noted for production deployments that need specific RBD image features.
- The deny-cross-namespace NetworkPolicy is only shown for the team-a namespace. In a real deployment, the same policy should be applied to all tenant namespaces (team-b, etc.) for full bidirectional isolation. The post's verification test (curl from team-a to team-b) relies on the egress restriction on team-a, not on an ingress restriction on team-b.
- The `kubernetes.io/metadata.name` label used in namespaceSelector is automatically set on namespaces in Kubernetes 1.21+. Clusters running older versions would need manual namespace labeling.
