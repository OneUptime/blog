# Validation Summary: How to Create RKE2 Clusters on Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Rancher
- RKE2
- Kubernetes
- Terraform
- Harvester Cloud Provider
- Harvester CSI Driver

## Sources Consulted
- Harvester: Creating an RKE2 Kubernetes Cluster: https://docs.harvesterhci.io/v1.5/rancher/node/rke2-cluster/
- Harvester: Harvester Cloud Provider: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Harvester: Harvester CSI Driver: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Harvester: Rancher Terraform: https://docs.harvesterhci.io/v1.5/rancher/rancher-terraform/
- Rancher: Harvester overview and integration behavior: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/harvester/overview
- Rancher: Access a cluster with kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- RKE2: Known issues and limitations: https://docs.rke2.io/known_issues
- RKE2: Network options: https://docs.rke2.io/networking/basic_network_options

## Issues Found
- The introduction and architecture section implied Harvester itself was an RKE2 cluster. I removed that unsupported claim and kept the explanation at the documented level: Harvester hosts guest RKE2 clusters and Rancher manages them through the Harvester node driver.
- The prerequisites were incomplete. I corrected them to require an imported Harvester cluster in Rancher, cloud images instead of generic VM images, and a VLAN network with DHCP or Managed DHCP for guest VM addressing.
- Step 1 used the wrong Rancher location for Harvester import validation. Current documentation places Harvester import and management under **Virtualization Management**, not **Cluster Management**, so I fixed that workflow.
- The cloud credential example omitted the cluster type selection. I added **Imported Harvester Cluster**, which is required for the documented Harvester node-driver flow.
- The UI provisioning step omitted the Harvester cloud provider selection and used an outdated Kubernetes version example (`v1.27.x`). I changed the version guidance to use the Rancher/Harvester support matrix and added the required **Harvester** cloud provider selection.
- The post did not mention guest image package requirements. I added the need for `qemu-guest-agent`, and for Canal/Calico I added the documented requirement for `iptables` or `xtables-nft`.
- The declarative “Rancher API” YAML was outdated. It omitted the documented Harvester cloud-provider wiring and used older Harvester machine-config fields. I replaced that section with the officially documented Rancher Terraform flow, adapted to the post’s control-plane and worker pool layout.
- The provisioning-monitoring section relied on internal kubeconfig secret retrieval that is not the documented access path. I changed it to the official Rancher **Download KubeConfig** workflow and simplified the machine inspection commands to current, resource-based commands.
- The storage section implied Harvester CSI storage was always present. I corrected it to note that automatic Harvester cloud provider and CSI deployment happens when **Harvester** is selected as the cloud provider; otherwise manual CSI installation is required first.

## Review Notes
- The post now avoids pinning a specific RKE2 patch release and instead points readers to the supported Rancher/Harvester version matrix, which is the safer long-term guidance.
- The Harvester CSI driver documentation still notes version-specific storage capabilities and prerequisites, especially for RWX, online resize, and snapshots. The blog’s PVC test remains valid because it uses a basic `ReadWriteOnce` claim.
