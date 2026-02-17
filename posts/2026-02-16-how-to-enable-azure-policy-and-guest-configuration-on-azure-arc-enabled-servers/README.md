# How to Enable Azure Policy and Guest Configuration on Azure Arc-Enabled Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, Azure Policy, Guest Configuration, Compliance, Governance, Hybrid Cloud

Description: Learn how to apply Azure Policy and Guest Configuration to Azure Arc-enabled servers for consistent compliance and governance across hybrid environments.

---

One of the biggest reasons to connect on-premises servers to Azure Arc is the ability to apply Azure Policy. With Policy, you can audit and enforce configuration standards on your Arc-enabled servers the same way you do on native Azure VMs. And with Guest Configuration (now called Machine Configuration), you can go beyond Azure resource properties and audit settings inside the operating system itself - things like installed software, registry keys, file contents, and service states.

In this guide, I will show you how to set up Azure Policy and Guest Configuration on your Arc-enabled servers, from the prerequisites through policy assignment and compliance reporting.

## Understanding the Two Layers

It helps to think of policy for Arc servers in two layers:

**Layer 1: Azure Resource Policy** - These policies operate on the Azure resource representation of your Arc server. They can check things like tags, location, resource group membership, and installed extensions. These work automatically once the server is connected to Arc.

**Layer 2: Guest Configuration Policy** - These policies look inside the operating system. They check things like whether a specific Windows feature is installed, whether a Linux package is present, whether a particular configuration file has the right contents. These require the Guest Configuration extension to be installed on the server.

## Prerequisites for Guest Configuration

Before Guest Configuration policies will work, you need:

1. **The Arc server must be connected and healthy** - Check with `azcmagent show` on the server
2. **The Guest Configuration extension must be installed** - This is a VM extension that runs inside the OS
3. **A system-assigned managed identity** - Arc servers get this automatically during onboarding
4. **Network connectivity** - The server needs to reach `*.guestconfiguration.azure.com` on port 443

## Installing the Guest Configuration Extension

The Guest Configuration extension needs to be installed on each Arc server. You can do this manually or at scale using Azure Policy itself.

### Manual Installation via Azure CLI

```bash
# Install the Guest Configuration extension on a Linux Arc server
az connectedmachine extension create \
    --machine-name "my-linux-server" \
    --resource-group "arc-servers-rg" \
    --name "AzurePolicyforLinux" \
    --publisher "Microsoft.GuestConfiguration" \
    --type "ConfigurationForLinux" \
    --location "eastus"

# Install on a Windows Arc server
az connectedmachine extension create \
    --machine-name "my-windows-server" \
    --resource-group "arc-servers-rg" \
    --name "AzurePolicyforWindows" \
    --publisher "Microsoft.GuestConfiguration" \
    --type "ConfigurationforWindows" \
    --location "eastus"
```

### Automatic Installation via Policy

The better approach for scale is to use a built-in policy that automatically deploys the Guest Configuration extension to any Arc server that does not have it:

```bash
# Assign the built-in policy to auto-deploy Guest Configuration extension
# This policy targets Linux Arc servers
az policy assignment create \
    --name "deploy-gc-ext-linux" \
    --display-name "Deploy Guest Configuration extension to Linux Arc servers" \
    --policy "331e8ea8-378a-410f-a2e5-ae22f38bb0da" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --location "eastus" \
    --role "Contributor"

# This policy targets Windows Arc servers
az policy assignment create \
    --name "deploy-gc-ext-windows" \
    --display-name "Deploy Guest Configuration extension to Windows Arc servers" \
    --policy "385f5831-96d4-41db-9a3c-cd3af78aaae6" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --location "eastus" \
    --role "Contributor"
```

These policies use a DeployIfNotExists effect, meaning they will automatically install the extension on any Arc server that does not already have it. The managed identity assigned to the policy needs Contributor permissions to deploy extensions.

## Assigning Built-in Guest Configuration Policies

Microsoft provides a large library of built-in Guest Configuration policies. Here are some commonly used ones.

### Auditing Password Policies on Windows

```bash
# Audit that Windows machines have password complexity enabled
az policy assignment create \
    --name "audit-password-complexity" \
    --display-name "Audit password complexity on Windows servers" \
    --policy "bf16e0bb-31e1-4646-8202-60a235cc7e74" \
    --scope "/subscriptions/your-subscription-id"
```

### Auditing SSH Configuration on Linux

```bash
# Audit that Linux machines have secure SSH configuration
az policy assignment create \
    --name "audit-ssh-config" \
    --display-name "Audit SSH configuration on Linux servers" \
    --policy "a8f3e6a6-dcd2-434c-b0f7-6f309ce913b4" \
    --scope "/subscriptions/your-subscription-id"
```

### Using Policy Initiatives (Policy Sets)

For a comprehensive compliance baseline, use a policy initiative that bundles multiple related policies together:

```bash
# Assign the Windows Security Baseline initiative
az policy assignment create \
    --name "windows-security-baseline" \
    --display-name "Windows Server Security Baseline" \
    --policy-set-definition "72650e9f-97bc-4b2a-ab5f-9781a9fcecbc" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --location "eastus"
```

## Creating Custom Guest Configuration Policies

When the built-in policies do not cover your specific requirements, you can create custom Guest Configuration policies. This is done using PowerShell and the GuestConfiguration module.

### Step 1: Author the Configuration

For Windows, you use PowerShell DSC (Desired State Configuration). For Linux, you use InSpec or Chef InSpec.

Here is an example of a custom configuration that checks if a specific Windows service is running:

```powershell
# Import the required module
Install-Module -Name GuestConfiguration -Force

# Define the DSC configuration
Configuration CheckCriticalServices {
    Import-DscResource -ModuleName PSDscResources

    Node "localhost" {
        # Verify the Windows Defender service is running
        Service WindowsDefender {
            Name   = "WinDefend"
            State  = "Running"
            Ensure = "Present"
        }

        # Verify the Windows Update service is running
        Service WindowsUpdate {
            Name   = "wuauserv"
            State  = "Running"
            Ensure = "Present"
        }
    }
}

# Compile the configuration into a MOF file
CheckCriticalServices -OutputPath "./CheckCriticalServices"
```

### Step 2: Package the Configuration

```powershell
# Create the Guest Configuration package
New-GuestConfigurationPackage `
    -Name "CheckCriticalServices" `
    -Configuration "./CheckCriticalServices/localhost.mof" `
    -Type "AuditAndSet" `
    -Force

# Test the package locally to make sure it works
Test-GuestConfigurationPackage `
    -Path "./CheckCriticalServices/CheckCriticalServices.zip"
```

### Step 3: Publish and Create the Policy

```powershell
# Upload the package to a storage account
$storageAccount = Get-AzStorageAccount `
    -ResourceGroupName "policy-storage-rg" `
    -Name "policystorage"

$container = Get-AzStorageContainer `
    -Name "guestconfiguration" `
    -Context $storageAccount.Context

# Upload the package
Set-AzStorageBlobContent `
    -Container "guestconfiguration" `
    -File "./CheckCriticalServices/CheckCriticalServices.zip" `
    -Blob "CheckCriticalServices.zip" `
    -Context $storageAccount.Context

# Generate a SAS URI for the package
$sasUri = New-AzStorageBlobSASToken `
    -Container "guestconfiguration" `
    -Blob "CheckCriticalServices.zip" `
    -Permission "r" `
    -ExpiryTime (Get-Date).AddYears(3) `
    -Context $storageAccount.Context `
    -FullUri

# Create the policy definition
New-GuestConfigurationPolicy `
    -ContentUri $sasUri `
    -DisplayName "Audit critical Windows services are running" `
    -Description "Checks that Windows Defender and Windows Update services are running" `
    -Path "./policies" `
    -Platform "Windows" `
    -Mode "ApplyAndAutoCorrect"

# Publish the policy to Azure
Publish-GuestConfigurationPolicy -Path "./policies"
```

## Viewing Compliance Results

Once policies are assigned and the Guest Configuration extension has had time to evaluate (usually within 15-30 minutes), you can view compliance results.

### In the Azure Portal

Navigate to Azure Policy and check the Compliance blade. You will see each policy assignment with its compliance percentage. Click on a non-compliant policy to see which specific servers are failing and why.

For Guest Configuration policies, you can drill down even further to see the specific configuration items that failed on each server.

### Using Azure CLI

```bash
# Get compliance summary for a specific policy assignment
az policy state summarize \
    --subscription "your-subscription-id" \
    --filter "policyAssignmentName eq 'audit-password-complexity'"

# Get detailed non-compliant resources
az policy state list \
    --subscription "your-subscription-id" \
    --filter "complianceState eq 'NonCompliant' and policyAssignmentName eq 'audit-password-complexity'" \
    --output table
```

## Remediation for DeployIfNotExists Policies

Some policies can automatically remediate non-compliant resources. For example, the policy that deploys the Guest Configuration extension uses a DeployIfNotExists effect. To trigger remediation for existing non-compliant resources:

```bash
# Create a remediation task for a policy assignment
az policy remediation create \
    --name "remediate-gc-extension" \
    --policy-assignment "deploy-gc-ext-linux" \
    --subscription "your-subscription-id"
```

## Best Practices

**Start with audit-only policies.** Before enforcing anything, run policies in audit mode to understand your current compliance posture. This prevents unexpected disruptions.

**Use initiatives for related policies.** Group related policies into initiatives for easier management and compliance reporting.

**Monitor remediation tasks.** When using DeployIfNotExists policies with auto-remediation, monitor the remediation tasks to make sure they complete successfully.

**Keep Guest Configuration packages updated.** If your compliance requirements change, update your custom configuration packages and republish the policies.

**Test custom configurations locally first.** Always use `Test-GuestConfigurationPackage` before publishing to catch issues early.

## Summary

Azure Policy and Guest Configuration bring consistent governance to your hybrid infrastructure through Azure Arc. By combining resource-level policies with in-guest configuration auditing, you can enforce the same compliance standards on your on-premises servers that you apply to your Azure VMs. Start with the built-in policies to establish a baseline, then create custom Guest Configuration policies for your organization-specific requirements.
