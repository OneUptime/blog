# Validation Summary: How to Configure Azure Bastion for Secure IPv4 Access to VMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bastion
- Azure Virtual Network (VNet) and `AzureBastionSubnet`
- Azure Network Security Groups (NSGs)
- Azure CLI
- Microsoft Entra ID
- Terraform (`azurerm_bastion_host`)

## Sources Consulted
- Microsoft Learn: Azure Bastion overview - https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: Deploy Bastion using Azure CLI - https://learn.microsoft.com/en-us/azure/bastion/create-host-cli
- Microsoft Learn: Azure CLI `az network bastion` reference - https://learn.microsoft.com/en-us/cli/azure/network/bastion?view=azure-cli-latest
- Microsoft Learn: Configure NSG rules for Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Configure Microsoft Entra ID authentication for Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-entra-id-authentication
- Microsoft Learn: Dissociate a public IP address from an Azure VM - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/remove-public-ip-address-vm
- Microsoft Learn: Connect to a Windows VM using RDP - Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-connect-vm-rdp-windows
- Microsoft Learn: Connect to a Linux VM using SSH - Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-connect-vm-ssh-linux
- HashiCorp Terraform Registry: `azurerm_bastion_host` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/bastion_host

## Issues Found
- The post said Azure Bastion was integrated with Azure Active Directory for authentication. I changed this to Microsoft Entra ID authentication for supported RDP/SSH scenarios because the product name has changed and support is scenario-dependent.
- The prerequisites said the Bastion subnet must not have NSGs or route tables attached initially. I corrected this to match current Microsoft guidance: route tables and delegations should not be used on `AzureBastionSubnet`, while NSGs are supported only if all required Bastion ingress and egress rules are configured.
- The Azure CLI deployment example enabled Standard SKU but did not enable tunneling, even though the post later used `az network bastion ssh` and `az network bastion rdp`. I added `--enable-tunneling true` because native-client commands require tunneling support.
- The native-client section implied the RDP command was generally available without caveat. I clarified that `az network bastion rdp` uses a local Windows client, matching the current Azure Bastion connection guidance.
- The public IP removal example used `--remove publicIpAddress`, which does not match the current documented Azure CLI workflow. I corrected it to `--public-ip-address null`.
- The NSG example contained an invalid Bash line continuation with an inline comment after a backslash. I removed the broken syntax and made the rule explicit with `--direction Inbound` and `--protocol Tcp`.
- The Terraform example created a Standard Bastion host but did not enable tunneling, which would make the later native-client examples incomplete. I added `tunneling_enabled = true` to align the IaC example with the CLI workflow in the post.
- The sentence about removing public IPs from VMs was too absolute. I narrowed it to the management-access case so it is accurate when Bastion is the only management path.

## Review Notes
The post is technically sound after the corrections above. One caveat for future improvement is that `az network bastion` is provided by the Azure CLI Bastion extension, and native-client support depends on the Bastion host being configured with the appropriate feature flags in addition to using a supported SKU.
