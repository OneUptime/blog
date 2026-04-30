# Validation Summary: How to Set Up VLAN Networks in Harvester

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester
- Kubernetes
- KubeVirt
- Multus CNI
- VLANs / IEEE 802.1Q
- cloud-init

## Sources Consulted
- Harvester VM Network documentation: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester Cluster Network documentation: https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.7/install/requirements/
- KubeVirt Interfaces and Networks: https://kubevirt.io/user-guide/network/interfaces_and_networks/
- KubeVirt NetworkPolicy guide: https://kubevirt.io/user-guide/network/networkpolicy/
- KubeVirt Filesystems, Disks and Volumes: https://kubevirt.io/user-guide/storage/disks_and_volumes/
- KubeVirt Startup Scripts: https://kubevirt.io/user-guide/user_workloads/startup_scripts/
- KubeVirt Accessing Virtual Machines: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt secondary-network policy limitations: https://kubevirt.io/2023/OVN-kubernetes-secondary-networks-policies.html
- cloud-init NoCloud datasource reference: https://cloudinit.readthedocs.io/en/latest/reference/datasources/nocloud.html
- cloud-init networking config version 2 reference: https://cloudinit.readthedocs.io/en/24.1/reference/network-config-format-v2.html

## Issues Found
1. **Invalid IPv4 subnet in the design example**: The post used `10.0.300.0/24` for VLAN 300, which is not a valid IPv4 subnet because octets cannot exceed 255. I changed it to `10.3.0.0/24` and updated the matching DMZ route example.

2. **Outdated Harvester cluster-network workflow**: The post used custom `ClusterNetwork` and `NodeNetwork` manifests that do not match Harvester's current documented setup flow. I replaced those sections with the documented `Cluster Network` plus `Network Config` workflow in the Harvester UI.

3. **Incomplete VM network creation details**: The UI example omitted the documented `Type`, `Mode`, and route configuration. I added `L2VlanNetwork`, `Access` mode, and the route settings needed for manual gateway/CIDR configuration, while noting that `Auto(DHCP)` is the alternative when DHCP exists on the VLAN.

4. **Incorrect raw `NetworkAttachmentDefinition` creation example**: The original `kubectl` example used `mgmt-br`, omitted Harvester-managed labels, and presented a manually authored object that did not reflect Harvester's documented generated output. I changed this section to inspect the controller-generated `NetworkAttachmentDefinition` and updated the example to match the documented bridge naming and labels.

5. **Invalid KubeVirt VM manifest**: The VM example declared `volumes` but did not attach corresponding `disks`, which KubeVirt requires. I added valid `disks` entries for the root disk and cloud-init disk.

6. **Brittle guest NIC configuration**: The original VM example hard-coded a guest interface name (`enp2s0`), which is not portable. I replaced it with `cloudInitNoCloud.networkData` that matches the VLAN NIC by MAC address and enables DHCP on a predictable guest-side name.

7. **Verification commands targeted the wrong bridge and used invalid placeholder IPs**: The post checked `mgmt-br`, which is not the bridge created for the custom `vlan` cluster network, and used `10.0.200.x` / `10.0.100.x` as literal ping targets. I updated the verification flow to inspect the generated Harvester NAD and replaced the placeholder IPs with valid example addresses.

8. **Overbroad NetworkPolicy guidance in the conclusion**: The original conclusion suggested using Kubernetes `NetworkPolicies` together with Harvester VLAN networks. Since Kubernetes `NetworkPolicies` govern the default network and not Harvester's bridge-based secondary VLAN interfaces directly, I narrowed the guidance to external firewall rules and guest OS firewalls.

## Review Notes
- The corrected post now aligns with the Harvester v1.7 networking model, where custom cluster networks are enabled through `Network Config` objects and VM VLAN networks surface as Harvester-managed `NetworkAttachmentDefinition` resources.
- The guide assumes a current Harvester release family. Older Harvester versions used different UI paths and earlier VLAN-network behavior.
- A live Harvester cluster was not available in this environment, so the review was performed against official documentation and API behavior rather than by executing the full workflow end-to-end.
