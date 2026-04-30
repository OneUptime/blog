# Validation Summary: How to Use Harvester as Infrastructure Provider in Rancher - Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Manager
- Harvester
- RKE2
- Kubernetes
- Rancher node drivers
- Rancher cloud credentials
- Rancher machine-provisioned clusters
- Fleet

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Harvester Node Driver: https://docs.harvesterhci.io/v1.4/rancher/node/node-driver/
- Creating an RKE2 Kubernetes Cluster on Harvester: https://docs.harvesterhci.io/v1.5/rancher/node/rke2-cluster/
- Harvester Cloud Provider: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Rancher Terraform `cloud_credential`: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cloud_credential
- Rancher Terraform `machine_config_v2`: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/machine_config_v2
- Rancher Terraform `cluster_v2`: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cluster_v2
- Rancher Manager support matrix: https://www.suse.com/suse-rancher/support-matrix/
- RKE2 v1.27 support matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-27/

## Issues Found
- The cloud credential API example was incomplete. It created `harvesterCredentialConfig` without the required `kubeconfigContent`, so I updated it to include the downloaded Harvester kubeconfig and to capture the resulting cloud credential ID for later use.
- The Harvester machine config YAML used the wrong object shape. `HarvesterConfig` does not use a `spec:` block for these fields, and the example used deprecated or invalid direct fields such as `clusterName`, `namespace`, `imageName`, `networkName`, and `diskStorageClassName`. I replaced that with the current `vmNamespace`, `diskInfo`, `networkInfo`, `sshUser`, and `userData` layout.
- The machine config example was missing `iptables`, which Harvester documents as required for Canal/Calico-based guest clusters. I added it to the cloud-init package list.
- The cluster manifest omitted the required cloud credential reference, so Rancher would not know which Harvester credential to use for provisioning. I added `cloudCredentialSecretName` and clarified that it must be the generated credential ID.
- The cluster manifest used incorrect Rancher fields for networking and cloud provider integration. `networkConfig` and the standalone `cloudProviderConfig` block do not match Rancher’s current RKE2 cluster config model for Harvester. I moved these settings into `machineGlobalConfig`, `machineSelectorConfig`, and `chartValues`, which is how Rancher and Harvester document Harvester cloud provider integration.
- The worker-pool autoscaling comments overstated what the annotations do. Those annotations only prepare the machine deployment for Cluster API autoscaler integration; they do not enable autoscaling by themselves. I corrected the wording.
- The control-plane pool referenced a non-existent `ubuntu-small-control-plane` machine config. I changed the example to reference the defined `ubuntu-large-node` machine config so the sample is internally consistent.
- Several kubectl examples used ambiguous or less accurate resource references. I updated them to the fully qualified Rancher and Cluster API resources where that materially improves correctness.
- The post treated any Rancher release `2.7.0 or higher` as interchangeable with a pinned RKE2 `v1.27.x` example. I tightened the prerequisite wording and version note so the sample reflects Rancher/RKE2 support-matrix coupling.
- The prerequisites omitted required Harvester network assumptions. I added the need for a VLAN-backed guest network with DHCP or Managed DHCP, and clarified that Harvester node driver supports cloud images.

## Review Notes
- The Fleet section is directionally correct, but real GitOps delivery for this workflow still needs a secure way to provide the Harvester cloud-provider kubeconfig material used by the cluster manifest.
- The example RKE2 version is valid for Rancher releases that support `v1.27.x`, but operators should always choose a version from the support matrix for the exact Rancher release they run.
