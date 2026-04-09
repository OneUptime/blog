# Validation Summary: How to Deploy Rook-Ceph on k0s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- k0s (lightweight Kubernetes distribution)
- Helm (Kubernetes package manager)
- Kubernetes CSI (Container Storage Interface)

## Sources Consulted
- k0s official documentation — configuration and kubelet root directory: https://docs.k0sproject.io/stable/configuration/
- k0s runtime documentation — containerd socket path: https://docs.k0sproject.io/stable/runtime/
- k0s install documentation — embedded kubectl: https://docs.k0sproject.io/stable/install/
- k0sctl GitHub repository: https://github.com/k0sproject/k0sctl
- Rook-Ceph Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook Helm repository index: https://charts.rook.io/release/index.yaml
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph release announcements — Reef v18.2.8 final release: https://ceph.io/en/news/blog/2026/v18-2-8-reef-released/
- Kubernetes CSINode API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-node-v1/

## Issues Found
1. **Outdated Ceph image tag**: The post used `quay.io/ceph/ceph:v18.2.0` (Ceph Reef initial release from 2023). Ceph Reef reached end-of-life on March 31, 2026. Updated the image to `quay.io/ceph/ceph:v19.2.2` (Ceph Squid), which is a currently supported release line.

## Review Notes
- The GitHub raw URL for the storageclass example (`https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml`) references the `master` branch, which is a moving target. For production use, pinning to a specific release tag (e.g., `v1.19.3`) would be more reliable. This is a best-practice concern rather than a correctness error.
- The `mgr.count: 1` is valid but the Rook default and recommended production value is `2` for high availability. The post's choice of `1` is not incorrect but worth noting.
- All k0s-specific paths (`/var/lib/k0s/kubelet`, `/run/k0s/containerd.sock`) were verified correct against official k0s documentation.
- All Rook Helm chart values (`csi.kubeletDirPath`, `csi.enableCSIHostNetwork`, `csi.csiRBDPluginVolume`, `csi.csiCephFSPluginVolume`) are valid and correctly named.
- The CephCluster and CephBlockPool custom resource specs are syntactically correct with valid field names and values.
