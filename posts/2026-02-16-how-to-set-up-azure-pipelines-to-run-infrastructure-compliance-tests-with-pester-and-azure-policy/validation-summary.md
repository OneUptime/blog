# Validation Summary: How to Set Up Azure Pipelines to Run Infrastructure Compliance Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure PowerShell task
- Azure CLI
- Azure Resource Manager and Bicep deployments
- Pester 5
- Azure Policy and Az.PolicyInsights
- Az.Resources, Az.Network, and Az.Storage PowerShell modules

## Sources Consulted
- Pester documentation: Discovery and Run - https://pester.dev/docs/usage/discovery-and-run
- Pester documentation: Data driven tests - https://pester.dev/docs/usage/data-driven-tests
- Pester documentation: Configuration - https://pester.dev/docs/usage/configuration
- Pester documentation: New-PesterConfiguration - https://pester.dev/docs/v6/commands/New-PesterConfiguration
- Microsoft Learn: AzurePowerShell@5 task reference - https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/azure-powershell-v5
- Microsoft Learn: az deployment group - https://learn.microsoft.com/cli/azure/deployment/group
- Microsoft Learn: az bicep - https://learn.microsoft.com/cli/azure/bicep
- Microsoft Learn: Deploy ARM templates with Azure CLI - https://learn.microsoft.com/azure/azure-resource-manager/templates/deploy-cli
- Microsoft Learn: Azure Policy overview - https://learn.microsoft.com/azure/governance/policy/overview
- Microsoft Learn: Get Azure Policy compliance data - https://learn.microsoft.com/azure/governance/policy/how-to/get-compliance-data
- Microsoft Learn: Get-AzPolicyState - https://learn.microsoft.com/powershell/module/az.policyinsights/get-azpolicystate
- Microsoft Learn: Get-AzResource - https://learn.microsoft.com/powershell/module/az.resources/get-azresource
- Microsoft Learn: Get-AzNetworkSecurityGroup - https://learn.microsoft.com/powershell/module/az.network/get-aznetworksecuritygroup
- Microsoft Learn: New-AzStorageAccount / storage account properties - https://learn.microsoft.com/powershell/module/az.storage/new-azstorageaccount

## Issues Found
- Pester 5 discovery/run issue: the original tag, NSG, storage, and policy examples generated `It` blocks with `foreach` loops over variables populated in `BeforeAll`. Pester 5 runs `BeforeAll` during the run phase, after discovery, so those dynamic tests would not be discovered correctly. Moved those loops inside `It` blocks and added a short note explaining the Pester 5 behavior.
- Azure Policy timing claim: the post said Azure Policy evaluates resources only after they exist. Azure Policy can also evaluate create and update requests, while compliance state is updated through evaluation cycles. Updated the wording to distinguish enforcement from compliance results.
- NSG rule matching: the original example only checked exact destination ports and `SourceAddressPrefix = '*'`, missing port ranges, wildcard destination ports, plural prefix/range properties, `0.0.0.0/0`, and `Internet`. Updated the sample to handle common internet source and port-range cases.
- Storage TLS test: the original assertion required exactly `TLS1_2` while the text said TLS 1.2 minimum. Updated the assertion to accept `TLS1_2` and `TLS1_3`.
- Azure Policy example: the optional `SubscriptionId` parameter was not used, and an unused `$rgScope` variable was created. Replaced this with a splatted `Get-AzPolicyState` query that includes `SubscriptionId` when provided.
- Pester import/configuration: the pipeline imported Pester without enforcing the installed major version and set both `Run.Path` and `Run.Container`. Updated imports to require Pester 5+ and removed the redundant `Run.Path` when using `New-PesterContainer`.

## Review Notes
No local PowerShell runtime was available in this workspace, so syntax was reviewed manually against official documentation rather than executed with Pester. The pipeline example currently runs only `TagPolicy.Tests.ps1`; future improvements could show invoking all test files or separate critical/warning tag runs, but the existing focused example is technically valid.
