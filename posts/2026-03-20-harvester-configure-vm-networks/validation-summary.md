# Validation Summary: How to Configure VM Networks in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- KubeVirt
- Multus CNI
- CNI bridge plugin
- VLAN networking

## Sources Consulted
- Harvester VM Network documentation: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester Cluster Network documentation: https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester docs source for `harvester-network.md`: https://github.com/harvester/docs/blob/master/versioned_docs/version-v1.7/networking/harvester-network.md
- Harvester docs source for `clusternetwork.md`: https://github.com/harvester/docs/blob/master/versioned_docs/version-v1.7/networking/clusternetwork.md
- Harvester network-controller `VlanConfig` CRD: https://github.com/harvester/network-controller-harvester/blob/master/manifests/crds/network.harvesterhci.io_vlanconfigs.yaml
- Harvester network-controller network type helpers: https://github.com/harvester/network-controller-harvester/blob/master/pkg/utils/nad.go
- KubeVirt Interfaces and Networks guide: https://kubevirt.io/user-guide/network/interfaces_and_networks/
- KubeVirt Startup Scripts guide: https://kubevirt.io/user-guide/user_workloads/startup_scripts/
- KubeVirt Accessing Virtual Machines guide: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt virtctl client tool guide: https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/
- CNI bridge plugin documentation: https://www.cni.dev/plugins/current/main/bridge/
- Multus usage guide: https://k8snetworkplumbingwg.github.io/multus-cni/docs/how-to-use.html

## Issues Found
- The introduction overstated Multus as the basis for all Harvester networking. I updated it to reflect that Harvester uses a built-in management network plus Multus-managed secondary VM networks.
- The post claimed Harvester supports exactly three VM network types. Current Harvester documentation also includes VLAN trunk and overlay networking, so I changed the wording to say the guide focuses on three common types instead of presenting an exhaustive list.
- The discovery commands and object model were incorrect. `NetworkAttachmentDefinition` resources are VM networks, not cluster network configurations, and the draft used an invalid `NodeNetwork` example for uplink mapping. I replaced those sections with the current `clusternetworks`, `vlanconfigs`, and a valid `ClusterNetwork` plus `VlanConfig` workflow.
- The `ClusterNetwork` YAML used unsupported fields such as `spec.description`, `spec.enable`, and `spec.mtu`. I removed those fields and corrected the example to the current cluster-scoped object shape.
- The manual `NetworkAttachmentDefinition` examples used `mgmt-br` for a custom cluster network. Harvester uses `<cluster-network>-br` for custom bridges, so I updated both the untagged and VLAN examples to use `vlan-network-br`.
- The untagged network example was mislabeled and misleadingly named. I corrected it to use Harvester’s `UntaggedNetwork` type and renamed the example from `physical-bridge-100` to `physical-untagged`.
- The UI VLAN-network creation steps were incomplete and inconsistent with the later VM manifest. I added the missing `Type` and `Mode` fields and aligned the UI-created network name with the manifest’s `networkName`.
- The VM manifest was incomplete because it declared volumes without corresponding disk attachments. I added the required disk definitions.
- The cloud-init example for guest static networking was brittle and inaccurate because it assumed a guest NIC name and used an incorrect route example. I removed that block and clarified that the secondary NIC still needs DHCP or static guest-side configuration.
- The Multus troubleshooting command assumed a hard-coded namespace and label that may not exist on all Harvester clusters. I replaced it with a discovery step followed by a generic `kubectl logs` pattern.

## Review Notes
- Current Harvester documentation for v1.7 documents `VLAN Trunk Network` and experimental `Overlay Network` in addition to management, VLAN, and untagged networks.
- The Harvester UI concept called a “Network Config” is backed by the `VlanConfig` CRD.
- Current Harvester documentation states that VM networks inherit MTU from the associated cluster-network uplink configuration, so the corrected examples do not set MTU directly on the `NetworkAttachmentDefinition`.
