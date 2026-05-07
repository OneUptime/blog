# Validation Summary: How to Provision a vSphere Cluster from Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher RKE2
- Rancher K3s
- VMware vSphere
- vSphere CPI
- vSphere CSI
- Kubernetes StorageClass
- cloud-init

## Sources Consulted
- Rancher: Creating a VMware vSphere Cluster https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere
- Rancher: Provisioning Kubernetes Clusters in VMware vSphere https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere/provision-kubernetes-clusters-in-vsphere
- Rancher: Creating Credentials in the VMware vSphere Console https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere/create-credentials
- Rancher: Creating a VMware vSphere Virtual Machine Template https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere/create-a-vm-template
- Rancher: VMware vSphere Node Template Configuration https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration/vsphere
- Rancher: Setting Up an Out-of-tree VMware vSphere Cloud Provider https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers/configure-out-of-tree-vsphere
- Rancher: Setting Up an In-tree VMware vSphere Cloud Provider https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers/configure-in-tree-vsphere
- Rancher: Managing Cloud Credentials https://ranchermanager.docs.rancher.com/v2.11/reference-guides/user-settings/manage-cloud-credentials
- Rancher: Port Requirements https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- RKE2 Docs: Network Options https://docs.rke2.io/networking/basic_network_options
- Kubernetes vSphere Cloud Provider: Cloud Provider Interface https://cloud-provider-vsphere.sigs.k8s.io/cloud_provider_interface
- Kubernetes vSphere Cloud Provider: Cloud Config Spec https://cloud-provider-vsphere.sigs.k8s.io/cloud_config
- Kubernetes: Change the default StorageClass https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Ubuntu Cloud Images: Jammy OVA https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.ova

## Issues Found
- The prerequisites were too broad. I updated the vSphere version requirement to match Rancher's documented out-of-tree vSphere support matrix and clarified the required network ports from Rancher to vCenter and provisioned nodes.
- The VM template section understated the required Linux dependencies. I added the documented template packages Rancher expects for machine provisioning, including `cloud-init`, `open-vm-tools`, `openssh-server`, `open-iscsi`, and supporting utilities.
- The vSphere permissions list was incomplete and missed required privileges such as `Cns Privileges > Searchable`, datastore update permissions, guest operations, cryptographic direct access, and vSphere tagging privileges. I replaced it with the documented permission set from Rancher's vSphere credential guide.
- The cloud credential creation steps omitted the required credential name. I added the `Name` field.
- The vSphere cloud provider section used the legacy in-tree `vsphereCloudProvider` YAML even though the post targets RKE2/K3s provisioning. I replaced it with the correct Rancher out-of-tree CPI/CSI workflow for RKE2/K3s clusters.
- The post incorrectly claimed that vSphere cloud provider integration adds load balancer support. I removed that claim because the vSphere CPI does not implement `LoadBalancer`.
- The troubleshooting section said to configure the VMware datasource for cloud-init. I corrected this to the `NoCloud` datasource, which Rancher's vSphere template guidance documents.
- The post-provisioning instructions installed only CSI. I corrected the order to install vSphere CPI first and then vSphere CSI when those integrations are not configured during cluster creation.

## Review Notes
- The manual `StorageClass` example is valid, but Rancher's vSphere CSI installation can create a `StorageClass` automatically depending on chart settings.
- The legacy in-tree `vsphereCloudProvider` configuration remains relevant for RKE1 clusters, not for the RKE2/K3s workflow described in this post.
