# Validation Summary: How to Set Up Multus CNI for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator for Ceph)
- Ceph (distributed storage system)
- Multus CNI (multi-network Kubernetes plugin)
- Whereabouts IPAM (IP address management for CNI)
- Macvlan CNI plugin
- Kubernetes NetworkAttachmentDefinitions
- Ceph CSI driver

## Sources Consulted
- Rook Network Providers documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/network-providers/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Multus network design: https://github.com/rook/rook/blob/master/design/ceph/multus-network.md
- Multus CNI quickstart: https://github.com/k8snetworkplumbingwg/multus-cni/blob/master/docs/quickstart.md
- Whereabouts IPAM: https://github.com/k8snetworkplumbingwg/whereabouts
- Macvlan CNI plugin docs: https://www.cni.dev/plugins/current/main/macvlan/
- CNI spec versions: https://www.cni.dev/docs/spec-upgrades/
- Ceph network configuration reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Rook GitHub issue #7987 (CSI configmap not meant for manual editing)

## Issues Found

1. **Incorrect: Manual editing of `rook-ceph-csi-config` ConfigMap (Step 4)**
   - **What was wrong:** The post instructed users to manually create/edit the `rook-ceph-csi-config` ConfigMap with hardcoded monitor addresses. The Rook operator automatically manages this ConfigMap, and any manual edits are overwritten during operator reconciliation.
   - **What was changed:** Replaced Step 4 with instructions to verify that the operator has automatically populated the CSI config with the correct Multus public network addresses, using a `kubectl get configmap` command.
   - **Why:** Manual edits to operator-managed resources cause confusion when they revert, and can lead to stale monitor addresses if monitors are rescheduled.

2. **Imprecise Ceph image tag (`v18`)**
   - **What was wrong:** The image tag `quay.io/ceph/ceph:v18` is a floating tag that points to the latest v18.x release. Ceph documentation warns against using general `vRELNUM` tags in production because different nodes may pull different versions.
   - **What was changed:** Changed to `quay.io/ceph/ceph:v18.2.5` (the latest Reef stable release).
   - **Why:** Pinned versions prevent version skew across cluster nodes.

3. **Incomplete tcpdump port for monitor traffic**
   - **What was wrong:** The tcpdump command only captured port 6789 (msgr1/v1), but since Ceph Nautilus, monitors also listen on port 3300 (msgr2/v2), which is the modern default protocol.
   - **What was changed:** Updated the tcpdump command to capture both ports: `port 3300 or port 6789`.
   - **Why:** Most modern Ceph clients connect via msgr2 on port 3300; capturing only 6789 would miss the majority of monitor traffic.

4. **Misleading tcpdump port for OSD traffic**
   - **What was wrong:** The tcpdump command used `port 6800` as if it were a single fixed OSD port. In reality, 6800 is the starting port of a range (6800-7300); each OSD uses multiple ports starting from 6800, and multiple OSDs on the same node use incrementally higher ports.
   - **What was changed:** Updated the tcpdump command to use `portrange 6800-7300` to capture all OSD traffic.
   - **Why:** Capturing only port 6800 would miss traffic from most OSDs and miss heartbeat/replication traffic on adjacent ports.

## Review Notes
- The post correctly uses the `network.provider: multus` configuration with `selectors.public` and `selectors.cluster` in `namespace/name` format, which matches current Rook documentation.
- The NetworkAttachmentDefinition specs (macvlan type, bridge mode, Whereabouts IPAM with `range_start`/`range_end`) are all correctly configured.
- The `apiVersion: k8s.cni.cncf.io/v1` and `cniVersion: 0.3.1` values are correct.
- The `ipFamily: IPv4` and `dualStack: false` fields are valid CephCluster network configuration options.
- The `ceph config get osd.0 public_network` command is valid syntax for checking Ceph network configuration.
- Ceph v18 (Reef) is still supported but users may want to consider v19 (Squid) for new deployments.
