# Validation Summary: How to Set Up CSI Drivers on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Container Storage Interface (CSI)
- Kubernetes VolumeSnapshot CRDs and snapshot-controller
- NFS CSI driver
- Rook-Ceph CSI
- AWS EBS CSI driver
- VMware vSphere CSI driver
- Kubernetes StorageClass, PersistentVolumeClaim, and Pod manifests

## Sources Consulted
- Kubernetes CSI Developer Documentation: https://kubernetes-csi.github.io/docs/deploying.html
- Kubernetes CSI Snapshot Controller documentation: https://kubernetes-csi.github.io/docs/snapshot-controller.html
- Kubernetes CSI external-snapshotter repository: https://github.com/kubernetes-csi/external-snapshotter
- NFS CSI driver Helm chart documentation: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts/README.md
- Rook-Ceph operator Helm chart values: https://github.com/rook/rook/blob/release-1.18/deploy/charts/rook-ceph/values.yaml
- AWS EBS CSI driver installation documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
- vSphere CSI driver repository and vanilla manifests: https://github.com/kubernetes-sigs/vsphere-csi-driver
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos extension services documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/extension-services

## Issues Found
- Updated the snapshot controller examples from external-snapshotter v7.0.1 to v8.5.0 because the upstream external-snapshotter repository has newer stable release tags.
- Added an explicit NFS CSI chart version and corrected the NFS verification labels to `app=csi-nfs-controller` and `app=csi-nfs-node`, matching the official NFS CSI driver documentation.
- Corrected Rook-Ceph CSI resource value names from older/non-current keys to the current `csiRBDPluginResource`, `csiCephFSPluginResource`, `csiRBDProvisionerResource`, and `csiCephFSProvisionerResource` values used by the Rook Helm chart, and removed the obsolete `enableGrpcMetrics` value.
- Added a note that the AWS EBS CSI driver must be installed after IAM permissions are configured for the controller service account, which is required by the official driver installation docs.
- Replaced the vSphere CSI Helm example with the official vanilla manifest workflow and `vsphere-config-secret`, because the upstream vSphere CSI driver publishes official manifests rather than the Helm repository shown in the post.
- Adjusted Talos wording to avoid implying host storage utilities can never be provided; Talos uses system extensions/extension services for tools such as Open iSCSI.
- Replaced a non-portable generic CSI pod label query with a namespace-based pod check because CSI charts do not share a universal `app.kubernetes.io/component=csi-driver` label.
- Replaced the troubleshooting node-plugin label with a placeholder because CSI node DaemonSet labels vary by driver.

## Review Notes
The remaining examples are syntactically valid Kubernetes manifests or standard kubectl/Helm operations, but real deployments still need driver-specific prerequisites such as cloud credentials, vSphere CPI configuration, storage backend access, and provider-specific StorageClass parameters.
