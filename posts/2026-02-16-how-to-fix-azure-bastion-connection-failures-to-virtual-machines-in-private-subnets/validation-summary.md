# Validation Summary: How to Fix Azure Bastion Connection Failures to Virtual Machines

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Bastion
- Azure Virtual Machines
- Azure Virtual Network and VNet peering
- Network Security Groups
- Azure CLI
- RDP and SSH

## Sources Consulted
- Microsoft Learn: What is Azure Bastion? https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: Choose the right Azure Bastion SKU to meet your needs https://learn.microsoft.com/en-us/azure/bastion/bastion-sku-comparison
- Microsoft Learn: About Azure Bastion configuration settings https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Microsoft Learn: Configure NSG rules for Azure Bastion https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Configure Bastion for native client connections https://learn.microsoft.com/en-us/azure/bastion/native-client
- Microsoft Learn: View or upgrade an Azure Bastion SKU https://learn.microsoft.com/en-us/azure/bastion/upgrade-sku
- Microsoft Learn: Azure CLI az network bastion reference https://learn.microsoft.com/en-us/cli/azure/network/bastion
- Microsoft Learn: Troubleshoot Azure Bastion deployment and configuration problems https://learn.microsoft.com/en-us/troubleshoot/azure/bastion/troubleshoot-deployment-configuration-problems
- Microsoft Learn: Troubleshoot virtual network peering problems in Azure Bastion https://learn.microsoft.com/en-us/troubleshoot/azure/bastion/troubleshoot-virtual-network-peering-problems

## Issues Found
- The AzureBastionSubnet NSG rule list and CLI example omitted required internal Bastion communication rules for ports 8080 and 5701, plus outbound HTTP port 80. Added the missing inbound and outbound rules to match Microsoft Learn's required NSG table.
- The post said Basic SKU cannot connect to VMs in peered VNets. Current Microsoft Learn SKU documentation says Basic supports VNet peering and peered-VNet VM connectivity; Developer does not. Corrected the peering and SKU limitation sections.
- The peered-VNet troubleshooting checklist treated "Allow forwarded traffic" as a required Bastion setting. Microsoft Learn's Bastion peering troubleshooting focuses on peering state and required read permissions for the target VM, NIC, Bastion resource, and VNet. Replaced that item and updated the CLI query to check `allowVirtualNetworkAccess`.
- The Basic-to-Standard upgrade command omitted the location requirement documented by Microsoft Learn and did not enable native client/IP-connect features that the surrounding text recommends. Updated the command to include `--location`, `--sku name=Standard`, `--enable-tunneling true`, and `--enable-ip-connect true`.
- The native client wording said Standard SKU only. Current documentation supports native client connections on Standard and Premium when native client support is enabled. Updated the wording around native RDP and SSH examples.
- The VM power-state command queried `instanceView.statuses[1]`, which relies on array order. Replaced it with a JMESPath filter for status codes that start with `PowerState/`.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against the official Azure CLI reference instead of local `az --help` output.
