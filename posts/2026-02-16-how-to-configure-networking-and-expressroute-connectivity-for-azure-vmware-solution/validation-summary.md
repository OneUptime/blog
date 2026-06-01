# Validation Summary: How to Configure Networking and ExpressRoute Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure VMware Solution
- Azure ExpressRoute
- ExpressRoute Global Reach
- Azure Virtual Network gateways
- Azure CLI
- VMware NSX-T workload networking
- NSX DNS services and DNS zones
- Azure Firewall / network virtual appliances

## Sources Consulted
- Microsoft Learn: Tutorial: Configure networking for your VMware private cloud in Azure - https://learn.microsoft.com/en-us/azure/azure-vmware/tutorial-configure-networking
- Microsoft Learn: Azure VMware Solution FAQ - https://learn.microsoft.com/en-us/azure/azure-vmware/faq
- Microsoft Learn: Azure VMware Solution network design guide: Connectivity with Azure virtual networks - https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/scenarios/azure-vmware/virtual-network-connectivity
- Microsoft Learn: Azure VMware Solution network design guide: Connectivity with on-premises sites - https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/scenarios/azure-vmware/on-premises-connectivity
- Microsoft Learn: Connect to an on-premises environment - Azure VMware Solution - https://learn.microsoft.com/en-us/azure/azure-vmware/native-connect-on-premises
- Microsoft Learn: Set a default internet route or turn off internet access - Azure VMware Solution - https://learn.microsoft.com/en-us/azure/azure-vmware/disable-internet-access
- Microsoft Learn: Turn on public IP addresses to an NSX Edge node for VMware NSX - Azure VMware Solution - https://learn.microsoft.com/en-us/azure/azure-vmware/enable-public-ip-nsx-edge
- Microsoft Learn: Configure DNS forwarder for Azure VMware Solution - https://learn.microsoft.com/en-us/azure/azure-vmware/configure-dns-azure-vmware-solution
- Microsoft Learn: Configure private and public DNS forward lookup zones - Azure VMware Solution - https://learn.microsoft.com/en-us/azure/azure-vmware/native-dns-forward-lookup-zone
- Microsoft Learn: About ExpressRoute virtual network gateways - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Azure ExpressRoute FastPath: Features, availability, and limitations - https://learn.microsoft.com/en-us/azure/expressroute/about-fastpath
- Microsoft Learn Azure CLI reference: az vmware authorization - https://learn.microsoft.com/en-us/cli/azure/vmware/authorization
- Microsoft Learn Azure CLI reference: az vmware workload-network segment - https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/segment
- Microsoft Learn Azure CLI reference: az vmware workload-network dns-zone - https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/dns-zone
- Microsoft Learn Azure CLI reference: az vmware workload-network dns-service - https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network/dns-service
- Microsoft Learn Azure CLI reference: az vmware private-cloud - https://learn.microsoft.com/en-us/cli/azure/vmware/private-cloud
- Microsoft Learn Azure CLI reference: az network vpn-connection - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Microsoft Learn Azure CLI reference: az network express-route peering connection - https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering/connection

## Issues Found
- The introduction said the guide covered virtual network peering, but the implementation uses an ExpressRoute virtual network gateway connection. Changed the wording to "virtual network gateway connectivity."
- The Global Reach example reused the Step 3 authorization key without noting that a redeemed authorization key may need to be recreated. Added a note to create a new AVS authorization key when needed.
- The NSX segment commands used unsupported `--segment-id` and `--subnet` arguments. Updated them to the documented `--segment`, `--dhcp-ranges`, and `--gateway-address` arguments.
- The DNS service and DNS zone commands used unsupported `--dns-service-id` and `--dns-zone-id` arguments and created the DNS service before the referenced zone. Reordered the commands and updated them to the documented `--dns-zone`, `--dns-service`, `--domain`, `--dns-server-ips`, `--source-ip`, `--default-dns-zone`, and `--fqdn-zones` forms.
- The DNS explanation claimed unmatched queries would use default Azure DNS resolution. Updated it to say unmatched queries use the DNS servers configured on the default DNS forwarder zone.
- The internet access section labeled `az vmware private-cloud update --internet Enabled` as "Azure public IP on NSX-T edge." Updated the label to outbound AVS internet connectivity, because public IP down to NSX Edge is a separate portal/NSX configuration.
- The Azure Firewall/NVA option showed only a hub VNet route table, which does not by itself advertise a default route to AVS. Replaced the snippet with the required behavior: advertise `0.0.0.0/0` from Azure Firewall, an NVA, or Virtual WAN hub and select the AVS "Connect using default route from Azure" option.
- The DNS verification example used a generic `vcenter.avs.azure.com` name. Replaced it with a private-cloud-specific example FQDN.

## Review Notes
The local workspace does not have the Azure CLI installed, so command validation was performed against Microsoft Learn Azure CLI references rather than local `az --help` output. The post still uses placeholder values such as `TNT##-T1`, `TNT##-DNS-FORWARDER-ZONE`, and sample IP ranges; readers must replace these with values from their AVS private cloud and network design.
