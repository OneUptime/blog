# Validation Summary: How to Manage Rook-Ceph Resources with Terraform Kubernetes Provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Terraform Kubernetes provider (`hashicorp/kubernetes` v2.25+)
- `kubernetes_manifest` resource
- `terraform_data` resource (Terraform 1.4+)
- Rook-Ceph operator
- Ceph Reef (v18.2.0)
- Kubernetes StorageClass
- Rook-Ceph CSI RBD provisioner

## Sources Consulted
- Terraform Kubernetes provider documentation — `kubernetes_manifest` resource and import format
- Rook-Ceph CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook-Ceph CephBlockPool CRD documentation — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook-Ceph CephObjectStore CRD documentation — https://rook.io/docs/rook/v1.11/CRDs/Object-Storage/ceph-object-store-crd/
- Rook-Ceph Block Storage (StorageClass) configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph v18.2.0 Reef release announcement — https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Kubernetes StorageClass API reference (storage.k8s.io/v1)
- Terraform `terraform_data` managed resource documentation

## Issues Found
No technical issues found.

## Review Notes
- The `kubernetes_manifest` resource requires CRDs to be present in the cluster at plan time for schema validation. The `terraform_data` wait-for-operator pattern shown addresses apply-time ordering but does not solve the plan-time CRD requirement. This is a known limitation worth noting but is not an error in the code itself.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is the Reef release from 2023. Newer Reef point releases exist, but v18.2.0 is valid and functional.
- All CephCluster, CephBlockPool, and CephObjectStore spec fields are correct per the `ceph.rook.io/v1` API.
- The StorageClass correctly uses top-level fields (`provisioner`, `reclaimPolicy`, `parameters`) without a `spec` wrapper, matching the Kubernetes StorageClass API.
- The `terraform import` command uses the correct ID format for `kubernetes_manifest`: `apiVersion=...,kind=...,namespace=...,name=...`.
- The CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) are the correct defaults for Rook-Ceph RBD CSI driver.
