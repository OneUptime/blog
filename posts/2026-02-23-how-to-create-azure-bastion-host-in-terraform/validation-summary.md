# Validation Summary: How to Create Azure Bastion Host in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Bastion
- Azure Virtual Network
- Azure Network Security Groups
- Azure Monitor diagnostic settings
- Azure Linux Virtual Machines

## Sources Consulted
- Microsoft Learn: What is Azure Bastion? https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: About Azure Bastion configuration settings https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Microsoft Learn: Configure NSG rules for Azure Bastion https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Azure Bastion FAQ https://learn.microsoft.com/en-us/azure/bastion/bastion-faq
- Microsoft Learn: Configure Bastion session recording https://learn.microsoft.com/en-us/azure/bastion/session-recording
- HashiCorp Terraform Provider AzureRM v3.80.0: azurerm_bastion_host https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/bastion_host.html.markdown
- HashiCorp Terraform Registry: azurerm_bastion_host https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/bastion_host

## Issues Found
- The SKU section said Azure Bastion has three tiers and described Basic as having manual scaling. Microsoft currently documents four SKUs: Developer, Basic, Standard, and Premium. Basic has fixed capacity, while host scaling is a Standard/Premium capability. Updated the SKU list accordingly.
- The introduction implied native client access without qualifying that it depends on SKU. Microsoft documents native client connections for Standard and Premium SKUs. Added "depending on the SKU" to avoid implying the feature is available everywhere.
- The AzureBastionSubnet NSG example omitted required rules for Bastion host internal communication on ports 8080 and 5701 and HTTP outbound on port 80. Microsoft documents these as required when an NSG is applied to AzureBastionSubnet. Added the missing inbound and outbound rules and aligned the SSH/RDP outbound rule with the documented combined rule.

## Review Notes
- The Terraform examples use AzureRM provider `~> 3.80`, which supports the Basic and Standard Bastion fields shown in the code. Premium-specific Terraform arguments, such as session recording or private-only deployment, require a newer AzureRM provider version if readers extend the examples later.
