# Validation Summary: How to Set Up Azure Bastion to Securely Connect to Virtual Machines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Bastion
- Azure Virtual Machines
- Azure Virtual Network and subnets
- Azure Network Security Groups
- Azure public IP addresses
- Azure CLI
- SSH, RDP, SCP

## Sources Consulted
- Microsoft Learn: What is Azure Bastion? https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: About Azure Bastion configuration settings. https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Microsoft Learn: Choose the right Azure Bastion SKU. https://learn.microsoft.com/en-us/azure/bastion/bastion-sku-comparison
- Microsoft Learn: Configure NSG rules for Azure Bastion. https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Configure Bastion for native client connections. https://learn.microsoft.com/en-us/azure/bastion/native-client
- Microsoft Learn: File transfer using a native client. https://learn.microsoft.com/en-us/azure/bastion/vm-upload-download-native
- Microsoft Learn: Azure CLI `az network bastion` reference. https://learn.microsoft.com/en-us/cli/azure/network/bastion
- Microsoft Learn: Deploy Bastion using Azure CLI. https://learn.microsoft.com/en-us/azure/bastion/create-host-cli

## Issues Found
- The Bastion deployment command used the Standard SKU but did not enable tunneling, file copy, or shareable links. The Azure CLI reference shows these feature flags default to false. I added `--enable-tunneling true`, `--file-copy true`, and `--shareable-link true` so the later native client, file transfer, and shareable link sections match the deployed resource.
- The Standard SKU description implied native client support, shareable links, and file transfer are automatically enabled. I changed the wording to "optional" to match Azure Bastion feature configuration behavior.
- The native client section said Standard SKU alone was enough. I clarified that native client support must be enabled.
- The subnet sizing explanation incorrectly tied a /26 AzureBastionSubnet to 50 concurrent sessions. Microsoft documents /26 as the minimum subnet size for new dedicated deployments, while concurrent session capacity depends on SKU, instance count, and workload. I corrected that explanation.
- The architecture explanation said no NSG rules for management ports were needed. I tightened this to no internet-facing NSG rules, because restrictive target VM NSGs may still need private access from Bastion.
- The NSG section claimed to show the minimum required configuration but omitted required Bastion host communication, Azure Load Balancer inbound, Bastion communication outbound, and HTTP outbound rules. I added those missing rules and aligned the SSH/RDP outbound protocol with Microsoft's required NSG rule table.
- The file transfer section incorrectly said files can be uploaded and downloaded through the browser-based Azure portal session. Microsoft documentation says file transfers are supported using the native client only and not through PowerShell or the Azure portal. I rewrote that section to use native RDP copy/paste and SSH file transfer through `az network bastion tunnel` plus `scp`.

## Review Notes
- Azure CLI was not installed in the local environment, so command syntax was verified against the official Microsoft Learn Azure CLI reference rather than local `az --help` output.
- The post uses `Ubuntu2204` for the VM image. This remains a plausible Azure CLI image alias, but image aliases can change over time; future reviews may want to test it in an Azure subscription.
