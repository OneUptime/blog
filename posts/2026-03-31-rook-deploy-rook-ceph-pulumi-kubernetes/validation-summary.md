# Validation Summary: How to Use Pulumi to Deploy Rook-Ceph on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi (TypeScript SDK)
- Rook-Ceph (v1.13.0 operator, Ceph Reef v18.2.0)
- Kubernetes (Namespaces, StorageClasses, Custom Resources)
- Helm (v3, via Pulumi Helm Release resource)
- Node.js / TypeScript

## Sources Consulted
- Pulumi CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi Kubernetes provider documentation: https://www.pulumi.com/registry/packages/kubernetes/
- Rook-Ceph Helm chart repository index: https://charts.rook.io/release/index.yaml
- Rook-Ceph Block Storage (RBD) StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph example StorageClass YAML from rook/rook GitHub repository (master and release-1.16 branches)
- Rook-Ceph CephCluster CRD specification: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook-Ceph CephObjectStore CRD specification: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found

### 1. Incorrect project setup commands
- **What was wrong:** The setup section had `pulumi new typescript --name rook-ceph-deployment` followed by `cd rook-ceph-deployment`. The `pulumi new` command scaffolds the project in the current directory — it does not create a subdirectory. The `cd` command would fail.
- **What was changed:** Added `mkdir rook-ceph-deployment && cd rook-ceph-deployment` before the `pulumi new` command, so the directory is created first and the project is scaffolded inside it.

### 2. Section heading incorrectly said "CRD" instead of "Custom Resource"
- **What was wrong:** The heading "Deploying the CephCluster CRD" is misleading. The code deploys a CephCluster Custom Resource (CR) instance, not a Custom Resource Definition (CRD). The CRDs are installed by the Rook operator Helm chart.
- **What was changed:** Renamed the heading to "Deploying the CephCluster Custom Resource".

### 3. StorageClass missing required CSI secret parameters
- **What was wrong:** The `rook-ceph-block` StorageClass was missing the CSI secret reference parameters that are required for the CSI RBD driver to authenticate with the Ceph cluster. Without these parameters, PVC provisioning will fail because the CSI driver cannot access the necessary credentials.
- **What was changed:** Added the six required CSI secret parameters to the StorageClass: `provisioner-secret-name/namespace`, `controller-expand-secret-name/namespace`, and `node-stage-secret-name/namespace`, using the standard Rook secret names (`rook-csi-rbd-provisioner` and `rook-csi-rbd-node`).

## Review Notes
- The Rook operator version (v1.13.0) and Ceph version (v18.2.0 / Reef) are compatible. Rook v1.13 supports Ceph Reef.
- The Helm chart version correctly uses the `v` prefix (`v1.13.0`), matching the Rook Helm chart repository format.
- The Rook Helm chart repository URL (`https://charts.rook.io/release`) is verified correct.
- The Pulumi TypeScript APIs used (`k8s.helm.v3.Release`, `k8s.apiextensions.CustomResource`, `k8s.storage.v1.StorageClass`, `pulumi.Config`, `pulumi.interpolate`) are all current and correct.
- The CephCluster, CephBlockPool, and CephObjectStore custom resource specs use valid field names and values for the `ceph.rook.io/v1` API version.
- The RGW service endpoint format (`rook-ceph-rgw-my-store.<namespace>.svc:80`) is correct for a CephObjectStore named "my-store".
- The official Rook StorageClass example also includes `csi.storage.k8s.io/controller-publish-secret-name/namespace` parameters, but these are optional for basic RBD block storage use cases and were not added to keep the example concise.
