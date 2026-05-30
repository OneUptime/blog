# Validation Summary: How to Write Pester Tests for Azure PowerShell Infrastructure Automation Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pester v5
- PowerShell
- Azure PowerShell Az modules
- Azure App Service
- Azure Resource Groups
- GitHub Actions

## Sources Consulted
- Pester installation documentation: https://pester.dev/docs/introduction/installation
- Pester Invoke-Pester command reference: https://pester.dev/docs/commands/Invoke-Pester
- Pester tags documentation: https://pester.dev/docs/usage/tags
- Pester mocking documentation: https://pester.dev/docs/usage/mocking
- Pester Should command reference: https://pester.dev/docs/commands/Should
- Pester configuration documentation: https://pester.dev/docs/usage/configuration
- Microsoft Learn New-AzResourceGroup documentation: https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresourcegroup
- Microsoft Learn New-AzAppServicePlan documentation: https://learn.microsoft.com/en-us/powershell/module/az.websites/new-azappserviceplan
- Microsoft Learn New-AzWebApp documentation: https://learn.microsoft.com/en-us/powershell/module/az.websites/new-azwebapp
- Microsoft Learn Set-AzWebApp documentation: https://learn.microsoft.com/en-us/powershell/module/az.websites/set-azwebapp

## Issues Found
- The introduction said Pester is built into Windows and available wherever PowerShell Core runs. Updated this to clarify that Windows 10 / Windows Server 2016 and later ship with older Pester 3.4.0, while current Pester versions are installable across supported PowerShell platforms.
- The installation text called Pester v5 the latest major version. Updated wording to "current stable version" because Pester v6 exists as a preview documentation stream, while v5 is the stable version used by the examples.
- The sample deployment script was dot-sourced by the unit tests, but its main deployment logic would still run immediately and call Azure before mocks were configured. Wrapped the main execution block so dot-sourcing imports functions without deploying resources.
- The integration tests asserted that HTTPS was enforced, but the deployment script did not set `HttpsOnly`. Updated `Set-AzWebApp` to pass `-HttpsOnly $true` and updated the unit-test assertion to verify that parameter.
- The integration tests used `Environment = "test"`, but the script's `ValidateSet` only allowed `dev`, `staging`, and `prod`. Changed the integration-test environment to `dev` so the example can pass parameter validation.
- The Pester v5 examples used deprecated simple command parameters such as `-Output`, `-Tag`, and `-ExcludeTag`. Replaced those command examples with `New-PesterConfiguration`, `Output.Verbosity`, `Filter.Tag`, and `Filter.ExcludeTag`.

## Review Notes
The Azure examples remain intentionally simplified. In production, app service plan SKU selection, Linux runtime configuration, storage-account naming constraints, and cleanup job completion should be handled more defensively.
