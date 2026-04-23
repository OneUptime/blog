# Validation Summary: How to Configure vSphere Cloud Provider in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- VMware vSphere
- vSphere Cloud Provider Interface (CPI)
- vSphere Container Storage Interface (CSI)
- govc
- StorageClass / PersistentVolumeClaim

## Sources Consulted
- Rancher: Setting Up an Out-of-tree VMware vSphere Cloud Provider  
  https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers/configure-out-of-tree-vsphere
- Rancher: Creating Credentials in the VMware vSphere Console  
  https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere/create-credentials
- RKE2 Server Configuration Reference  
  https://docs.rke2.io/reference/server_config
- RKE2 Air-Gap Install note for vSphere CPI/CSI packaged charts  
  https://docs.rke2.io/install/airgap
- Rancher vSphere CPI chart defaults  
  https://github.com/rancher/vsphere-charts/blob/main/charts/rancher-vsphere-cpi/values.yaml
- Rancher vSphere CPI chart config template  
  https://github.com/rancher/vsphere-charts/blob/main/charts/rancher-vsphere-cpi/templates/configmap.yaml
- Rancher vSphere CSI chart defaults  
  https://github.com/rancher/vsphere-charts/blob/main/charts/rancher-vsphere-csi/values.yaml
- Rancher vSphere CSI chart README and StorageClass template  
  https://github.com/rancher/vsphere-charts/blob/main/charts/rancher-vsphere-csi/README.md
  https://github.com/rancher/vsphere-charts/blob/main/charts/rancher-vsphere-csi/templates/storageclass.yaml
- Kubernetes vSphere Cloud Provider README and cloud config spec  
  https://github.com/kubernetes/cloud-provider-vsphere
  https://github.com/kubernetes/cloud-provider-vsphere/blob/master/docs/book/cloud_config.md
- Kubernetes vSphere Cloud Provider kubeadm tutorial  
  https://github.com/kubernetes/cloud-provider-vsphere/blob/master/docs/book/tutorials/kubernetes-on-vsphere-with-kubeadm.md
- vSphere CSI driver README, example StorageClass, and parameter constants  
  https://github.com/kubernetes-sigs/vsphere-csi-driver
  https://github.com/kubernetes-sigs/vsphere-csi-driver/blob/master/example/vanilla-k8s-RWO-filesystem-volumes/example-sc.yaml
  https://github.com/kubernetes-sigs/vsphere-csi-driver/blob/master/pkg/csi/service/common/constants.go
- Kubernetes storage docs for the deprecated in-tree `vsphereVolume` plugin  
  https://kubernetes.io/docs/concepts/storage/volumes/#vspherevolume-deprecated

## Issues Found
- The description and introduction mixed supported vSphere storage configuration with unsupported or nonstandard load-balancer claims. I rewrote them to describe the documented Rancher/RKE2 out-of-tree CPI+CSI flow and removed the NSX-T/vSphere with Tanzu load-balancer claim.
- The prerequisites were incomplete and version wording was too loose. I corrected them to match the Rancher out-of-tree vSphere guidance: vSphere 6.7 U3 or 7.0 U1+, Kubernetes 1.19+, and Linux nodes only.
- The `govc` UUID example did not match the upstream vSphere cloud provider tutorial. I changed it from `disk.enableUUID=true` to the documented `disk.enableUUID=1`.
- The post used a legacy in-tree/old-style vSphere cloud config with `[Workspace]`, `[Disk]`, and `[Network]` sections, while the rest of the post used modern CSI. I replaced that with RKE2/Rancher `HelmChartConfig` examples for the packaged `rancher-vsphere-cpi` and `rancher-vsphere-csi` charts.
- The RKE2 config used `cloud-provider-name: vsphere` plus `cloud-provider-config`, which does not match the documented RKE2 packaged vSphere add-on path. I corrected it to `cloud-provider-name: rancher-vsphere`.
- The Rancher UI instructions pointed to an inaccurate edit flow and fields. I updated them to Rancher’s documented out-of-tree vSphere flow: set `Cloud Provider` to `vSphere` and configure CPI/CSI in `Add-On Config`.
- The CSI installation section used an external Helm repo and secret flow that does not match the supported Rancher/RKE2 packaged chart workflow. I replaced it with deployment verification for the packaged CPI/CSI charts.
- The StorageClass example used the wrong CSI provisioner (`csi.vsphere.volume`). I corrected it to `csi.vsphere.vmware.com`, which is the current vSphere CSI driver name.
- The troubleshooting table referenced outdated config concepts like the VM folder path in cloud config. I updated the troubleshooting guidance to focus on CPI `ProviderID`, VMware Tools, `disk.enableUUID`, and certificate handling.
- The conclusion still implied the old in-tree model. I updated it to reflect the supported out-of-tree CPI+CSI approach.

## Review Notes
- The example disables the chart-created StorageClass so the later manual StorageClass step remains technically correct. If you leave the packaged CSI chart defaults enabled, Rancher’s chart creates a default StorageClass for you.
- The example keeps credentials inline in `HelmChartConfig` because the original post already used inline secrets. In production, a pre-created secret is preferable because generated or inline credentials are visible to authorized users through the Kubernetes API.
- `allowVolumeExpansion: true` in the StorageClass is only supported on sufficiently recent vSphere releases; upstream examples note vSphere 7.0 U1+ for volume expansion.
- Upstream `cloud-provider-vsphere` does contain NSX-T load-balancer code, but it is not the standard Rancher/RKE2 storage setup covered by the official Rancher out-of-tree vSphere guide, so it was removed from this post rather than expanded.
