# Validation Summary: How to Configure Multus Network Selectors in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Multus CNI (multiple network interface plugin for Kubernetes)
- Kubernetes NetworkAttachmentDefinitions (NADs)
- kubectl CLI

## Sources Consulted
- Rook official documentation: Network Providers — Multus section (https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/)
- Rook source code: `NetworkSpec` Go type definitions confirming `selectors` field structure and `provider` values
- Rook design document: `design/ceph/multus-network.md` — confirms `public` and `cluster` as the two hardcoded selector keys with `namespace/nad-name` format
- Multus CNI documentation — confirming `k8s.v1.cni.cncf.io/networks` annotation key
- Ceph documentation — confirming public vs. cluster network semantics

## Issues Found

### Issue 1: Incorrect fallback behavior for cluster network (line 53)
- **What was wrong:** The post stated "OSD replication traffic uses the primary Kubernetes pod network" when only the `public` selector is specified.
- **What was changed:** Corrected to "OSD replication traffic uses the same public Multus network rather than a separate cluster network."
- **Why:** Per official Rook documentation, when the `cluster` selector is unspecified, the public network is used for replication traffic — not the Kubernetes pod network. The pod network is only used when neither selector is specified.

### Issue 2: Unsupported label-based selector feature (entire "Using Labels as Selectors" section)
- **What was wrong:** The post included a section claiming Rook supports label-based selectors (e.g., `"network-type=ceph-public"`) in the `spec.network.selectors` field.
- **What was changed:** The entire "Using Labels as Selectors" section was removed.
- **Why:** The Rook `selectors` field is typed as `map[string]string` and only accepts values in `namespace/nad-name` format. No official documentation, source code, or design documents reference label-based selector support. Including this section would mislead users into using a non-functional configuration.

## Review Notes
- The YAML configuration examples for basic, public-only, and cluster-only setups are correct and match the official Rook CephCluster CR schema.
- The verification commands (checking pod annotations, inspecting network interfaces, `ceph mon dump`) are accurate and represent good operational practice.
- The Multus DaemonSet troubleshooting check (`kubectl -n kube-system get pods -l app=multus`) is a reasonable approach, though the exact label may vary by Multus installation method.
- The `network-attachment-definition` resource name used in `kubectl get` commands is correct for the Multus CRD.
