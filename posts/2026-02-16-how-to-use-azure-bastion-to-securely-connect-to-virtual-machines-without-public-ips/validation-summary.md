# Validation Summary: Use Azure Bastion to Securely Connect to Virtual Machines Without Public IPs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bastion
- Azure Virtual Machines
- Azure Virtual Network and subnets
- Azure Network Security Groups
- Azure CLI
- SSH
- RDP
- Microsoft Entra ID

## Sources Consulted
- Microsoft Learn: What is Azure Bastion? https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Microsoft Learn: Choose the right Azure Bastion SKU to meet your needs https://learn.microsoft.com/en-us/azure/bastion/bastion-sku-comparison
- Microsoft Learn: About Azure Bastion configuration settings https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Microsoft Learn: Deploy Bastion by using Azure CLI https://learn.microsoft.com/en-us/azure/bastion/create-host-cli
- Microsoft Learn: Azure CLI `az network bastion` reference https://learn.microsoft.com/en-us/cli/azure/network/bastion
- Microsoft Learn: Connect to a VM using Bastion - Linux native client https://learn.microsoft.com/en-us/azure/bastion/connect-vm-native-client-linux
- Microsoft Learn: Connect to a VM using Bastion - Windows native client https://learn.microsoft.com/en-us/azure/bastion/connect-vm-native-client-windows
- Microsoft Learn: File transfer using a native client https://learn.microsoft.com/en-us/azure/bastion/vm-upload-download-native
- Microsoft Learn: Create a shareable link for Bastion https://learn.microsoft.com/en-us/azure/bastion/shareable-link
- Microsoft Learn: Configure NSG rules for Azure Bastion https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Azure Bastion FAQ https://learn.microsoft.com/en-us/azure/bastion/bastion-faq

## Issues Found
- The post said Azure Bastion has three SKUs and listed Developer as preview. Current documentation lists four SKUs: Developer, Basic, Standard, and Premium. I added Premium, removed the preview label, and clarified Developer's dev/test scope.
- The Basic and Standard SKU concurrency descriptions were inaccurate. I replaced the fixed 25/50-connection statements with current instance-based capacity language and noted Standard host scaling from 2 to 50 instances.
- The post implied no management-port NSG rules are needed at all. Azure Bastion removes internet-sourced management access, but target VM subnets may still need private inbound SSH/RDP rules from AzureBastionSubnet. I changed the wording to "no internet-sourced NSG rules."
- The post said Bastion authenticates against Azure AD. Bastion access is controlled by Azure RBAC, while VM sign-in uses the VM's configured authentication method, including Microsoft Entra ID where supported. I corrected this explanation and updated Azure AD terminology to Microsoft Entra ID.
- The CLI example used `az ssh vm`, which is not the documented Bastion native-client command. I replaced it with `az network bastion ssh` and included the required Bastion name, target VM resource ID, authentication type, username, and SSH key path.
- The Bastion deployment command created a Standard host but did not enable features used later in the post. I added `--enable-tunneling true`, `--file-copy true`, and `--shareable-link true`.
- The file transfer section incorrectly said file upload/download is available through the browser session. Microsoft documents file transfer as a native-client feature and says portal file upload/download is not supported. I corrected the section to use native-client tunnel/SCP.
- The shareable-link instructions mentioned an expiration time and described temporary access. Current Microsoft documentation describes links that remain active until deleted or until the target resource is unavailable. I removed the expiration step and clarified link behavior.
- The cost section included hard-coded approximate hourly and monthly prices, which are time-sensitive and can vary by region, SKU, and instance count. I replaced the fixed numbers with a recommendation to check the Azure Bastion pricing page for current rates.

## Review Notes
The examples use placeholder resource group, VNet, VM, subscription, and IP configuration names. Those are appropriate for a tutorial but must be adjusted for a real environment. The `ipconfig1` value in the public-IP removal example is a common default but may differ on existing NICs.
