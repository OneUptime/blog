# How to Fix 'RequestDisallowedByPolicy' Errors Caused by Azure Policy Restrictions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Policy, Troubleshooting, Governance, Compliance, ARM, Deployment

Description: Diagnose and resolve RequestDisallowedByPolicy errors in Azure by identifying which policies block your deployments and how to request exemptions.

---

You try to create a resource in Azure and get this:

```
RequestDisallowedByPolicy - Resource 'my-storage-account' was disallowed by policy.
Policy identifiers: '[policyDefinitionId]'
```

Something you are trying to do violates an Azure Policy that your organization has put in place. The error is actually working as intended - it is preventing you from creating a resource that does not meet your organization's standards. But when you need to get work done and a policy is in your way, you need to understand how to work with it rather than around it.

## What is Azure Policy

Azure Policy is a governance service that enforces rules on Azure resources. Policies can:

- **Deny** resource creation or modification that does not meet requirements
- **Audit** non-compliant resources without blocking them
- **Modify** resources to add or change properties automatically (like adding tags)
- **DeployIfNotExists** to automatically deploy related resources (like diagnostic settings)

The Deny effect is what causes RequestDisallowedByPolicy errors. Someone in your organization - usually the platform or security team - created a policy that blocks certain resource configurations.

## Step 1: Identify the Blocking Policy

The error message includes a policy definition ID, but it is usually truncated or hard to read. Get the full details.

```bash
# Get details about the policy that blocked your request
# Use the policy definition ID from the error message
az policy definition show \
  --name "<policy-definition-name>" \
  --query "{Name:displayName, Description:description, Effect:policyRule.then.effect}" \
  --output json
```

If you do not have the policy definition name handy, check the Activity Log for the failed operation:

```bash
# Find the failed deployment in the Activity Log
az monitor activity-log list \
  --resource-group my-rg \
  --start-time 2026-02-16T00:00:00Z \
  --query "[?status.value == 'Failed' && properties.statusMessage contains 'RequestDisallowedByPolicy'].{Time:eventTimestamp, Message:properties.statusMessage}" \
  --output json
```

You can also list all policy assignments at your scope to see what restrictions are in effect:

```bash
# List all policy assignments for a resource group
az policy assignment list \
  --resource-group my-rg \
  --query "[].{Name:displayName, PolicyDefinition:policyDefinitionId, Enforcement:enforcementMode}" \
  --output table

# List all policy assignments for a subscription
az policy assignment list \
  --query "[].{Name:displayName, PolicyDefinition:policyDefinitionId, Scope:scope}" \
  --output table
```

## Step 2: Understand What the Policy Requires

Once you know which policy blocked you, read its definition to understand what it enforces.

Common Azure Policy restrictions that trigger this error:

### Allowed Locations

Restricts where resources can be created.

```bash
# Check which locations are allowed
az policy assignment show \
  --name "allowed-locations" \
  --query "parameters.listOfAllowedLocations.value" \
  --output json
```

**Fix**: Deploy your resource in one of the allowed locations.

### Allowed VM SKUs

Restricts which virtual machine sizes can be used.

```bash
# Check which VM sizes are allowed
az policy assignment show \
  --name "allowed-vm-skus" \
  --query "parameters.listOfAllowedSKUs.value" \
  --output json
```

**Fix**: Choose a VM size from the allowed list.

### Require Tags

Requires specific tags on resources.

**Fix**: Add the required tags to your deployment.

```bash
# Deploy with required tags
az storage account create \
  --resource-group my-rg \
  --name mystorageaccount \
  --location eastus \
  --sku Standard_LRS \
  --tags Environment=Production CostCenter=CC1234 Owner=team-alpha
```

In Terraform:

```hcl
resource "azurerm_storage_account" "example" {
  name                     = "mystorageaccount"
  resource_group_name      = azurerm_resource_group.example.name
  location                 = azurerm_resource_group.example.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Add required tags to comply with policy
  tags = {
    Environment = "Production"
    CostCenter  = "CC1234"
    Owner       = "team-alpha"
  }
}
```

### Deny Public Network Access

Blocks resources with public network access enabled.

**Fix**: Configure the resource with private endpoints or VNet integration.

```bash
# Create a storage account with public access disabled
az storage account create \
  --resource-group my-rg \
  --name mystorageaccount \
  --location eastus \
  --sku Standard_LRS \
  --public-network-access Disabled
```

### Require HTTPS

Blocks storage accounts or web apps that do not enforce HTTPS.

**Fix**: Enable HTTPS-only.

```bash
az storage account create \
  --resource-group my-rg \
  --name mystorageaccount \
  --location eastus \
  --sku Standard_LRS \
  --https-only true \
  --min-tls-version TLS1_2
```

## Step 3: Modify Your Deployment to Comply

In most cases, the right action is to modify your deployment to meet the policy requirements. The policy exists for a reason, and complying with it is better than trying to bypass it.

Review your resource configuration and compare it against what the policy requires. The policy definition's `policyRule` section shows exactly what conditions trigger the deny.

```bash
# View the full policy rule to understand the conditions
az policy definition show \
  --name "<policy-definition-name>" \
  --query "policyRule" \
  --output json
```

For example, a policy that requires encryption might look like:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.Storage/storageAccounts"
      },
      {
        "field": "Microsoft.Storage/storageAccounts/encryption.services.blob.enabled",
        "notEquals": "true"
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}
```

This tells you that blob encryption must be enabled. Adjust your deployment accordingly.

## Step 4: Request a Policy Exemption

If you have a legitimate reason to deviate from the policy (a proof of concept, a migration scenario, a third-party requirement), you can request a policy exemption.

Policy exemptions are scoped to specific resources or resource groups and can be time-limited.

```bash
# Create a policy exemption for a specific resource group
az policy exemption create \
  --name "poc-exemption" \
  --display-name "POC Environment Exemption" \
  --description "Temporary exemption for proof of concept deployment" \
  --policy-assignment "/subscriptions/<sub-id>/providers/Microsoft.Authorization/policyAssignments/require-tags" \
  --exemption-category "Waiver" \
  --scope "/subscriptions/<sub-id>/resourceGroups/poc-rg" \
  --expires-on "2026-03-16T00:00:00Z"
```

Exemption categories:
- **Waiver**: The resource group or subscription should comply but is temporarily exempt
- **Mitigated**: The risk is addressed through other means

Always set an expiration date on exemptions. Permanent exemptions tend to be forgotten and create compliance gaps.

## Step 5: Check Policy Evaluation Order

Policies are evaluated at the scope where they are assigned and all child scopes. A policy assigned at the management group level affects all subscriptions and resource groups below it.

```bash
# Check policies at different scope levels
# Management group
az policy assignment list --scope "/providers/Microsoft.Management/managementGroups/<mg-name>"

# Subscription
az policy assignment list --scope "/subscriptions/<sub-id>"

# Resource group
az policy assignment list --resource-group my-rg
```

If a policy is assigned at the management group level, you cannot override it at the subscription level. You need to work with whoever manages the management group to get an exemption or policy update.

## Step 6: Use Azure Policy Compliance Dashboard

The compliance dashboard shows which resources are compliant and which are not, across all your policies.

```bash
# Check compliance state for a specific policy assignment
az policy state list \
  --policy-assignment "/subscriptions/<sub-id>/providers/Microsoft.Authorization/policyAssignments/<assignment-name>" \
  --filter "complianceState eq 'NonCompliant'" \
  --query "[].{Resource:resourceId, Policy:policyDefinitionName}" \
  --output table
```

This helps you understand the broader impact of the policy and see if other resources are also non-compliant.

## Working with Your Platform Team

If you keep running into policy restrictions, work with your platform team to understand the governance framework. Common patterns:

- **Sandbox subscriptions** with relaxed policies for experimentation
- **Pre-approved configurations** that comply with all policies (landing zones)
- **Service catalog** of compliant resource templates
- **Policy exception process** with documented justification and approval

Azure Policy is a sign of a mature cloud operation. Rather than fighting the policies, learn to work within them. They protect the entire organization, and your deployment is more secure and compliant as a result.

The key takeaway: RequestDisallowedByPolicy means the system is working correctly. Your job is to either modify your deployment to comply or get a legitimate exemption through the proper channels.
