# Validation Summary: How to Enable Azure Policy and Guest Configuration on Azure Arc-Enabled Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Arc-enabled servers
- Azure Policy
- Azure Machine Configuration / Guest Configuration
- Azure Connected Machine agent
- Azure CLI
- PowerShell DSC
- GuestConfiguration PowerShell module

## Sources Consulted
- Azure Machine Configuration documentation: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/
- Azure Machine Configuration prerequisites: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/overview/02-setup-prerequisites
- Azure Arc Connected Machine agent network requirements: https://learn.microsoft.com/en-us/azure/azure-arc/servers/network-requirements
- Azure Arc-enabled servers identity and authorization: https://learn.microsoft.com/en-us/azure/azure-arc/servers/security-identity-authorization
- Azure Policy built-in definitions for Azure Arc-enabled servers: https://learn.microsoft.com/en-us/azure/azure-arc/servers/policy-reference
- Azure CLI `az policy assignment create` reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Azure CLI `az policy remediation create` reference: https://learn.microsoft.com/en-us/cli/azure/policy/remediation
- Azure CLI `az policy state` reference: https://learn.microsoft.com/en-us/cli/azure/policy/state
- Develop custom Machine Configuration packages: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/develop-custom-package/overview
- Create custom Machine Configuration package artifacts: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/develop-custom-package/2-create-package
- Test Machine Configuration package artifacts: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/develop-custom-package/3-test-package
- Create custom Machine Configuration policy definitions: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/create-policy-definition
- View Machine Configuration compliance reporting: https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/view-compliance
- Azure/azure-policy built-in policy repository: https://github.com/Azure/azure-policy

## Issues Found
- The post incorrectly said Arc-enabled servers require the Guest Configuration VM extension and provided `az connectedmachine extension create` examples for `Microsoft.GuestConfiguration`. Microsoft documentation states the extension is required for Azure VMs, while Arc-enabled servers include Machine Configuration in the Azure Connected Machine agent. Replaced the extension installation section with Arc agent health and `Microsoft.GuestConfiguration` provider registration guidance.
- The auto-deploy policy IDs `331e8ea8-378a-410f-a2e5-ae22f38bb0da` and `385f5831-96d4-41db-9a3c-cd3af78aaae6` were described as targeting Arc servers, but those built-ins deploy the Guest Configuration extension to Azure VMs. Removed those Arc-specific deployment examples and clarified that those policies are for Azure virtual machines.
- The Windows baseline example used `--policy-set-definition` with `72650e9f-97bc-4b2a-ab5f-9781a9fcecbc`, but that ID is a policy definition, not a policy set definition. Changed the command to use `--policy`.
- The custom content section stated that Linux custom content uses InSpec/Chef InSpec. Current Machine Configuration docs describe PowerShell DSC as the custom authoring model for both Windows and Linux, while InSpec can be used by built-in/local validation content. Updated the wording.
- The DSC example imported `PSDscResources` but did not install it. Added `Install-Module -Name PSDscResources -Force`.
- The local package test example used `Test-GuestConfigurationPackage`. Current docs recommend `Get-GuestConfigurationPackageComplianceStatus`; updated the example and best-practice note.
- The `New-GuestConfigurationPolicy` example omitted required `PolicyId` and `PolicyVersion` parameters and used a directory path instead of an output policy JSON path. Added a generated GUID, policy version, and `./policies/deployIfNotExists.json`.
- The remediation example referenced the removed `deploy-gc-ext-linux` assignment. Replaced it with a generic remediation example for a custom Machine Configuration assignment.

## Review Notes
The local environment did not have Azure CLI installed, so CLI syntax was checked against Microsoft Learn CLI references rather than local `az --help` output.
