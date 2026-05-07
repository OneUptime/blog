# Validation Summary: How to Configure vSphere Storage in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- VMware vSphere
- vSphere CSI driver
- vSphere CPI / cloud provider
- Kubernetes StorageClass
- PersistentVolumeClaim
- StatefulSet
- VolumeSnapshot

## Sources Consulted
- Rancher: Setting Up an Out-of-tree VMware vSphere Cloud Provider: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers/configure-out-of-tree-vsphere
- Rancher: VMware vSphere Storage: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/provisioning-storage-examples/vsphere-storage
- vSphere CSI Driver repository: https://github.com/kubernetes-sigs/vsphere-csi-driver
- vSphere CSI Driver releases: https://github.com/kubernetes-sigs/vsphere-csi-driver/releases
- vSphere CSI vanilla manifest v3.7.0: https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.7.0/manifests/vanilla/vsphere-csi-driver.yaml
- vSphere CSI RWO StorageClass example: https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.6.0/example/vanilla-k8s-RWO-filesystem-volumes/example-sc.yaml
- vSphere CSI RWX StorageClass example: https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.6.0/example/vanilla-k8s-RWM-filesystem-volumes/example-sc.yaml
- vSphere CSI snapshot deployment helper: https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.7.0/manifests/vanilla/deploy-csi-snapshot-components.sh
- Kubernetes: StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes: Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes: Volume Snapshot Classes: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- vSphere CPI overview and CPI/CSI dependency: https://cloud-provider-vsphere.sigs.k8s.io/concepts/cpi_overview

## Issues Found
- The post used an upstream Helm repository URL for the vSphere CSI driver that no longer resolves. I removed that install path and replaced it with Rancher-specific CPI/CSI chart guidance plus the current official upstream vanilla manifest URL.
- The Rancher-specific setup omitted the requirement to enable the vSphere cloud provider/CPI before CSI so nodes receive a `ProviderID`. I added that prerequisite and reflected it in the installation guidance.
- The StorageClass examples used `fstype` instead of the current CSI parameter key `csi.storage.k8s.io/fstype`. I updated the RWO, vSAN, and RWX examples to match the upstream vSphere CSI examples.
- The `datastoreurl` example used a datastore name-style path rather than a datastore URL placeholder. I changed it to `ds:///vmfs/volumes/<datastore-uuid>/` and clarified the troubleshooting note to reference the datastore URL shown in vCenter.
- The StatefulSet example omitted the headless Service that Kubernetes requires for StatefulSets. I added a matching headless Service and the corresponding HTTP port declaration.
- The snapshot section implied that creating `VolumeSnapshotClass` and `VolumeSnapshot` objects alone was sufficient. I added the required snapshot component installation step and clarified the summary so snapshots are described conditionally.
- The vSphere permissions section presented a short list as if it were an exhaustive required set. I adjusted the wording so it no longer overclaims completeness for all deployment variants.

## Review Notes
- The vSphere CSI manifest URL was updated from `v3.1.0` to `v3.7.0` because the earlier version reference was outdated as of May 7, 2026.
- Some Kubernetes distributions install snapshot CRDs and the snapshot-controller for you; the post now reflects that this prerequisite is conditional rather than always manual.
- Exact vCenter privilege requirements can vary by vSphere CSI features and deployment topology, so operators should still confirm the final privilege set against the VMware/Broadcom documentation for their specific release.
