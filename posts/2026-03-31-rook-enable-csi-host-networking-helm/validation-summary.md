# Validation Summary: How to Enable CSI Host Networking in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes CSI (Container Storage Interface)
- Helm (Kubernetes package manager)
- Multus CNI (multi-network plugin)
- Calico (network policy engine, mentioned)

## Sources Consulted
- Rook Helm Chart values.yaml — https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook Ceph Operator Helm Chart Documentation — https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook Network Providers Documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Ceph Network Configuration Reference — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Rook Pod Security Policies — https://rook.io/docs/rook/v1.10/Getting-Started/Prerequisites/pod-security-policies/
- Rook CSI Common Issues — https://rook.io/docs/rook/v1.14/Troubleshooting/ceph-csi-common-issues/
- Rook Helm Charts Overview — https://rook.io/docs/rook/latest-release/Helm-Charts/helm-charts/

## Issues Found
1. **Security consideration about non-root CSI pods was incorrect.** The post originally stated "Ensure CSI pods do not run as root (configure security contexts)" as a security recommendation. CSI node plugins inherently require privileged access for storage operations such as mounting/unmounting block devices, managing RBD device mappings, and accessing host filesystem mounts. The recommendation was changed to acknowledge that privileged access is required and advise restricting capabilities to only what is needed rather than granting blanket privileges.

## Review Notes
- The `csi.enableCSIHostNetwork` Helm value name, its behavior (setting `hostNetwork: true` on CSI DaemonSet pods), and the default are all correct per the official Rook Helm chart.
- Ceph monitor ports 6789 (msgr1) and 3300 (msgr2) are correct.
- The `app=csi-rbdplugin` label selector in the kubectl verification command is the standard label for Rook CSI RBD plugin pods.
- The Helm repo name `rook-release` matches the official Rook installation instructions (`helm repo add rook-release https://charts.rook.io/release`).
- The Multus CNI configuration snippet uses the correct format (`namespace/NADName` for selectors). The specific NAD names (`ceph-public`, `ceph-cluster`) are user-defined examples, which is appropriate for illustrative purposes.
- The note about NetworkPolicy being more complex for host-network pods and the mention of Calico HostEndpoints is accurate.
