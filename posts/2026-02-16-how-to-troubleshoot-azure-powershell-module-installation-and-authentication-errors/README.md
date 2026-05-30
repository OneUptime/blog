# How to Troubleshoot Azure PowerShell Module Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PowerShell, Troubleshooting, Authentication, Az Module, DevOps

Description: Practical solutions for common Azure PowerShell module installation failures and authentication errors including version conflicts and certificate issues.

---

Azure PowerShell is one of the primary tools for managing Azure resources, but getting it installed and authenticated can be surprisingly frustrating. Between module version conflicts, gallery connectivity issues, and authentication token problems, there are plenty of ways things can go wrong. This post covers the most common issues and how to fix them.

## Installation Errors

### "PackageManagement module is not installed"

If you are running an older version of Windows or PowerShell, the package management infrastructure might not be set up. You need the NuGet provider and a current version of PowerShellGet before you can install the Az module.

```powershell
# Install the NuGet package provider (required for module installation)

Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force

# Update PowerShellGet to the latest version
Install-Module -Name PowerShellGet -Force -AllowClobber

# Restart your PowerShell session after updating PowerShellGet
# Then install the Az module
Install-Module -Name Az -Repository PSGallery -Force -AllowClobber
```

The `-AllowClobber` flag is important because it allows installation even when the module exports commands with the same names as commands from another module. Without it, you may get conflicts.

### TLS 1.2 Errors When Connecting to PSGallery

The PowerShell Gallery requires TLS 1.2 or higher. Older Windows systems may default to TLS 1.0 or 1.1, which causes connection failures with errors like "Unable to resolve package source" or "No match was found for the specified search criteria."

```powershell
# Force TLS 1.2 for the current session
[Net.ServicePointManager]::SecurityProtocol =
    [Net.ServicePointManager]::SecurityProtocol -bor
    [Net.SecurityProtocolType]::Tls12

# Make this permanent by adding it to your PowerShell profile
Add-Content -Path $PROFILE -Value '[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12'

# Now try the installation again
Install-Module -Name Az -Repository PSGallery -Force -AllowClobber
```

### Conflicts Between AzureRM and Az Modules

The older AzureRM module and the current Az module cannot coexist in the same Windows PowerShell 5.1 environment. If both are installed for the same PowerShell version, you will see errors about conflicting assemblies or duplicate commands.

```powershell
# Check if AzureRM is installed
Get-Module -Name AzureRM -ListAvailable

# If it is, uninstall it completely
Uninstall-Module -Name AzureRM -AllVersions -Force

# If the above fails, you may need to remove it manually
# Find where it is installed
(Get-Module -Name AzureRM -ListAvailable).ModuleBase

# Remove the directory manually if Uninstall-Module does not work
# Then install Az fresh
Install-Module -Name Az -Repository PSGallery -Force -AllowClobber
```

If you cannot remove AzureRM for some reason (legacy scripts depend on it), keep AzureRM in Windows PowerShell 5.1 and install Az in PowerShell 7.2 or later, or configure the `Enable-AzureRmAlias` command while you migrate scripts. But honestly, migrating away from AzureRM is the right long-term fix.

### "Module Az is already installed" but Commands Do Not Work

This usually means you have a corrupted installation or mismatched sub-module versions. The Az module is actually a collection of sub-modules (Az.Compute, Az.Network, Az.Storage, etc.), and they need to be at compatible versions.

```powershell
# Remove all Az modules
Get-Module -Name Az* -ListAvailable | Uninstall-Module -Force -ErrorAction SilentlyContinue

# Clean up any leftover module files
$modulePaths = $env:PSModulePath -split [IO.Path]::PathSeparator
foreach ($path in $modulePaths) {
    # List Az module directories that might need manual removal
    Get-ChildItem -Path $path -Directory -Filter "Az*" -ErrorAction SilentlyContinue
}

# Fresh install
Install-Module -Name Az -Repository PSGallery -Force -AllowClobber
```

### Proxy and Firewall Issues

Corporate networks often block access to the PowerShell Gallery or use SSL inspection proxies that cause certificate errors.

```powershell
# Configure proxy settings for PowerShell
$proxy = New-Object System.Net.WebProxy("http://your-proxy:8080", $true)
$proxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials
[System.Net.WebRequest]::DefaultWebProxy = $proxy

# If your proxy uses SSL inspection, you may also need to trust its certificate
# or bypass certificate validation (not recommended for production)

# Test connectivity to PSGallery
Find-Module -Name Az -Repository PSGallery
```

If you cannot get through the proxy, consider downloading the Az module on a machine with internet access using `Save-Module`, then copying it to your target machine manually.

```powershell
# On a machine with internet access
Save-Module -Name Az -Path C:\AzModules -Repository PSGallery

# Copy C:\AzModules to the target machine, then import
Copy-Item -Path C:\AzModules\Az* -Destination "C:\Program Files\WindowsPowerShell\Modules" -Recurse
```

## Authentication Errors

### "No account found in the context"

This means you have not authenticated yet, or your authentication context expired.

```powershell
# Connect to Azure interactively
Connect-AzAccount

# If you need to connect to a specific tenant
Connect-AzAccount -TenantId "your-tenant-id"

# If you need a specific subscription
Connect-AzAccount -SubscriptionId "your-subscription-id"

# Verify your context
Get-AzContext
```

### "AADSTS50076: MFA Required" Errors

When your Azure AD tenant requires multi-factor authentication, the default authentication flow might not handle it correctly, especially in non-interactive scenarios.

```powershell
# Use device code authentication which works well with MFA
Connect-AzAccount -UseDeviceAuthentication

# This will give you a URL and a code
# Open the URL in a browser, enter the code, and complete MFA there
```

For automation scenarios where MFA cannot be used interactively, create a service principal and authenticate with a certificate or client secret.

```powershell
# Authenticate with a service principal and client secret
$credential = New-Object System.Management.Automation.PSCredential(
    "your-app-id",
    (ConvertTo-SecureString "your-client-secret" -AsPlainText -Force)
)
Connect-AzAccount -ServicePrincipal -Credential $credential -TenantId "your-tenant-id"

# Or authenticate with a certificate (more secure)
Connect-AzAccount -ServicePrincipal `
    -ApplicationId "your-app-id" `
    -CertificateThumbprint "your-cert-thumbprint" `
    -TenantId "your-tenant-id"
```

### Token Expiration and Refresh Failures

Azure PowerShell caches authentication tokens. Sometimes these tokens expire or become corrupted, leading to errors like "Token has expired" or "Refresh token has been revoked."

```powershell
# Clear all cached account data
Clear-AzContext -Force

# Remove any remaining saved Azure profile data
$azureProfilePath = Join-Path $HOME ".Azure"
if (Test-Path $azureProfilePath) {
    Remove-Item $azureProfilePath -Recurse -Force
}

# Re-authenticate
Connect-AzAccount
```

### "The subscription does not exist" or Wrong Subscription

If you have access to multiple subscriptions, PowerShell might default to the wrong one.

```powershell
# List all subscriptions you have access to
Get-AzSubscription

# Set the active subscription
Set-AzContext -SubscriptionId "correct-subscription-id"

# Verify the change
Get-AzContext
```

### Authentication Errors in CI/CD Pipelines

Azure DevOps and GitHub Actions use service principals for authentication. Common issues include expired secrets, incorrect tenant IDs, and missing role assignments.

```powershell
# In an Azure DevOps pipeline, use the AzurePowerShell task
# which handles authentication automatically via the service connection

# For GitHub Actions, authenticate using OIDC (recommended)
# or set these environment variables in your workflow:
# AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID

# Debug authentication issues by checking the context
$context = Get-AzContext
Write-Output "Account: $($context.Account)"
Write-Output "Subscription: $($context.Subscription.Name)"
Write-Output "Tenant: $($context.Tenant.Id)"
```

## Module Version Debugging

When commands behave unexpectedly, check which module versions are loaded.

```powershell
# Show all loaded Az modules and their versions
Get-Module -Name Az* | Format-Table Name, Version, ModuleBase

# Show the specific version of a sub-module
Get-Module -Name Az.Compute -ListAvailable

# Check for multiple versions installed side by side
Get-Module -Name Az.Compute -ListAvailable | Format-Table Version, ModuleBase
```

If you have multiple versions installed, PowerShell loads the newest by default. You can force a specific version with:

```powershell
# Import a specific version
Import-Module Az.Compute -RequiredVersion 5.0.0
```

## Performance Tip: Import Only What You Need

The full Az module imports all sub-modules, which can be slow. If you only need to work with specific resource types, import just those sub-modules.

```powershell
# Instead of importing everything
Import-Module Az

# Import only what you need for faster startup
Import-Module Az.Accounts  # Always required for authentication
Import-Module Az.Compute   # Only if you are working with VMs
Import-Module Az.Storage   # Only if you are working with storage
```

This can cut your script startup time significantly, especially in CI/CD pipelines where every second counts.

## When All Else Fails

If you are stuck with persistent installation or authentication issues, try a completely clean slate.

```powershell
# Remove all Az modules
Get-Module -Name Az* -ListAvailable | Uninstall-Module -Force -ErrorAction SilentlyContinue

# Clear all Azure contexts and token caches
Remove-Item -Path (Join-Path $env:USERPROFILE ".Azure") -Recurse -Force -ErrorAction SilentlyContinue

# Restart PowerShell (or your machine for good measure)
# Then reinstall from scratch
Install-Module -Name Az -Repository PSGallery -Force -AllowClobber

# Connect fresh
Connect-AzAccount
```

The Azure PowerShell team regularly releases updates that fix bugs and add features. Keeping your module up to date with `Update-Module -Name Az` resolves many issues. If you hit a bug, check the GitHub issues page for the Azure PowerShell repository - there is a good chance someone else has already reported it and a fix is in progress.
