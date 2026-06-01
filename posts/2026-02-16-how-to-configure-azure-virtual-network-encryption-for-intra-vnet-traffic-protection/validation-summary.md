# Validation Summary: Configure Azure Virtual Network Encryption for Intra-VNet Traffic Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Network encryption
- Azure Virtual Machines and VM sizes
- Accelerated Networking
- Azure CLI
- Azure Network Watcher virtual network flow logs
- Traffic Analytics and KQL
- Virtual network peering

## Sources Consulted
- Microsoft Learn: What is Azure Virtual Network encryption? https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-encryption-overview
- Microsoft Learn: Create a virtual network with encryption https://learn.microsoft.com/en-us/azure/virtual-network/how-to-create-encryption
- Microsoft Learn: Virtual Network encryption FAQ https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-encryption-faq
- Microsoft Learn: Azure CLI `az network vnet` reference https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network watcher flow-log` reference https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log?view=azure-cli-latest
- Microsoft Learn: Manage virtual network flow logs https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Microsoft Learn: Traffic analytics schema and data aggregation https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Microsoft Learn: Azure Network Interface `vnetEncryptionSupported` property https://learn.microsoft.com/en-us/javascript/api/%40azure/arm-network/networkinterface?view=azure-node-latest

## Issues Found
- The post described encryption as applying to all VM traffic in the VNet. Updated the wording to supported VM-to-VM traffic, matching Azure's documented VM SKU and accelerated networking requirements.
- The supported VM size list was stale and included F-series v2, which is not in the current Azure Virtual Network encryption requirements. Updated the examples to current D, E, F, M, and L series families from Microsoft Learn.
- The post presented `DropUnencrypted` as generally usable strict enforcement. Microsoft documents `AllowUnencrypted` as the only generally available enforcement mode, so the guidance was changed to warn that `DropUnencrypted` should only be used if Microsoft has enabled it for the subscription.
- The NIC verification command queried the VM resource reference instead of the NIC encryption support property. Updated the query to include `vnetEncryptionSupported`.
- The post omitted the required stop/start cycle for existing VMs after enabling VNet encryption. Added that note.
- The flow log command used an NSG target and legacy options instead of the current virtual network flow log command shape. Updated it to target the VNet with `--vnet` and include `--location`.
- The KQL sample used the old NSG flow log table and a non-current encryption field. Updated it to use `NTANetAnalytics`, `FlowType`, and `FlowEncryption`.
- The post said Traffic Analytics verified encryption at the packet level. Changed this to flow-level verification.
- The limitations section implied ExpressRoute provides its own encryption. Updated it to clarify that VPN uses IPsec, ExpressRoute is not encrypted by default, and VNet encryption should not be enabled on VNets with ExpressRoute gateways.
- The performance section used absolute claims such as zero impact and no measurable throughput reduction. Reworded it to match Microsoft documentation's "minimal effect" language.

## Review Notes
Azure CLI was not installed in the local environment, so CLI command validation was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
