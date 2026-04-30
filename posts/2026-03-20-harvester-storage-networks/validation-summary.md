# Validation Summary: How to Set Up Storage Networks in Harvester

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester
- Longhorn
- Kubernetes
- Multus / NetworkAttachmentDefinition
- Whereabouts CNI
- Linux networking

## Sources Consulted
- Harvester Storage Network: https://docs.harvesterhci.io/v1.7/advanced/storagenetwork/
- Harvester Settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Cluster Network: https://docs.harvesterhci.io/v1.7/networking/index/
- Longhorn Storage Network: https://longhorn.io/docs/1.11.1/advanced-resources/deploy/storage-network/
- Longhorn Settings Reference: https://longhorn.io/docs/1.11.1/references/settings/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Nixery usage reference: https://nixery.dev/

## Issues Found
- The post instructed readers to manually configure host NICs with static IPs and `wicked`, but current Harvester storage networking is configured through Harvester `ClusterNetwork` and `storage-network` settings. I replaced the host-level NIC steps with the documented Harvester workflow.
- The post configured the wrong API object for storage networking. It edited Longhorn's `Setting` CR directly with a CIDR value, but Harvester documents that this should be managed through `settings.harvesterhci.io` using a JSON `value` that includes `vlan`, `clusterNetwork`, `range`, and optional `exclude`. I replaced the manifest and verification command accordingly.
- The UI instructions were inaccurate. The post pointed to a generic settings path and treated the value as a plain CIDR, while Harvester requires `Advanced > Settings > storage-network` with VLAN ID, cluster network, IP range, and exclude fields. I corrected the UI flow.
- The verification guidance was incomplete and partly incorrect. I replaced log-grep and `storageIP` checks with the documented Harvester/Longhorn validation flow: confirm `configured=True`, inspect `instance-manager` pods, and verify the `lhnet1` interface.
- The MTU section treated storage networking like node-to-node host IP traffic. Harvester documents that the storage-network interface inherits MTU from the attached cluster network and that MTU changes require disabling the storage network first. I rewrote this section to match the documented behavior.
- The NetworkPolicy section was technically misleading. Standard Kubernetes `NetworkPolicy` resources govern Pod traffic and do not configure Harvester's dedicated Longhorn storage-network routing. I replaced that section with an accurate explanation of the isolation boundary.
- The fio benchmark manifest would not work as written because it referenced a nonexistent PVC and used an imprecise Nixery image path. I added a Longhorn-backed PVC and changed the image reference to `nixery.dev/shell/fio`.

## Review Notes
- The examples assume a uniform layout with `eth2`, VLAN `100`, and the default `harvester-longhorn` StorageClass. Real deployments may use different uplinks, VLAN IDs, node selectors, and storage classes.
- Harvester requires the storage-network IP range to be sized for Longhorn pods, backing image managers, and concurrent image operations. The example `/24` is valid for the sample layout, but production sizing should follow the Harvester formula in the official storage-network documentation.
