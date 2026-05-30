# Validation Summary: How to Troubleshoot Azure PowerShell Module Installation

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure PowerShell Az module
- PowerShellGet and PackageManagement
- PowerShell Gallery
- AzureRM to Az migration
- Microsoft Entra ID authentication
- Azure DevOps and GitHub Actions authentication

## Sources Consulted
- Microsoft Learn: Install Azure PowerShell with PowerShellGet - https://learn.microsoft.com/en-us/powershell/azure/install-az-ps
- Microsoft Learn: Troubleshooting the Az PowerShell module - https://learn.microsoft.com/en-us/powershell/azure/troubleshooting
- Microsoft Learn: Install a package manager for PowerShell - https://learn.microsoft.com/en-us/powershell/gallery/powershellget/install-powershellget
- Microsoft Learn: Connect-AzAccount reference - https://learn.microsoft.com/en-us/powershell/module/az.accounts/connect-azaccount
- Microsoft Learn: Azure contexts and sign-in credentials - https://learn.microsoft.com/en-us/powershell/azure/context-persistence
- Microsoft Learn: Clear-AzContext reference - https://learn.microsoft.com/en-us/powershell/module/az.accounts/clear-azcontext
- Microsoft Learn: Get-AzSubscription reference - https://learn.microsoft.com/en-us/powershell/module/az.accounts/get-azsubscription
- Microsoft Learn: Set-AzContext reference - https://learn.microsoft.com/en-us/powershell/module/az.accounts/set-azcontext
- Microsoft Learn: Authenticate to Azure from GitHub Actions by OpenID Connect - https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- Microsoft Learn: AzurePowerShell task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-powershell-v5

## Issues Found
- The first Az installation example omitted `-AllowClobber` even though the surrounding explanation recommends it and Microsoft examples include it. Added `-AllowClobber`.
- The explanation of `-AllowClobber` said it overwrites files from an old version. Corrected it to explain that the switch allows commands with duplicate names to be installed.
- The TLS guidance said PowerShell Gallery requires TLS 1.2, but current guidance is TLS 1.2 or higher. Updated the wording and changed the snippet to OR TLS 1.2 into the existing `SecurityProtocol` value instead of replacing the whole setting.
- The AzureRM/Az coexistence section was too broad. Updated it to match Microsoft guidance: they are unsupported together in the same Windows PowerShell 5.1 environment, while AzureRM in Windows PowerShell 5.1 and Az in PowerShell 7.2 or later is a supported coexistence path.
- The module cleanup snippet split `PSModulePath` on `;`, which is Windows-specific. Changed it to use `[IO.Path]::PathSeparator`.
- The token cleanup snippet referenced specific legacy/cache file names. Replaced that with documented context cleanup using `Clear-AzContext` plus removal of the `.Azure` profile directory.

## Review Notes
The post remains technically relevant and broadly accurate after the corrections. Future improvements could add current PowerShell 7 guidance more prominently and mention that GitHub Actions OIDC requires the Azure Login action with `enable-AzPSSession: true` before Azure PowerShell steps.
