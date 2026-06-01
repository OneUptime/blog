# Validation Summary: Use Azure Policy Guest Configuration to Audit Settings Inside Virtual Machines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Policy
- Azure Machine Configuration / Azure Policy Guest Configuration
- Azure virtual machines
- Azure Arc-enabled servers
- Azure CLI
- Azure PowerShell
- PowerShell Desired State Configuration
- Azure Storage SAS URLs

## Sources Consulted
- Microsoft Learn: Azure Machine Configuration documentation - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/
- Microsoft Learn: Azure Machine Configuration prerequisites - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/overview/02-setup-prerequisites
- Microsoft Learn: How to set up a machine configuration authoring environment - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/develop-custom-package/1-set-up-authoring-environment
- Microsoft Learn: How to create custom machine configuration package artifacts - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/develop-custom-package/2-create-package
- Microsoft Learn: How to publish custom machine configuration package artifacts - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/develop-custom-package/4-publish-package
- Microsoft Learn: How to create custom machine configuration policy definitions - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/create-policy-definition
- Microsoft Learn: Remediation options for machine configuration - https://learn.microsoft.com/en-us/azure/governance/machine-configuration/concepts/remediation-options
- Microsoft Learn: az policy assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: az policy state CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/state
- Microsoft Learn: az guestconfig CLI reference - https://learn.microsoft.com/en-us/cli/azure/guestconfig
- Microsoft Learn: DSC Registry resource reference - https://learn.microsoft.com/en-us/powershell/dsc/reference/resources/windows/registryresource

## Issues Found
- The prerequisites omitted registration of the `Microsoft.GuestConfiguration` resource provider. Added it to the prerequisites and Azure CLI setup commands.
- The prerequisite managed identity example only covered VMs with no existing identity. Added the built-in policy assignment for VMs that already have a user-assigned identity.
- The post said custom Guest Configuration uses Chef InSpec for Linux. Current Microsoft documentation states custom machine configuration packages use PowerShell DSC for both Windows and Linux, so that claim was corrected.
- The Windows authoring setup installed `PSDesiredStateConfiguration` with `-AllowPrerelease`. Microsoft documents stable version `2.0.7` for Windows authoring, so the install command was updated.
- The custom package example used `localhost.mof` directly. Microsoft guidance recommends renaming the compiled MOF to the package name, so a rename step and matching package path were added.
- The package publishing example used `Publish-GuestConfigurationPackage`. Current Microsoft guidance publishes to Azure Blob Storage with Az.Storage cmdlets and creates a SAS URI, so the example was updated.
- The custom policy example omitted the required `PolicyId` parameter and used `-Version` instead of `PolicyVersion`. It was changed to a hashtable matching the documented `New-GuestConfigurationPolicy` parameters.
- The policy publishing example used `Publish-GuestConfigurationPolicy`. Current Microsoft documentation uses `New-AzPolicyDefinition`, so the example was updated.
- The detailed compliance CLI command used the wrong command group, `az vm guest-configuration assignment list`. It was corrected to `az guestconfig guest-configuration-assignment list`.
- The remediation section described only two modes and used `ApplyAndMonitor` as a package `Type`. It was corrected to distinguish package `Type` values (`Audit`, `AuditAndSet`) from assignment modes (`Audit`, `ApplyAndMonitor`, `ApplyAndAutoCorrect`).

## Review Notes
Azure now documents the service as Azure Machine Configuration, formerly Azure Policy Guest Configuration. The post title and terminology still use Guest Configuration, which remains recognizable, but a future editorial pass could update naming throughout for consistency with current Microsoft documentation.
