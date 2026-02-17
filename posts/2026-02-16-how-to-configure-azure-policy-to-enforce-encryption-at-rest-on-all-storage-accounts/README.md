# How to Configure Azure Policy to Enforce Encryption at Rest on All Storage Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Policy, Encryption, Storage Accounts, Compliance, Security, Governance

Description: Step-by-step guide to configuring Azure Policy definitions and assignments that enforce encryption at rest on all Azure Storage accounts across your subscriptions.

---

Azure Storage accounts encrypt data at rest by default using Microsoft-managed keys, but that default behavior can be changed or weakened depending on how resources are provisioned. If your organization has compliance requirements like PCI DSS, HIPAA, or SOC 2 that mandate encryption at rest, you need a way to enforce it consistently. Azure Policy is the tool for that job.

In this post, I will walk through setting up Azure Policy to audit and enforce encryption settings on storage accounts, including using both built-in and custom policy definitions.

## Understanding Encryption at Rest for Azure Storage

Azure Storage supports several encryption configurations:

- **Microsoft-managed keys (MMK):** The default. Azure handles key rotation and management.
- **Customer-managed keys (CMK):** You provide the encryption key through Azure Key Vault. This gives you control over key rotation and the ability to revoke access.
- **Infrastructure encryption:** A second layer of encryption at the storage infrastructure level, using a different algorithm.

For most compliance frameworks, the minimum requirement is that encryption at rest is enabled. Some stricter frameworks require customer-managed keys. Azure Policy can enforce either level.

## Built-In Policies for Storage Encryption

Microsoft provides several built-in policy definitions related to storage encryption. You do not need to write custom JSON for the most common scenarios. Here are the key ones:

1. **"Storage accounts should use customer-managed key for encryption"** - Audits or denies storage accounts not using CMK
2. **"Storage accounts should have infrastructure encryption"** - Ensures the double-encryption layer is enabled
3. **"Storage accounts should restrict network access"** - Not directly encryption, but often bundled with encryption policies for compliance

To find these in the portal, go to Azure Policy, then Definitions, and search for "storage" and "encryption." Filter by category "Storage" to narrow results.

## Assigning a Built-In Encryption Policy

Let us start with the simplest path: assigning the built-in policy that requires customer-managed keys.

Navigate to Azure Policy in the portal. Click Definitions and search for "Storage accounts should use customer-managed key for encryption." Click on the policy definition to see its details.

Click "Assign" to create an assignment. Fill in the following:

**Scope:** Select the management group, subscription, or resource group where this policy should apply. For broad enforcement, assign at the management group level.

**Exclusions:** If you have storage accounts that legitimately cannot use CMK (like diagnostic storage accounts), add their resource group as an exclusion.

**Policy enforcement:** Set to "Enabled." If you choose "Disabled," the policy only audits without blocking.

**Effect:** The built-in policy typically supports "Audit" and "Deny." Start with "Audit" to see what would be affected, then switch to "Deny" once you have confirmed the blast radius.

Here is how to do the same assignment using Azure CLI:

```bash
# First, find the policy definition ID for the storage encryption policy
az policy definition list \
  --query "[?contains(displayName, 'customer-managed key')].{Name:name, DisplayName:displayName}" \
  --output table

# Assign the policy to a subscription
# Replace the definition name and subscription ID with your values
az policy assignment create \
  --name "require-cmk-storage" \
  --display-name "Require CMK encryption on storage accounts" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/6fac406b-40ca-413b-bf8e-0bf964659c25" \
  --scope "/subscriptions/your-subscription-id" \
  --enforcement-mode "Default" \
  --params '{"effect": {"value": "Audit"}}'
```

## Creating a Custom Policy for Encryption Enforcement

Sometimes the built-in policies do not cover your exact requirements. For example, you might want to enforce that all storage accounts use a specific key vault for their CMK, or that the minimum TLS version is set alongside encryption. In that case, you write a custom policy definition.

Here is a custom policy definition that denies the creation of storage accounts without encryption using customer-managed keys:

```json
{
  // Custom policy: deny storage accounts without CMK encryption
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          // Only apply to storage account resources
          "field": "type",
          "equals": "Microsoft.Storage/storageAccounts"
        },
        {
          // Check if encryption key source is not Microsoft.Keyvault
          "field": "Microsoft.Storage/storageAccounts/encryption.keySource",
          "notEquals": "Microsoft.Keyvault"
        }
      ]
    },
    // Deny the deployment if conditions match
    "then": {
      "effect": "[parameters('effect')]"
    }
  },
  "parameters": {
    "effect": {
      "type": "String",
      "metadata": {
        "displayName": "Effect",
        "description": "The effect to apply when the policy is violated"
      },
      "allowedValues": [
        "Audit",
        "Deny",
        "Disabled"
      ],
      "defaultValue": "Audit"
    }
  }
}
```

To create this policy definition using Azure CLI:

```bash
# Save the policy rule JSON to a file first, then create the definition
az policy definition create \
  --name "custom-require-cmk-storage" \
  --display-name "Custom - Require CMK for storage account encryption" \
  --description "Denies creation of storage accounts that do not use customer-managed keys for encryption" \
  --rules @policy-rule.json \
  --mode All \
  --subscription "your-subscription-id"
```

## Enforcing Infrastructure Encryption

Infrastructure encryption adds a second layer of encryption at the hardware level. It uses AES-256 encryption and a different key than the service-level encryption. This is required by some government and financial sector compliance standards.

Here is a custom policy that enforces infrastructure encryption:

```json
{
  // Custom policy: require infrastructure encryption on storage accounts
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Storage/storageAccounts"
        },
        {
          // Check if infrastructure encryption is not enabled
          "field": "Microsoft.Storage/storageAccounts/encryption.requireInfrastructureEncryption",
          "notEquals": true
        }
      ]
    },
    "then": {
      "effect": "[parameters('effect')]"
    }
  },
  "parameters": {
    "effect": {
      "type": "String",
      "allowedValues": ["Audit", "Deny", "Disabled"],
      "defaultValue": "Audit"
    }
  }
}
```

Important note: infrastructure encryption can only be configured when a storage account is created. It cannot be enabled after the fact. So a "Deny" effect is the right choice here - auditing will only tell you about existing non-compliant accounts that you cannot fix without recreating them.

## Using Policy Initiatives for Comprehensive Coverage

Instead of assigning individual policies one at a time, group related encryption policies into an initiative (also called a policy set). This makes management cleaner and lets you track compliance as a group.

Here is how to create an initiative that bundles encryption requirements:

```bash
# Create an initiative definition that combines multiple encryption policies
az policy set-definition create \
  --name "storage-encryption-initiative" \
  --display-name "Storage Encryption Standards" \
  --description "Ensures all storage accounts meet encryption requirements" \
  --definitions '[
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/6fac406b-40ca-413b-bf8e-0bf964659c25",
      "parameters": {
        "effect": { "value": "Audit" }
      }
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/4733ea7b-a883-42fe-8cac-97454c2a9e4a",
      "parameters": {
        "effect": { "value": "Audit" }
      }
    }
  ]' \
  --subscription "your-subscription-id"
```

Then assign the initiative the same way you would assign a single policy, but use `az policy assignment create` with the `--policy-set-definition` flag instead of `--policy`.

## Checking Compliance Status

After assigning your policies, it takes up to 24 hours for the initial compliance evaluation to complete. You can trigger an on-demand evaluation to speed things up:

```bash
# Trigger an on-demand compliance evaluation for a subscription
az policy state trigger-scan \
  --subscription "your-subscription-id" \
  --no-wait

# Check compliance results after the scan completes
az policy state list \
  --subscription "your-subscription-id" \
  --policy-assignment "require-cmk-storage" \
  --filter "complianceState eq 'NonCompliant'" \
  --query "[].{ResourceId:resourceId, PolicyDefinition:policyDefinitionName}" \
  --output table
```

The compliance dashboard in the portal gives you a visual overview. Go to Azure Policy, then Compliance. You will see a percentage for each assignment and initiative, along with a list of non-compliant resources you can drill into.

## Remediation for Existing Non-Compliant Resources

Policies with "Deny" effect only block new non-compliant deployments. For existing resources, you have two options:

1. **Manual remediation:** Go through the list of non-compliant resources and update them.
2. **Remediation tasks:** If your policy uses the "DeployIfNotExists" or "Modify" effect, Azure Policy can automatically fix non-compliant resources.

For encryption settings, "Modify" effects are limited because changing the encryption key source on an existing storage account requires specific conditions to be met. In practice, you will often need to handle existing accounts manually or through a scripted remediation process.

```bash
# List all non-compliant storage accounts
az policy state list \
  --subscription "your-subscription-id" \
  --filter "complianceState eq 'NonCompliant' and resourceType eq 'Microsoft.Storage/storageAccounts'" \
  --query "[].resourceId" \
  --output tsv
```

## Exemptions for Legitimate Exceptions

Some storage accounts might have valid reasons for not using CMK. Azure Policy exemptions let you exclude specific resources while maintaining a clean compliance record.

```bash
# Create a policy exemption for a specific storage account
az policy exemption create \
  --name "diagnostics-storage-exemption" \
  --policy-assignment "require-cmk-storage" \
  --exemption-category "Waiver" \
  --scope "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account}" \
  --description "Diagnostics storage account uses MMK per architecture decision ADR-042" \
  --expires-on "2027-01-01"
```

Always set an expiration date on exemptions. This forces periodic review and prevents exemptions from lingering forever without justification.

## Best Practices

Here are some practical tips from experience:

- Start every new policy in Audit mode. Run it for at least a week before switching to Deny. This gives teams time to see what would break and adjust their deployments.
- Assign policies at the management group level to ensure new subscriptions inherit them automatically.
- Use naming conventions for policy assignments that include the team responsible and the compliance requirement it addresses.
- Review non-compliant resources weekly and track remediation in your project management tool.
- Combine encryption policies with network restriction policies. Encryption at rest is just one piece of the data protection puzzle.

## Summary

Azure Policy gives you a declarative way to enforce encryption standards across all your storage accounts. By combining built-in and custom policy definitions, organizing them into initiatives, and managing exceptions through exemptions, you can maintain continuous compliance without relying on manual reviews or hoping that every team follows the rules. Start with audit mode, understand your compliance posture, and then move to enforcement.
