# Validation Summary: How to Provision a Harvester Cluster from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Harvester
- RKE2
- K3s
- Kubernetes
- cloud-init
- Harvester Cloud Provider
- Harvester CSI Driver

## Sources Consulted
- Harvester Node Driver: https://docs.harvesterhci.io/v1.5/rancher/node/node-driver/
- Creating an RKE2 Kubernetes Cluster: https://docs.harvesterhci.io/v1.7/rancher/node/rke2-cluster/
- Harvester Cloud Provider: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Harvester CSI Driver: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Virtualization Management: https://documentation.suse.com/external-tree/en-us/cloudnative/virtualization/v1.5/en/integrations/rancher/virtualization-management.html
- Rancher Harvester integration overview: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/integrations/harvester/overview.html
- Harvester advanced settings (`cluster-registration-url`, `vip-pools` deprecation): https://docs.harvesterhci.io/v1.6/advanced/index/
- Harvester Load Balancer and IP Pools: https://docs.harvesterhci.io/v1.7/networking/loadbalancer and https://docs.harvesterhci.io/v1.6/networking/ippool
- Harvester VM networking and cloud-init network data examples: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- RKE2 known issues (`iptables` requirement for Canal/Calico cases): https://docs.rke2.io/known_issues
- Ubuntu Jammy cloud image URL verification: https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

## Issues Found
- The Harvester registration flow was outdated. The post referenced `Settings > Rancher Manager`, but current documentation uses Rancher `Virtualization Management` import plus the Harvester `cluster-registration-url` setting. I corrected the registration steps accordingly.
- The prerequisites understated the networking requirement. Harvester node-driver guest clusters require a VLAN network, and the current RKE2 guidance expects DHCP or Managed DHCP on that network. I updated the prerequisite and VM network sections.
- The version guidance was too broad for current RKE2/Harvester cloud provider combinations. Official docs note that newer RKE2 releases with Harvester cloud provider require Harvester `v1.2.0+`. I added that caveat.
- The cloud credential instructions were incomplete. Current docs require choosing the imported Harvester cluster when creating Harvester cloud credentials. I corrected that step.
- The cluster creation flow omitted current UI steps and required inputs. I added the `RKE2/K3s` toggle, clarified the namespace requirement, and added the required SSH user field.
- The cloud-init example missed the `iptables` package that Harvester/RKE2 documentation calls out for Canal/Calico-related cases. I added it to the example.
- The Network Data section was technically wrong: it claimed to show static IP configuration but actually enabled DHCP. I replaced it with a valid DHCP network-data example aligned with Harvester documentation.
- The Harvester cloud provider section overstated the automation behavior and attributed VM lifecycle management to the cloud provider. Current docs are more specific: for RKE2, selecting `Harvester` as the cloud provider deploys the Harvester CCM and CSI automatically. I corrected that wording.
- The load balancer section referenced deprecated `vip-pools`. Harvester deprecated `vip-pools` in favor of IP Pools. I updated the instructions to use `Networks > IP Pools`.
- The load balancer example omitted the required IPAM annotation. Current Harvester cloud provider docs use `cloudprovider.harvesterhci.io/ipam: <dhcp|pool>`. I updated both the configuration snippet and the verification example to create a `LoadBalancer` service with `pool` IPAM.
- The storage section said the CSI driver is automatically configured in a generic way. Current docs make that behavior RKE2-specific when the Harvester cloud provider is selected. I narrowed the wording to match the official behavior.

## Review Notes
- K3s on Harvester remains an experimental or tech-preview path in the official Harvester docs, while the RKE2 flow is the primary documented path.
- DHCP-mode Harvester load balancers require the guest VM image to include the `macvlan` kernel module. This is especially relevant for minimal SLE-based cloud images.
- Harvester documents a current Calico-related guest-cluster load balancer reachability issue and provides a workaround. The post is now correct, but operators using Calico should still review the upstream troubleshooting notes.
