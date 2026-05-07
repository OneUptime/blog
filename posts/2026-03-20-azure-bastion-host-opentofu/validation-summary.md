# Validation Summary: How to Create Azure Bastion Host with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Bastion
- Azure Virtual Network
- Azure Network Security Groups (NSGs)
- Azure CLI
- Azure Resource Manager (`azurerm`) provider
- Linux virtual machines on Azure

## Sources Consulted
- Azure Bastion overview: https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Azure Bastion configuration settings: https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Configure NSG rules for Azure Bastion: https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Azure CLI `az network bastion` reference: https://learn.microsoft.com/en-us/cli/azure/network/bastion?view=azure-cli-latest
- Configure Microsoft Entra ID authentication for Azure Bastion: https://learn.microsoft.com/en-us/azure/bastion/bastion-entra-id-authentication
- AzureRM provider `azurerm_bastion_host` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/bastion_host
- AzureRM provider source docs for `azurerm_bastion_host`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/bastion_host.html.markdown

## Issues Found
- The introduction and description implied Bastion removes the need to open RDP/SSH ports in NSGs entirely. That is inaccurate because target VM subnets still need private access on the management ports if an NSG is attached. I changed the wording to say Bastion avoids exposing those ports to the public internet.
- The introduction claimed Bastion itself provides audit logging and MFA enforcement through Azure AD. That overstates the service. I corrected this to reflect current Microsoft documentation: Bastion brokers the session, Microsoft Entra ID authentication can enforce MFA and Conditional Access, and session recording is a Premium SKU capability.
- The NSG example for `AzureBastionSubnet` was incomplete. Azure requires additional inbound and outbound rules for Bastion host communication, AzureCloud egress, and HTTP egress. I added the missing rules and a note about the target VM subnet NSG requirement.
- The post treated native client support as a Standard-only capability. Current Azure documentation treats Standard as the minimum required SKU, while Premium also supports those features. I updated the SKU wording accordingly.
- The post used `az network bastion` commands without listing Azure CLI as a prerequisite. I added Azure CLI 2.62.0+ because the current CLI reference documents these commands through the Bastion extension for that CLI version or later.
- The RDP command example was ambiguous after a Linux VM example. I clarified that the RDP example applies to a Windows VM.

## Review Notes
- The Bastion subnet `/26` guidance is correct for current deployments. Microsoft notes that older `/27` deployments created before November 2, 2021 can still function, but new guidance is `/26` or larger.
- The post uses `sku = "Standard"` in code, which is valid and appropriate because the example enables native client-related features.
