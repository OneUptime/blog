# Validation Summary: How to Build Azure Bastion Host with Subnet Requirements in Bicep Templates

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Azure Bastion
- Azure Virtual Network and subnets
- Azure Network Security Groups
- Azure Public IP addresses
- Azure Bicep
- Azure CLI
- Azure Linux virtual machines

## Sources Consulted
- Microsoft Learn: About Azure Bastion configuration settings - https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Microsoft Learn: Configure NSG rules for Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Microsoft.Network/bastionHosts 2023-09-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2023-09-01/bastionhosts
- Microsoft Learn: Choose the right Azure Bastion SKU to meet your needs - https://learn.microsoft.com/en-us/azure/bastion/bastion-sku-comparison
- Microsoft Learn: Configure Bastion for native client connections - https://learn.microsoft.com/en-us/azure/bastion/native-client
- Microsoft Learn: About Azure Bastion IP-based connection - https://learn.microsoft.com/en-us/azure/bastion/connect-ip-address
- Microsoft Learn: About VM connections and features - https://learn.microsoft.com/en-us/azure/bastion/vm-about
- Microsoft Learn: Deploy templates with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli
- Microsoft Learn: Frequently asked questions for Linux VMs in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/faq

## Issues Found
- The post described an NSG on `AzureBastionSubnet` as an unconditional Bastion requirement. Microsoft documents NSGs as supported and required only if associated with the subnet. Updated the wording to say the listed NSG rules are mandatory when an NSG is attached.
- The `AllowSshRdpOutbound` rule used `protocol: 'Tcp'`, while the current Microsoft Bastion NSG table specifies protocol `*` for that outbound rule. Updated the rule to `protocol: '*'`.
- The VM example hard-coded `P@ssw0rd1234!`, which is a poor secret-handling pattern and close to Azure's documented disallowed password examples. Replaced it with a secure Bicep parameter and updated the deployment command to pass a placeholder strong password.
- The scale-unit explanation reversed the documented per-instance concurrency numbers. Updated it to say each instance supports about 20 concurrent RDP or 40 concurrent SSH sessions.
- Simplified the `scaleUnits` expression from a redundant conditional to `scaleUnits: 2`, preserving the same deployed value.

## Review Notes
The Azure CLI command shape matches Microsoft documentation for resource group deployments with `--template-file` and inline parameters. Local `az` and `bicep` binaries were not installed in this workspace, so syntax validation was performed by review against Microsoft Bicep resource references rather than a local compile.
