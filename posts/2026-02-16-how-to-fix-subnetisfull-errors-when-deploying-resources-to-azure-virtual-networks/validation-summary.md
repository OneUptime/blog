# Validation Summary: Fix 'SubnetIsFull' Errors When Deploying Resources to Azure Virtual Networks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Virtual Network
- Azure subnets and CIDR sizing
- Azure CLI
- Azure App Service VNet Integration
- Azure Kubernetes Service networking
- Azure CNI, Azure CNI Pod Subnet, Azure CNI Overlay, and kubenet
- Azure Application Gateway
- Azure Firewall
- Azure Bastion
- Azure VPN Gateway
- Azure Private Endpoints
- Azure Resource Graph

## Sources Consulted
- Microsoft Learn: Private IP addresses in Azure - https://learn.microsoft.com/azure/virtual-network/private-ip-addresses
- Microsoft Learn: Troubleshoot subnet deletion and modification failures in Azure Virtual Network - https://learn.microsoft.com/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-cannot-delete-modify-subnet
- Microsoft Learn: Azure CLI az network vnet reference - https://learn.microsoft.com/cli/azure/network/vnet
- Microsoft Learn: Integrate your app with an Azure virtual network - https://learn.microsoft.com/azure/app-service/overview-vnet-integration
- Microsoft Learn: Azure Application Gateway infrastructure configuration - https://learn.microsoft.com/azure/application-gateway/configuration-infrastructure
- Microsoft Learn: Azure Firewall FAQ - https://learn.microsoft.com/azure/firewall/firewall-faq
- Microsoft Learn: Azure Bastion configuration settings - https://learn.microsoft.com/azure/bastion/configuration-settings
- Microsoft Learn: Azure VPN Gateway FAQ - https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-vpn-faq
- Microsoft Learn: AKS IP address planning - https://learn.microsoft.com/azure/aks/concepts-network-ip-address-planning
- Microsoft Learn: AKS Azure CNI Overlay networking - https://learn.microsoft.com/azure/aks/azure-cni-overlay
- Microsoft Learn: Update Azure CNI IPAM mode and data plane technology - https://learn.microsoft.com/azure/aks/upgrade-azure-cni
- Microsoft Learn: Manage Azure private endpoints - https://learn.microsoft.com/azure/private-link/manage-private-endpoint

## Issues Found
- Azure reserved IP explanation incorrectly labeled the last address as a broadcast address and attributed specific meanings to the first four addresses. Updated it to match Microsoft guidance: Azure reserves the first four and last address in each subnet.
- App Service VNet Integration IP usage was too simplified. Updated it to note one IP per App Service plan instance and the need for extra headroom during scale operations and platform upgrades.
- AKS Azure CNI wording conflated all Azure CNI modes. Updated the post to distinguish traditional Azure CNI, Azure CNI Pod Subnet, and Azure CNI Overlay.
- Application Gateway IP usage mentioned management IPs. Updated it to the documented model: one private IP per instance plus another private IP when a private frontend IP is configured.
- The subnet resize section said Azure allows expanding without downtime but cannot shrink. Updated it to the documented rule that resizing active subnets is allowed only when the new range includes all existing assigned IPs, with service-specific constraints possible.
- The subnet create and update commands used `--address-prefix`. Updated them to the current documented Azure CLI parameter, `--address-prefixes`.
- The AKS CNI Overlay migration guidance said migration requires creating a new node pool. Updated it to reflect current Azure support for eligible in-place updates with `az aks update`, including the irreversible node pool reimage caveat.
- The AKS traditional Azure CNI subnet sizing table entry gave a fixed `/24 minimum`. Replaced it with guidance to size by nodes, max surge, and max pods per node.

## Review Notes
The Azure CLI binary was not installed in the local workspace, so command validation was performed against the current Microsoft Learn Azure CLI reference and Azure service documentation. The Azure Resource Graph query is reasonable for a utilization overview, but production monitoring may need additional handling for resources that do not appear as simple subnet `ipConfigurations`.
