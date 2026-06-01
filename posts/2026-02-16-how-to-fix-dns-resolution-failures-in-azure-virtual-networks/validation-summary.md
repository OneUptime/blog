# Validation Summary: How to Fix DNS Resolution Failures in Azure Virtual Networks

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Virtual Network DNS
- Azure-provided DNS
- Azure Private DNS Zones
- Azure Private Endpoints / Private Link
- Azure DNS Private Resolver
- Azure CLI
- BIND DNS forwarding zones
- Windows DNS conditional forwarders
- Linux and Windows DNS cache tooling
- Java JVM DNS cache settings

## Sources Consulted
- Microsoft Learn: Configure DNS name resolution for Azure virtual networks - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances
- Microsoft Learn: Create, change, or delete an Azure virtual network - https://learn.microsoft.com/en-us/azure/virtual-network/manage-virtual-network
- Microsoft Learn: Azure Private DNS zone overview - https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn: What is a virtual network link in Azure Private DNS - https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Private Endpoint DNS integration scenarios - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: az network private-dns link vnet - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Microsoft Learn: az network nsg rule - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- ISC Knowledge Base: dig and the +trace option - https://kb.isc.org/docs/aa-00208
- BIND 9 Administrator Reference Manual - https://bind9.readthedocs.io/
- Oracle Java Networking Properties: InetAddress cache policy - https://docs.oracle.com/en/java/javase/

## Issues Found
- The Linux diagnostic command used `dig myservice.database.windows.net +trace` while describing a resolver test from inside the VM. `+trace` makes `dig` follow delegation from the root servers and is not the right way to verify the VM's configured Azure VNet, custom DNS, or Private DNS resolution path. Changed it to `dig myservice.database.windows.net`.
- The VNet peering section said only one VNet can have `registration-enabled` set to true per Private DNS zone. Azure documentation says a Private DNS zone can have multiple registration virtual networks, while each virtual network can have only one registration zone. Updated the note accordingly.

## Review Notes
- Azure CLI was not installed in the local environment, so command syntax was verified against Microsoft Learn CLI documentation rather than local `az --help`.
- The DNS forwarding guidance for Private Endpoints is accurate for DNS forwarders running in Azure VNets linked to the relevant Private DNS zones. For on-premises DNS servers, Azure DNS Private Resolver or an Azure-based DNS forwarder is typically needed because 168.63.129.16 is an Azure platform address.
