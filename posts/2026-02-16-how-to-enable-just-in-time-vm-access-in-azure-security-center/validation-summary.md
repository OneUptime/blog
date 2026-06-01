# Validation Summary: How to Enable Just-In-Time VM Access in Azure Security Center

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for Servers Plan 2
- Azure Just-in-time VM access
- Azure Virtual Machines
- Network Security Groups
- Azure Firewall
- Azure Bastion
- Azure CLI
- Azure REST API
- Az PowerShell
- Azure RBAC

## Sources Consulted
- Microsoft Learn: Enable just-in-time access - https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-just-in-time-access
- Microsoft Learn: Understand just-in-time VM access - https://learn.microsoft.com/en-us/azure/defender-for-cloud/just-in-time-access-overview
- Microsoft Learn: Jit Network Access Policies - Create Or Update REST API - https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies/create-or-update?view=rest-defenderforcloud-2020-01-01
- Microsoft Learn: Jit Network Access Policies - Initiate REST API - https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies/initiate?view=rest-defenderforcloud-2020-01-01
- Microsoft Learn: Azure CLI `az security pricing` - https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Microsoft Learn: Configure NSG rules for Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Defender for Cloud release notes archive - https://learn.microsoft.com/en-us/azure/defender-for-cloud/release-notes-archive

## Issues Found
- The Defender for Servers CLI example enabled the `VirtualMachines` plan with `--tier Standard` but did not explicitly select Plan 2. Updated the command to include `--subplan P2`.
- The prerequisites said JIT required only an NSG. Updated this to include Azure Firewall support in the same virtual network, matching Microsoft Defender for Cloud documentation.
- The JIT workflow said JIT simply creates deny rules that block all inbound traffic. Updated the explanation to note that Defender for Cloud ensures deny rules exist and that existing rules on the selected ports can take priority.
- The PowerShell request example used `duration` and resource group/location/name parameters with `Start-AzJitNetworkAccessPolicy`. Updated it to use `endTimeUtc`, wrap the VM policy in an array, and call the cmdlet with the JIT policy `-ResourceId`.
- The RBAC guidance said users need Reader and Virtual Machine Contributor. Updated it to describe the documented least-privilege JIT initiate and read permissions, and added `Microsoft.Network/publicIPAddresses/read` to the custom role example.
- The NSG rule naming guidance used the older `SecurityCenter-JITRule` prefix. Updated it to the current `MicrosoftDefenderForCloud-JITRule` prefix and noted that older environments might still show the old name.
- The Bastion integration section implied JIT alone opens the path through Bastion. Updated it to mention the required target VM subnet rule allowing RDP/SSH from the AzureBastionSubnet and recommended scoping source ranges appropriately.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI command validation was performed against official Microsoft Learn CLI documentation instead of local `az --help` output.
