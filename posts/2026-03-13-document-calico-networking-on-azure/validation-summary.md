# Validation Summary: Document Calico Networking on Azure for Operators

## Status
validated

## Post Type
Operational guide / reference

## Technologies Covered
- Calico networking
- Kubernetes
- Azure Virtual Network
- Azure network interfaces
- Azure network security groups
- Azure route tables / user-defined routes
- Azure CLI
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Azure public cloud support and Azure UDR requirements, https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico documentation: IPPool VXLAN behavior and block sizes, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Kubernetes network requirements and VXLAN UDP 4789, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Felix VXLAN port default, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Microsoft Learn: Azure network interface IP forwarding and `az network nic update`, https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Microsoft Learn: Azure CLI `az network nic` reference, https://learn.microsoft.com/en-us/cli/azure/network/nic
- Microsoft Learn: Azure Accelerated Networking supported configurations, https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview
- Kubernetes documentation: default ports and protocols, including kubelet TCP 10250, https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The post implied Azure route tables are always required for Calico on Azure. Calico documentation distinguishes Azure UDR/native routing from VXLAN mode, and explicitly states VXLAN mode is supported on Azure while IPIP is blocked. Updated the wording so route tables are documented as required for native routing only, not for VXLAN encapsulation.
- The dependency map placed a pod route table under resources required by Calico even though the same post recommends VXLAN Always. Updated the diagram heading and route-table label to avoid treating per-node pod CIDR routes as required for VXLAN mode.
- The node checklist said accelerated networking support could be inferred from D/E/F series. Microsoft documentation describes support by VM size, vCPU count, OS image, and SKU capabilities rather than a blanket series rule. Updated the checklist to require confirmation that the selected VM size and OS image support Accelerated Networking.
- The checklist used `az vm show --query "networkProfile"` to verify accelerated networking. Accelerated Networking is a NIC setting, so the post now uses `az network nic show --ids <NIC_ID> --query enableAcceleratedNetworking`.
- The checklist required the worker NSG to be attached to the NIC. Azure NSGs can be applied at the subnet or NIC level, so the wording now says the NSG is applied to the VM subnet or NIC.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI/reference documentation rather than local `az --help` output. The remaining command examples and port references matched the consulted official documentation for the documented scenario.
