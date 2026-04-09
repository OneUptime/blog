# Validation Summary: How to Deploy Rook-Ceph on a Minikube Test Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.15.0)
- Ceph (Squid / v19.2.0)
- Kubernetes
- Minikube
- CSI (Container Storage Interface)
- RBD (RADOS Block Device)

## Sources Consulted
- Rook GitHub releases: https://github.com/rook/rook/releases
- Rook v1.15.0 example manifests: https://github.com/rook/rook/tree/v1.15.0/deploy/examples
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook cleanup documentation: https://rook.io/docs/rook/latest/Getting-Started/ceph-teardown/
- Ceph container images on Quay.io: https://quay.io/repository/ceph/ceph
- Minikube Docker driver documentation: https://minikube.sigs.k8s.io/docs/drivers/docker/

## Issues Found

1. **Docker driver incorrectly described as "Linux only"**: The post stated the Docker driver is "Linux only, for better performance." The minikube Docker driver is cross-platform and works on Linux, macOS, and Windows. Changed to "available on Linux, macOS, and Windows."

2. **Incorrect StorageClass manifest path**: The post instructed users to run `kubectl apply -f pool.yaml` and `kubectl apply -f storageclass.yaml` from the `deploy/examples/` directory. While `pool.yaml` exists at that location, there is no `storageclass.yaml` at the root of `deploy/examples/`. The RBD StorageClass manifest is located at `csi/rbd/storageclass.yaml` (which includes both the CephBlockPool and StorageClass definitions). Replaced both commands with a single `kubectl apply -f csi/rbd/storageclass.yaml`.

3. **Incorrect cleanup deletion order**: The post had the deletion order as cluster, common, operator, CRDs. Per Rook's teardown documentation, the operator must be deleted before the common resources (which contain RBAC and namespace definitions the operator depends on). Corrected the order to: cluster, operator, common, CRDs.

## Review Notes
- Rook v1.15.0 is a valid release but is significantly outdated (latest stable is v1.19.x as of early 2026). The post's instructions work for v1.15.0 but readers may want to use a newer version.
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid) is experimental/unsupported in Rook v1.15.0. The post correctly sets `allowUnsupported: true` to account for this. The default tested image for Rook v1.15.0 is `v18.2.4` (Reef).
- The CephCluster YAML structure, including the `resources` section directly under `spec` and `storage.nodes[].devices[].name` without the `/dev/` prefix, is correct per Rook's CRD schema.
- The loop device creation approach using `minikube ssh` with `dd` and `losetup` is a well-known and valid technique for Minikube OSD testing.
