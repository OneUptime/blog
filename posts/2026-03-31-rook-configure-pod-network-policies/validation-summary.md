# Validation Summary: How to Configure Pod Network Policies for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Rook-Ceph (storage orchestrator)
- Ceph (distributed storage system)
- kubectl CLI

## Sources Consulted
- Ceph Network Configuration Reference — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Messenger v2 Protocol — https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph Prometheus Module — https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Dashboard — https://docs.ceph.com/en/latest/mgr/dashboard/
- Rook source code for pod labels (mon.go, osd.go, mgr.go) — https://github.com/rook/rook
- Kubernetes NetworkPolicy API reference — https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Kubernetes NetworkPolicy concepts — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Well-Known Labels — https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Feature Gates (NetworkPolicyEndPort) — https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/

## Issues Found

### 1. OSD ingress ports too restrictive (Step 2)
- **What was wrong:** The OSD NetworkPolicy ingress only allowed individual ports 6800 and 6801. OSDs use the full 6800-7300 port range, and each OSD binds to ports within this range. With only two ports open, a cluster with more than two OSDs would have broken inter-OSD and client-to-OSD communication.
- **What was changed:** Replaced the two individual port entries with a single port range using `port: 6800` and `endPort: 7300` (the `endPort` field is stable since Kubernetes 1.25).
- **Why:** The NetworkPolicy must allow traffic across the entire OSD port range to support clusters with any number of OSDs.

### 2. OSD egress missing inter-OSD port range (Step 2)
- **What was wrong:** The OSD egress rule only allowed outbound traffic to monitor ports (3300 and 6789). OSDs also need to communicate with other OSDs on ports 6800-7300 for data replication, recovery, backfilling, and heartbeats. Without this, OSD peering and data movement would fail.
- **What was changed:** Added `port: 6800` with `endPort: 7300` to the egress ports list alongside the existing monitor ports.
- **Why:** Inter-OSD communication is essential for Ceph cluster operation; blocking it would prevent replication and recovery.

## Review Notes
- The post uses `to: []` (empty array) in the OSD egress rule, which in Kubernetes means "match all destinations." This is more permissive than necessary — restricting to the rook-ceph namespace via a namespaceSelector would be tighter. However, it is functionally correct.
- The `endPort` field requires Kubernetes 1.25+ (GA) and CNI plugin support. The post does not mention this version requirement, which could be noted for readers on older clusters.
- The Ceph documentation states the full daemon port range extends to 7568 (`ms_bind_port_max` default), not 7300. The post uses 6800-7300 consistently, which covers the commonly used range and is adequate for most deployments, but readers with very large OSD counts or frequent daemon restarts may need to extend this.
- The Dashboard port 8443 is the SSL-enabled default; when SSL is disabled, it uses 8080. The post doesn't mention this distinction but it is a minor omission for a security-focused tutorial.
