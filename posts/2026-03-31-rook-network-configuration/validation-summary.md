# Validation Summary: How to Set Up Rook-Ceph Network Configuration

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Multus CNI (multi-network plugin)
- Kubernetes NetworkPolicy

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Network Providers documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook CRD Go source types (AddressRangesSpec, CIDR, CIDRList, NetworkSpec, ConnectionsSpec): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go (lines 3157-3300)
- Rook network validation source: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/network.go
- Ceph Network Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Messenger v2 (msgr2) protocol documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph msgr2 developer documentation: https://docs.ceph.com/en/quincy/dev/msgr2/
- Ceph MGR Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found

### 1. Incorrect `addressRanges` YAML format (two occurrences)
- **What was wrong:** The `addressRanges` examples used `- cidr: 10.0.0.0/24` (object with a `cidr` key), but the Rook CRD defines `CIDRList` as `[]CIDR` where `CIDR` is a plain `string` type. The correct YAML format is a list of plain strings.
- **What was changed:** Changed `- cidr: 10.0.0.0/24` / `- cidr: 10.1.0.0/24` to `- "10.0.0.0/24"` / `- "10.1.0.0/24"` in the public/cluster network example, and `- cidr: fd00::/64` to `- "fd00::/64"` in the IPv6 example.
- **Why:** The `cidr` key does not exist in the CRD schema. Using it would cause a Kubernetes validation error when applying the CephCluster manifest. Verified against the Go type definitions in the Rook source: `type CIDR string` and `type CIDRList []CIDR`.

### 2. MDS port listed as single port instead of range
- **What was wrong:** The firewall port list showed "MDS: 6800" as a single port.
- **What was changed:** Changed to "MDS: 6800-7300" to reflect that MDS daemons bind to the first available port starting at 6800, using the same port range as OSDs.
- **Why:** MDS daemons use the same default bind port range as OSDs (6800-7568, commonly simplified to 6800-7300 for firewall rules). Multiple MDS instances on the same node will use successive ports. Listing only port 6800 could lead to firewall misconfigurations that block MDS communication.

### 3. Incorrect encryption description ("TLS")
- **What was wrong:** The post stated that enabling `requireMsgr2` and `encryption.enabled` "enforces TLS encryption for all Ceph daemon communication."
- **What was changed:** Changed to "enforces in-transit encryption (AES-128-GCM) for all Ceph daemon communication via the msgr2 secure mode."
- **Why:** The msgr2 protocol uses its own native encryption mechanism (AES-128-GCM with deterministic nonce construction), not TLS. TLS is a separate protocol used by Ceph only for specific client-facing services like the RGW HTTPS endpoint and the dashboard. Calling msgr2 encryption "TLS" is technically inaccurate and could cause confusion about the security model.

## Review Notes
- The OSD port range 6800-7300 is a commonly used firewall recommendation. The actual Ceph default bind range is 6800-7568 (`ms_bind_port_min` to `ms_bind_port_max`). The simplified range is acceptable for a tutorial but operators with many OSDs per node should be aware of the full range.
- The RGW ports 80/443 are the Rook CephObjectStore CRD defaults. Native Ceph RGW defaults to port 7480. This is a reasonable simplification in the Rook context.
- The MON `volumeClaimTemplate` section correctly describes the mechanism but could clarify that "predictable IP assignments via node affinity" specifically requires host networking to work as described (with pod networking, the MON IP comes from the pod CIDR, not the node).
- The NetworkPolicy examples are syntactically correct. The `policyTypes` field is omitted but Kubernetes correctly infers it from the presence of `ingress`/`egress` rules.
- All `kubectl exec` verification commands are correct and use the standard `rook-ceph-tools` deployment.
