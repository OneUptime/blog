# Validation Summary: How to Configure General Ceph Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec commands)
- CephCluster Custom Resource Definition (CRD)

## Sources Consulted
- Rook Network Providers documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Host Cluster documentation: https://rook.io/docs/rook/v1.14/CRDs/Cluster/network-providers/
- Ceph configuration reference (general knowledge of mon/osd settings)

## Issues Found
1. **Incorrect network YAML for host networking**: The original example used `selectors` with bare interface names (`eth0`, `eth1`) under `provider: host`. Per Rook documentation, selectors are only valid with `provider: multus` and require NetworkAttachmentDefinition references (e.g., `namespace/nad-name`), not interface names. For host networking, the correct field is `addressRanges` with CIDR blocks. Fixed the YAML to use `addressRanges` with the matching CIDRs from the `ceph.conf` example above it.

2. **Imprecise description of `mon_osd_min_in_ratio`**: The original text said "Set minimum number of OSDs that must be in before the cluster operates." This was inaccurate in two ways: (a) the setting is a ratio (fraction), not a number, and (b) it controls whether the monitors will automatically mark OSDs as `out`, not whether the cluster "operates." Fixed to: "Set the minimum ratio of OSDs that must remain `in` to prevent automatic OSD out-marking."

## Review Notes
- The `spec.cephConfig` field in the CephCluster CR was confirmed as valid per current Rook documentation. Note that Rook performs no validation on these config values — correctness is the user's responsibility.
- The Ceph configuration settings (`mon_osd_full_ratio`, `mon_osd_nearfull_ratio`, `mon_osd_backfillfull_ratio`, `mon_allow_pool_delete`, `osd_max_object_name_len`, `osd_max_object_namespace_len`) are all well-known, valid Ceph settings.
- The `osd_max_object_name_len` and `osd_max_object_namespace_len` settings are OSD-specific but setting them at the `global` level (as shown) is valid since global settings apply to all daemon types.
- The description mentions "authentication" in the post description but the post does not actually cover authentication settings. This is a minor metadata inconsistency, not a technical error in the content itself.
