# Validation Summary: How to Implement Network-Based Access Control in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephX authentication and capabilities)
- Rook (Ceph operator for Kubernetes)
- Kubernetes NetworkPolicies
- Multus CNI
- Ceph RGW (RADOS Gateway)

## Sources Consulted
- Ceph User Management Documentation (capability grammar and `network` clause): https://github.com/ceph/ceph/blob/main/doc/rados/operations/user-management.rst
- Ceph PR #22879 introducing network-restricted capabilities (merged for Nautilus v14.2.0): https://github.com/ceph/ceph/pull/22879
- Rook CephCluster CRD Documentation (network configuration, `addressRanges`, `selectors`): https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Network Providers Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook CRD Specification (AddressRangesSpec, CIDRList types): https://rook.io/docs/rook/latest/CRDs/specification/
- Kubernetes NetworkPolicy Documentation (OR vs AND semantics for `from` items): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Ceph Messenger v2 Documentation (monitor ports 6789/3300): https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Rook Object Storage Documentation (RGW labels and default ports): https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found

### Issue 1: NetworkPolicy `from` array used OR semantics instead of AND (security issue)
- **What was wrong:** The NetworkPolicy for Ceph monitor access had `namespaceSelector` and `podSelector` as two separate items in the `from` array. Per Kubernetes NetworkPolicy semantics, separate `from` items are OR'd. This meant the policy allowed ALL pods from `myapp-namespace` (regardless of labels) OR any pod with `ceph-access: "true"` in the `rook-ceph` namespace — far more permissive than intended.
- **What was changed:** Combined both selectors into a single `from` item so they are AND'd. Now only pods with the `ceph-access: "true"` label from the `myapp-namespace` namespace are allowed.
- **Why:** The blog text and deployment example clearly intend to restrict access to specifically labeled pods in a specific namespace. The OR'd version defeats the purpose of the pod label restriction.

### Issue 2: Incorrect use of `selectors` for network CIDR configuration with `provider: host`
- **What was wrong:** The CephCluster network configuration used `selectors` with CIDR ranges (`public: "192.168.10.0/24"`) when `provider: host` was set. The `selectors` field is for Multus NetworkAttachmentDefinition names only, not CIDR ranges.
- **What was changed:** Replaced `selectors` with `addressRanges`, using the correct list-of-CIDRs format (`public: ["192.168.10.0/24"]`).
- **Why:** Per the Rook CephCluster CRD documentation, `addressRanges` is the correct field for specifying public/cluster network CIDRs with the `host` provider. The `selectors` field with CIDRs would not be recognized correctly by the Rook operator.

## Review Notes
- The Multus configuration example at the end of the post correctly uses `selectors` with NAD names, which is consistent with the fix applied to the host provider section.
- The CephX `network` capability restriction feature was introduced in Ceph Nautilus (v14.2.0). The post does not mention version requirements, which is fine for a modern audience since Nautilus is well past EOL and all current Ceph releases support this.
- The note about patching monitor services to ClusterIP is technically correct, but worth noting that the Rook operator manages these services and may revert manual patches. This is not a technical error, just a practical caveat.
