# Validation Summary: How to Deploy Rook-Ceph on VMware Tanzu

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Reef v18.2.x)
- VMware Tanzu Kubernetes Grid (TKG)
- vSphere (VM disk management)
- NSX-T (network firewall rules)
- Helm (package manager for Kubernetes)
- Kubernetes CSI (Container Storage Interface)
- PodSecurityPolicy (deprecated Kubernetes feature for older TKG)

## Sources Consulted
- Rook official documentation — Block Storage (RBD) StorageClass: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- VMware Tanzu documentation — Pod Security Policies: https://docs.vmware.com/en/VMware-vSphere/7.0/vmware-vsphere-with-tanzu/GUID-CD033D1D-BAD2-41C4-A46F-647A560BAEAB.html
- Broadcom/VMware TKG documentation — Example Role Bindings for PSP: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/7-0/vsphere-with-tanzu-configuration-and-management-7-0/deploying-workloads-and-packages-on-tkgs-clusters/deploy-workloads-on-tanzu-kubernetes-clusters/example-role-bindings-for-podsecuritypolicy.html
- Rook Helm chart values (rook-release/rook-ceph)
- Ceph documentation — network ports (mon: 6789/3300, OSD: 6800-7300)

## Issues Found

### Issue 1: Incorrect PSP ClusterRole name for TKG
- **What was wrong:** The PSP clusterrolebinding command used `--clusterrole=psp:privileged`, which is a generic Kubernetes PSP ClusterRole name that does not exist in TKG by default.
- **What was changed:** Updated to `--clusterrole=psp:vmware-system-privileged`, which is the correct privileged PSP ClusterRole that ships with VMware Tanzu Kubernetes Grid.
- **Why:** TKG ships with `psp:vmware-system-privileged` and `psp:vmware-system-restricted` as its default PSP ClusterRoles. Using `psp:privileged` would fail with a "clusterrole not found" error on a standard TKG installation.

### Issue 2: StorageClass missing required CSI secret parameters
- **What was wrong:** The RBD StorageClass definition was missing the CSI secret parameters required for the CSI driver to authenticate with the Ceph cluster.
- **What was changed:** Added the following required parameters to the StorageClass:
  - `csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner`
  - `csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph`
  - `csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner`
  - `csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph`
  - `csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node`
  - `csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph`
- **Why:** Without these parameters, the CSI provisioner cannot authenticate with the Ceph cluster, and PVC provisioning and volume attachment will fail. These parameters are present in all official Rook documentation StorageClass examples.

## Review Notes
- The Rook toolbox deployment (`rook-ceph-tools`) used in Step 6 is not deployed by default with the CephCluster CR. Users would need to deploy it separately (e.g., via `kubectl apply -f toolbox.yaml` from the Rook examples). The commands shown are correct assuming the toolbox is deployed, but the post does not mention this prerequisite step.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is valid but is the initial Reef release. Newer point releases (18.2.1, 18.2.2, 18.2.4) include bug fixes and security patches. Users should consider using the latest Reef point release.
- PodSecurityPolicy was deprecated in Kubernetes 1.21 and removed in 1.25. The PSP section correctly notes it applies to "older TKG versions." TKG v1.25+ uses Pod Security Admission (PSA) instead.
- The `kubectl debug` command for verifying disks is correct but requires the EphemeralContainers feature gate, which is GA since Kubernetes 1.25. Older TKG clusters on Kubernetes <1.25 may need an alternative approach.
