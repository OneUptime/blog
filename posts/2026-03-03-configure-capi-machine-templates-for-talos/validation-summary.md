# Validation Summary: How to Configure CAPI Machine Templates for Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Cluster API (CAPI)
- Cluster API Provider AWS (CAPA) — AWSMachineTemplate
- Cluster API Provider Azure (CAPZ) — AzureMachineTemplate
- Cluster API Provider vSphere (CAPV) — VSphereMachineTemplate
- Sidero TalosControlPlane (CACPPT)
- kubectl
- AWS EC2 / EBS
- Azure Managed Disks / Shared Image Gallery
- vSphere / vCenter

## Sources Consulted
- Cluster API documentation: https://cluster-api.sigs.k8s.io/
- Cluster API Provider AWS (CAPA) API reference: https://cluster-api-aws.sigs.k8s.io/crd/
- Cluster API Provider Azure (CAPZ) API reference: https://capz.sigs.k8s.io/reference/v1beta1-api
- Cluster API Provider vSphere (CAPV) docs and CRDs: https://github.com/kubernetes-sigs/cluster-api-provider-vsphere
- Sidero Talos Control Plane provider (CACPPT): https://github.com/siderolabs/cluster-api-control-plane-provider-talos
- Talos Linux documentation: https://www.talos.dev/latest/
- AWS EC2 instance type specs (m5 family): https://aws.amazon.com/ec2/instance-types/m5/
- Azure VM sizes (Dsv3 series): https://learn.microsoft.com/azure/virtual-machines/dv3-dsv3-series

## Issues Found
No technical issues found.

The API versions used in the YAML examples match the current storage versions for each provider:
- `infrastructure.cluster.x-k8s.io/v1beta2` for CAPA (AWSMachineTemplate) — correct as of CAPA 2.x.
- `infrastructure.cluster.x-k8s.io/v1beta1` for CAPZ (AzureMachineTemplate) — correct.
- `infrastructure.cluster.x-k8s.io/v1beta1` for CAPV (VSphereMachineTemplate) — correct.

Field names verified:
- AWS: `instanceType`, `ami.id`, `iamInstanceProfile`, `rootVolume` (size/type/iops/throughput/encrypted/encryptionKey), `nonRootVolumes`, `subnet.id`, `additionalSecurityGroups`, `failureDomain`, `spotMarketOptions.maxPrice` are all valid AWSMachine/AWSMachineTemplate fields.
- Azure: `vmSize`, `image.id`, `image.sharedGallery` (subscriptionID/resourceGroup/name/gallery/version), `osDisk` (osType/diskSizeGB/managedDisk.storageAccountType/cachingType), `dataDisks` (nameSuffix/diskSizeGB/lun/managedDisk/cachingType), `networkInterfaces` (subnetName/privateIPConfigs/acceleratedNetworking), `sshPublicKey`, `securityProfile` (securityType/uefiSettings.secureBootEnabled/vTpmEnabled) are all valid.
- vSphere: `numCPUs`, `memoryMiB`, `diskGiB`, `datacenter`, `datastore`, `resourcePool`, `folder`, `server`, `thumbprint`, `template`, `cloneMode` (linkedClone/fullClone), `network.devices` (networkName/dhcp4/ipAddrs/gateway4/nameservers), `additionalDisksGiB`, `hardwareVersion`, `customVMXKeys` are all valid.

Hardware specs are correct:
- `m5.xlarge` = 4 vCPU, 16 GiB RAM ✓
- `m5.2xlarge` = 8 vCPU, 32 GiB RAM ✓
- `Standard_D4s_v3` = 4 vCPU, 16 GiB RAM ✓

Talos-specific guidance is accurate:
- Talos does not support SSH (correct — Talos is managed entirely via the apid API over gRPC).
- Talos system partitions are small; the EPHEMERAL partition holds container images and pod data (correct).
- 4 vCPU / 8 GB RAM is a reasonable minimum for control plane nodes running etcd + kube-apiserver + controller-manager + scheduler.

The `TalosControlPlane.spec.infrastructureTemplate` field reference is correct for the Sidero Talos control plane provider, and the JSON merge patch shown will update the template reference.

## Review Notes
- `Standard_D4s_v3` is still supported but the Dsv5 / Dsv6 families are newer and offer better price/performance. This is a suggestion, not a correction.
- EBS sizes are technically measured in GiB rather than GB, but the "GB" colloquialism is consistent with AWS's own console labeling, so no change is needed.
- The post uses a placeholder AMI ID (`ami-xxxxxxxxxxxxxxxxx`); readers will need to substitute a Talos AMI ID published by Sidero Labs (https://github.com/siderolabs/talos/releases) for their region.
- For Azure secure boot with `TrustedLaunch`, the chosen VM size must support trusted launch (most v3+ general-purpose sizes do, including `Standard_D4s_v3`), and the Talos image must be a Gen2 image — readers using their own custom image should confirm both prerequisites.
- The `cloneMode: linkedClone` value for vSphere requires the source VM template to have at least one snapshot; otherwise the clone will fail. This is a CAPV/vSphere limitation worth noting but is not an error in the post.
