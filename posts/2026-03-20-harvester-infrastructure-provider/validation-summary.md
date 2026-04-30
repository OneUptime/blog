# Validation Summary: How to Use Harvester as Infrastructure Provider in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Rancher
- RKE2
- K3s
- Rancher CLI
- kubectl
- Harvester cloud provider
- Harvester CSI driver

## Sources Consulted
- Harvester Virtualization Management: https://docs.harvesterhci.io/v1.7/rancher/virtualization-management/
- Harvester FAQ: https://docs.harvesterhci.io/v1.7/faq/
- Harvester Node Driver: https://docs.harvesterhci.io/v1.7/rancher/node/node-driver/
- Harvester: Creating an RKE2 Kubernetes Cluster: https://docs.harvesterhci.io/v1.7/rancher/node/rke2-cluster/
- Harvester CSI Driver: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Rancher Harvester Overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/harvester/overview
- Rancher Nodes and Machine Pools: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher CLI source for `clusters` / `cluster` and `kubeconfig`: https://github.com/rancher/cli/blob/main/cmd/cluster.go
- Harvester node driver source for supported machine config fields: https://github.com/harvester/docker-machine-driver-harvester/blob/master/harvester/flags.go
- Harvester node driver source for accepted simple config fields: https://github.com/harvester/docker-machine-driver-harvester/blob/master/harvester/config.go
- Rancher test constructor showing `HarvesterConfig` field layout: https://github.com/rancher/tests/blob/main/actions/machinepools/harvester_machine_config.go

## Issues Found
- The cloud credential step was wrong for the documented workflow. Because the post imports Harvester into Rancher first, the credential should use **Imported Harvester Cluster** and select the imported cluster, not paste a kubeconfig. I corrected that flow to match the Harvester RKE2 provisioning docs.
- The machine-pool example used unsupported or misleading fields, including `storageClass` and `Mi` / `Gi` values that do not match the Harvester driver fields Rancher uses. I replaced the example with field names that match the driver and Rancher-created machine configs: `cpuCount`, `memorySize`, `diskSize`, `imageName`, `networkName`, and `sshUser`.
- The `HarvesterConfig` YAML was invalid as written. Rancher-managed `HarvesterConfig` objects use top-level fields rather than a nested `spec`, and the size values are GiB strings rather than MiB counts. I removed the incorrect `spec` block and corrected the example values.
- The `userData` example installed packages that are not the documented provisioning prerequisites. Harvester and RKE2 documentation call out `qemu-guest-agent` for VM IP detection and `iptables` or `xtables-nft` for Canal/Calico. I replaced the package list and added the documented `systemctl enable --now qemu-guest-agent.service` step.
- The final best-practice bullet overstated Rancher-specific autoscaler support for Harvester worker pools. I changed it to the documented guidance to scale worker machine pools from Rancher when capacity requirements change.

## Review Notes
- The post is technically relevant and salvageable. Its core workflow is correct: import Harvester under **Virtualization Management**, create a Harvester cloud credential, and provision guest clusters through the Harvester node driver.
- Harvester documentation still carries version-specific caveats. The node driver supports only cloud images, guest VMs need a VLAN-backed network with DHCP or Managed DHCP, and older Harvester releases have compatibility constraints with newer Harvester cloud provider versions. The post now reflects the general prerequisites, but readers still need the Rancher and Harvester support matrix for exact version selection.
- The Rancher CLI commands in Step 5 are valid. I verified `rancher cluster ls` and `rancher cluster kubeconfig` against the official Rancher CLI source because the general CLI docs list command groups more broadly than individual subcommand aliases.
