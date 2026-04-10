# Validation Summary: How to Configure Network Policies for Rook-Ceph Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Rook-Ceph (MON, OSD, MGR, CSI components)
- Ceph storage cluster networking
- Kubernetes namespace isolation

## Sources Consulted
- Ceph Network Configuration Reference — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Messenger v2 Documentation — https://docs.ceph.com/en/quincy/rados/configuration/msgr2/
- Rook Ceph CSI Drivers Documentation — https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Ceph Dashboard Documentation — https://rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-dashboard/
- Kubernetes NetworkPolicy Documentation — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Ceph Architecture (librados / OSD communication) — https://docs.ceph.com/en/reef/architecture/

## Issues Found

### 1. OSD NetworkPolicy only opened 2 ports instead of the full range
**What was wrong:** The text correctly stated OSDs communicate on ports 6800-7300, but the YAML NetworkPolicy only allowed ports 6800 and 6801 (two individual ports). This would block most OSD communication in any real deployment with multiple OSDs.
**What was changed:** Replaced the two individual port entries with a single entry using `port: 6800` and `endPort: 7300` to cover the full OSD port range. The `endPort` field is GA since Kubernetes 1.25.
**Why:** Each OSD binds to multiple ports in the 6800-7300 range. Only allowing 2 ports would cause OSD replication and client I/O failures.

### 2. CSI policy missing OSD access
**What was wrong:** The `allow-csi-to-mon` NetworkPolicy only permitted CSI pods to reach MON ports (3300, 6789). CSI RBD plugins also need direct access to OSDs for data I/O operations (reads/writes via librados). Without OSD access, volume mounts and I/O would fail.
**What was changed:** Added a second NetworkPolicy (`allow-csi-to-osd`) that permits CSI RBD plugin pods to reach OSD ports 6800-7300. Renamed the original policy to `allow-csi-to-ceph` for clarity.
**Why:** CSI drivers first contact MONs for authentication and the cluster map, then communicate directly with OSDs for actual data operations.

### 3. Incorrect default namespace for CSI pods
**What was wrong:** The post stated CSI pods are in `kube-system` and the NetworkPolicy used a namespaceSelector matching `kube-system`. By default, Rook deploys CSI pods in the same namespace as the operator (`rook-ceph`).
**What was changed:** Updated the text to state CSI pods are in the operator namespace (`rook-ceph` by default). Changed the NetworkPolicy to use a `podSelector` within the same namespace instead of a cross-namespace `namespaceSelector` targeting `kube-system`.
**Why:** Using the wrong namespace selector would cause the NetworkPolicy to match no pods, effectively blocking all CSI-to-Ceph communication.

## Review Notes
- The default-deny policy blocks all egress including DNS resolution (UDP 53 to kube-dns). Ceph components typically use IP addresses discovered through monitors, so this may work in practice, but operators should be aware they may need a DNS egress rule if service name resolution is required.
- The CSI policy only covers `csi-rbdplugin`. Deployments using CephFS would also need equivalent rules for `csi-cephfsplugin` pods.
- The `endPort` field in NetworkPolicy requires Kubernetes 1.25+ (GA). Clusters on older versions would need an alternative approach.
- The `kubernetes.io/metadata.name` namespace label used in the policies is available since Kubernetes 1.21 (stable in 1.22).
