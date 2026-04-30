# Validation Summary: How to Configure Harvester with Multiple NICs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harvester
- Longhorn
- Kubernetes
- YAML configuration
- Linux networking and NIC bonding
- Harvester ClusterNetwork and VlanConfig resources

## Sources Consulted
- Harvester Documentation: Harvester Configuration — https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Documentation: Hardware and Network Requirements — https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester Documentation: Cluster Network — https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester Documentation: VM Network — https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester Documentation: Storage Network — https://docs.harvesterhci.io/v1.7/advanced/storagenetwork/
- Harvester Documentation: Update Harvester Configuration After Installation — https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester Network Controller source: `ClusterNetwork` type — https://github.com/harvester/network-controller-harvester/blob/master/pkg/apis/network.harvesterhci.io/v1beta1/clusternetwork.go
- Harvester Network Controller source: `VlanConfig` type — https://github.com/harvester/network-controller-harvester/blob/master/pkg/apis/network.harvesterhci.io/v1beta1/vlanconfig.go
- Longhorn Documentation: Storage Network — https://longhorn.io/docs/1.10.0/advanced-resources/deploy/storage-network/
- Longhorn Documentation: Architecture and Concepts — https://longhorn.io/docs/1.11.1/concepts/

## Issues Found
1. The installation YAML used an outdated schema. The post used top-level `network` and `harvester.management_interface` keys, plus camelCase fields such as `subnetMask` and `dnsNameservers`. I changed the example to the current Harvester configuration format using `install.management_interface`, `subnet_mask`, `os.dns_nameservers`, top-level `token`, and `os.password`.

2. The post implied that extra NICs should be declared in the installer config and directly assigned to storage and VM roles during installation. Current Harvester docs only configure the management interface during install; additional NICs are attached to custom cluster networks after installation. I corrected the explanation and examples accordingly.

3. The bonding example was technically incorrect for current Harvester. The original post used a `network.bonds` section that does not match the documented installer schema. I replaced it with the supported `install.management_interface.interfaces` plus `bond_options` example and clarified that post-install custom uplink bonding belongs in `VlanConfig`.

4. The post-install storage NIC procedure was outdated and misleading. Editing `/etc/sysconfig/network/ifcfg-eth1`, assigning a host IP, and using `wicked ifup` is not the current documented Harvester workflow for a Longhorn storage network. I replaced that section with the current `ClusterNetwork` plus `VlanConfig` approach.

5. The Longhorn storage network example used the wrong resource and wrong value format. The original post applied a Longhorn `Setting` object with a CIDR in `spec.value`, but current Harvester documentation explicitly says to use Harvester's `settings.harvesterhci.io` `storage-network` setting, whose value is a JSON string containing `vlan`, `clusterNetwork`, `range`, and optional `exclude`. I updated the YAML and verification command to the Harvester-managed flow.

6. The VM network example used an incorrect `ClusterNetwork` spec and an incorrect `NodeNetwork` manifest. Current Harvester `ClusterNetwork` objects do not use the `description`, `enable`, and `mtu` fields shown in the post, and the `NodeNetwork` example did not match current resource definitions. I replaced this with the documented `ClusterNetwork` plus `VlanConfig` pattern and clarified that the actual VLAN/Untagged VM network is then created on top of that cluster network.

7. The verification and persistence sections assumed raw interfaces such as `eth0`, `eth1`, and `eth2` would remain the primary objects of interest. Harvester creates managed bond/bridge devices for its cluster networks, so I updated the examples to verify the Harvester-managed interfaces and CRDs instead.

8. The performance table included hard numerical claims that were not supported by official documentation. I changed those statements to qualitative, technically defensible descriptions of contention and predictability.

9. The introductory and concluding claims were too absolute in places, especially around traffic "never" affecting management operations and the recommended production NIC layout. I softened those claims to match Harvester's current guidance and recommendations.

## Review Notes
- The post now aligns with the current Harvester v1.7 networking model, where management networking is configured during installation and additional traffic isolation is built with custom cluster networks and the Harvester-managed `storage-network` setting.
- Applying or changing the storage network is a maintenance-window operation in practice. Harvester documents prerequisites around stopped VMs, detached volumes, and other Longhorn-related workloads before the setting is applied.
- If different nodes use different NIC names or physical layouts, separate `VlanConfig` objects and node selection are required instead of a single cluster-wide example.
