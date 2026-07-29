# Validation Summary: Why Did My Azure VM Public IP Change After Stop and Start?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Microsoft Azure
- Azure Virtual Machines
- Azure public and private IP addressing
- Azure network interfaces
- Azure CLI
- Azure DNS labels
- Network security groups
- Azure Load Balancer
- Azure NAT Gateway
- Azure Application Gateway
- Azure Front Door
- Azure Bastion
- VPN Gateway and ExpressRoute
- Azure Private Link

## Sources Consulted

- [Create, change, or delete an Azure public IP address](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address)
- [Upgrade Basic Public IP Address to Standard SKU in Azure](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-basic-upgrade-guidance)
- [Configure IP addresses for an Azure network interface](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses)
- [Associate a public IP address to a virtual machine](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/associate-public-ip-address-vm)
- [Create a VM with a static public IP address](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-static-public-ip)
- [Azure CLI reference: `az network public-ip`](https://learn.microsoft.com/en-us/cli/azure/network/public-ip)
- [Azure CLI reference: `az network nic`](https://learn.microsoft.com/en-us/cli/azure/network/nic)
- [Azure CLI reference: `az vm`](https://learn.microsoft.com/en-us/cli/azure/vm)
- [Public IP Addresses - Get REST API](https://learn.microsoft.com/en-us/rest/api/virtualnetwork/public-ip-addresses/get?view=rest-virtualnetwork-2025-05-01)
- [States and billing status of Azure Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)
- [Redeploy Windows virtual machines in Azure](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)
- [Maintenance for virtual machines in Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/maintenance-and-updates)
- [Source Network Address Translation for Azure Load Balancer outbound connections](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections)
- [Design virtual networks with Azure NAT Gateway](https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-design)
- [What is Azure Bastion?](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview)
- [What is Azure Private Link?](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)

## Issues Found

- The `az network public-ip show` query read `fqdn` as a top-level property. Azure CLI exposes the value as `dnsSettings.fqdn`. Updated the query so the `dns` column displays the public IP resource's FQDN when a DNS label is configured.
- The public IP creation example did not ensure that the new resource was in the NIC's region, which Azure requires for association. Added a lookup for the NIC location and passed it to `az network public-ip create` with `--location`.
- The post did not mention that Basic SKU public IPs were retired on September 30, 2025. Added the current Microsoft support caveat: existing Basic addresses may remain operational, but they are unsupported and have no SLA coverage, so they should be upgraded or replaced.

## Review Notes

- Verified the Azure CLI command groups, required arguments, `--ids`, `--public-ip-address`, `--allocation-method`, `--sku`, `--location`, JMESPath queries, and output options against current Microsoft CLI references and locally installed Azure CLI help.
- Verified that a guest reboot or Azure Restart preserves allocation, while stop/deallocate can change a dynamic public IP. Redeploy and self-service maintenance that redeploys a VM can also update dynamic addresses.
- Verified Azure-managed DNS label behavior, Standard public IP secure-by-default behavior, NIC-level private address allocation through Azure DHCP, and the special guest configuration requirements for multiple IP addresses.
- Verified the separation of inbound and outbound addressing, including NAT Gateway precedence and explicit Azure Load Balancer outbound SNAT behavior.
- Verified that Azure Bastion supports RDP and SSH to VMs over private IP addresses without requiring public IP addresses on the VMs.
- All four documentation links that were originally present in the post returned successful HTTP responses and pointed to the intended Microsoft Learn pages.
