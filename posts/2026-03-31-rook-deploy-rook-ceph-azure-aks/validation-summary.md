# Validation Summary: How to Deploy Rook-Ceph on Azure AKS

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Ceph v18.2.0 (Reef release)
- Azure Kubernetes Service (AKS)
- Azure Managed Disks (Premium_LRS)
- Azure VMSS (Virtual Machine Scale Sets)
- Helm (package manager for Kubernetes)
- Kubernetes StorageClass and CSI

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook StorageClass examples: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Azure CLI `az vmss disk attach` reference: https://learn.microsoft.com/en-us/cli/azure/vmss/disk
- Azure VM disk device naming: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/azure-to-guest-disk-mapping
- Other Rook deployment blog posts in this repository for consistency (GKE, k3s, MicroK8s variants)

## Issues Found

1. **VMSS instance IDs were 1-indexed instead of 0-indexed**: The disk attachment loop used `for i in 1 2 3` but AKS VMSS instance IDs are 0-indexed. Changed to `for i in 0 1 2` so disks attach to the correct VM instances.

2. **Device filter included Azure temporary disk**: The filter `^sd[b-z]$` would match `/dev/sdb`, which is the Azure temporary/resource disk on Standard_D4s_v3 VMs. Using this disk as a Ceph OSD would cause data loss and conflict with AKS node operations. Changed to `^sd[c-z]$` to skip both the OS disk (`/dev/sda`) and the temp disk (`/dev/sdb`).

3. **Missing CephBlockPool resource**: The StorageClass referenced a pool named `replicapool`, but no CephBlockPool manifest was provided. Without this resource, the StorageClass would fail to provision volumes. Added a CephBlockPool definition with `failureDomain: host` and `replicated.size: 3`.

4. **Missing CSI secret parameters in StorageClass**: The StorageClass was missing the required `csi.storage.k8s.io/*` secret references (`provisioner-secret-name`, `controller-expand-secret-name`, `node-stage-secret-name` and their namespace counterparts). Without these, the CSI driver cannot authenticate with the Ceph cluster and volume provisioning fails. Added all six required secret parameters consistent with other posts in the blog.

5. **Missing Rook toolbox deployment**: Step 6 referenced `deploy/rook-ceph-tools` for running `ceph status` and `ceph osd df`, but the toolbox was never deployed. Added the toolbox deployment command using the official Rook toolbox manifest.

6. **Misleading Azure Policy text**: The text said "add exemptions" but the command disabled the entire Azure Policy addon. Updated the text to accurately describe the action being taken (disabling the addon if policies block privileged pods).

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is current but will eventually be superseded. Consider updating to the latest stable when Squid (v19) becomes widely adopted.
- The approach of disabling Azure Policy entirely is heavy-handed. In production, creating targeted policy exemptions for the `rook-ceph` namespace would be preferable, but this is adequate for a getting-started tutorial.
- PSPs are mentioned with an "if applicable" qualifier, which is appropriate since PSPs were removed in Kubernetes 1.25. AKS clusters on recent Kubernetes versions won't have PSPs.
- The VMSS disk attachment script assumes a single VMSS in the node resource group. Clusters with multiple node pools would have multiple VMSS, requiring additional logic to select the correct one.
- The `reclaimPolicy: Retain` in the StorageClass means PVs won't be automatically deleted when PVCs are removed. This is a safe default but users should be aware of the cleanup implications.
