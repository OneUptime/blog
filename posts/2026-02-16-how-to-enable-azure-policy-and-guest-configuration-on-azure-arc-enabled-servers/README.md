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

**Layer 2: Guest Configuration Policy** - These policies look inside the operating system. They check things like whether a specific Windows feature is installed, whether a Linux package is present, whether a particular configuration file has the right contents. On Arc-enabled servers, this capability is provided by the Azure Connected Machine agent.

## Prerequisites for Guest Configuration

Before Guest Configuration policies will work, you need:

1. **The Arc server must be connected and healthy** - Check with `azcmagent show` on the server
2. **The Microsoft.GuestConfiguration resource provider must be registered** - This is required before Machine Configuration can manage assignments
3. **A system-assigned managed identity** - Arc servers get this automatically during onboarding
4. **Network connectivity** - The server needs outbound HTTPS connectivity to the Azure Arc endpoints, including `*.guestconfiguration.azure.com`

## Enabling Machine Configuration

For Arc-enabled servers, you do not install the Azure VM Guest Configuration extension. The Machine Configuration agent is included in the Azure Connected Machine agent. Make sure your Arc agent is healthy and keep it current, especially if you plan to use packages that apply configurations.

### Check the Arc Agent

```bash
# Run on the Arc-enabled server
azcmagent show
```

### Register the Resource Provider

You can register the Microsoft.GuestConfiguration provider with Azure CLI:

```bash
az provider register --namespace Microsoft.GuestConfiguration
```

After that, any Arc-enabled servers in scope of Machine Configuration policy assignments are automatically included. The built-in policies that deploy the Guest Configuration extension are for Azure virtual machines, not Arc-enabled servers.

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

For a comprehensive compliance baseline, use policy initiatives that bundle multiple related policies together. You can also assign a built-in baseline policy directly:

```bash
# Assign the Windows compute security baseline policy
az policy assignment create \
    --name "windows-security-baseline" \
    --display-name "Windows Server Security Baseline" \
    --policy "72650e9f-97bc-4b2a-ab5f-9781a9fcecbc" \
    --scope "/subscriptions/your-subscription-id"
```

## Creating Custom Guest Configuration Policies

When the built-in policies do not cover your specific requirements, you can create custom Guest Configuration policies. This is done using PowerShell and the GuestConfiguration module.

### Step 1: Author the Configuration

For both Windows and Linux custom content, Machine Configuration uses PowerShell DSC (Desired State Configuration). Built-in Linux content can also use local validation tools such as Chef InSpec, but custom packages are authored with DSC.

Here is an example of a custom configuration that checks if a specific Windows service is running:

```powershell
# Install the required modules
Install-Module -Name GuestConfiguration -Force
Install-Module -Name PSDscResources -Force

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
Get-GuestConfigurationPackageComplianceStatus `
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
    -PolicyId (New-Guid).Guid `
    -ContentUri $sasUri `
    -DisplayName "Audit critical Windows services are running" `
    -Description "Checks that Windows Defender and Windows Update services are running" `
    -Path "./policies/deployIfNotExists.json" `
    -Platform "Windows" `
    -PolicyVersion "1.0.0" `
    -Mode "ApplyAndAutoCorrect"

# Publish the policy to Azure
Publish-GuestConfigurationPolicy -Path "./policies"
```

## Viewing Compliance Results

Once policies are assigned and the Machine Configuration agent has had time to evaluate, you can view compliance results.

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

Some policies can automatically remediate non-compliant resources. For example, a custom Machine Configuration policy generated with `ApplyAndAutoCorrect` uses a DeployIfNotExists effect to create the guest assignment. To trigger remediation for existing non-compliant resources:

```bash
# Create a remediation task for a policy assignment
az policy remediation create \
    --name "remediate-critical-services" \
    --policy-assignment "critical-services-baseline" \
    --subscription "your-subscription-id"
```

## Best Practices

**Start with audit-only policies.** Before enforcing anything, run policies in audit mode to understand your current compliance posture. This prevents unexpected disruptions.

**Use initiatives for related policies.** Group related policies into initiatives for easier management and compliance reporting.

**Monitor remediation tasks.** When using DeployIfNotExists policies with auto-remediation, monitor the remediation tasks to make sure they complete successfully.

**Keep Guest Configuration packages updated.** If your compliance requirements change, update your custom configuration packages and republish the policies.

**Test custom configurations locally first.** Always use `Get-GuestConfigurationPackageComplianceStatus` before publishing to catch issues early.

## Summary

Azure Policy and Guest Configuration bring consistent governance to your hybrid infrastructure through Azure Arc. By combining resource-level policies with in-guest configuration auditing, you can enforce the same compliance standards on your on-premises servers that you apply to your Azure VMs. Start with the built-in policies to establish a baseline, then create custom Guest Configuration policies for your organization-specific requirements.
