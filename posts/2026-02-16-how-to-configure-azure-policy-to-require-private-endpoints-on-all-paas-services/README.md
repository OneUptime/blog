# How to Configure Azure Policy to Require Private Endpoints on All PaaS Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Policy, Private Endpoints, PaaS Security, Network Security, Compliance, Governance

Description: Step-by-step guide to creating and assigning Azure Policy definitions that enforce the use of private endpoints on PaaS services like Storage, SQL, and Key Vault.

---

Platform-as-a-Service resources in Azure are, by default, accessible over the public internet. Your Azure SQL database, Key Vault, Storage account, and Cosmos DB instance all have public endpoints that anyone can try to connect to. Private endpoints solve this by giving your PaaS resources a private IP address inside your virtual network, effectively removing them from the public internet.

But enabling private endpoints is an opt-in configuration. If a developer creates a new storage account and forgets to configure a private endpoint, that account is publicly accessible. Azure Policy lets you enforce private endpoint usage across your organization so this oversight cannot happen.

## The Problem with Public PaaS Endpoints

When a PaaS service has a public endpoint, the attack surface includes:

- Brute force attacks against authentication (SQL, Cosmos DB)
- Data exfiltration if credentials are compromised
- DNS-based reconnaissance to discover resources
- Exposure to internet-wide scanning tools

Private endpoints remove the public endpoint entirely (when combined with disabling public network access). Traffic between your application and the PaaS service stays within the Azure backbone network and never touches the public internet.

## Strategy: Audit First, Then Deny

Rolling out private endpoint enforcement requires a phased approach:

1. **Audit phase:** Deploy policies in Audit mode to discover all non-compliant resources
2. **Remediation phase:** Work with teams to add private endpoints to existing resources
3. **Enforcement phase:** Switch policies to Deny mode to prevent new non-compliant resources

Jumping straight to Deny will break deployments and create friction with development teams.

## Built-In Policies for Private Endpoints

Microsoft provides built-in policies for most PaaS services. Here are the key ones:

| Service | Policy Name | Definition ID |
|---|---|---|
| Storage Account | Storage accounts should use private link | 6edd7eda-6dd8-40f7-810d-67160c639cd9 |
| SQL Database | Azure SQL Database should have private endpoint | 7698e800-9299-47a6-b3b6-5a0fee576ead |
| Key Vault | Azure Key Vault should use private link | a6abeaec-4d90-4a02-805f-6b26c4d3fbe9 |
| Cosmos DB | CosmosDB should use private link | 58440f8a-10c5-4151-bdce-dfbaad4a20b6 |
| Azure Cache for Redis | Azure Cache for Redis should use private link | 7803067c-7d34-46e3-8c79-0ca68fc4036d |
| Event Hub | Event Hub namespaces should use private link | b8564268-eb4a-4337-89be-a19db070c59d |

You can find the full list by searching for "private link" in the Azure Policy definition catalog.

## Step 1: Assign Built-In Policies in Audit Mode

Start by assigning the built-in policies to get visibility into your current posture:

```bash
# Assign the Storage Account private link policy in Audit mode
az policy assignment create \
  --name "audit-storage-private-link" \
  --display-name "Audit: Storage accounts should use private link" \
  --policy "6edd7eda-6dd8-40f7-810d-67160c639cd9" \
  --scope "/subscriptions/{sub-id}" \
  --enforcement-mode "Default" \
  --params '{"effect": {"value": "Audit"}}'

# Assign the SQL Database private endpoint policy
az policy assignment create \
  --name "audit-sql-private-endpoint" \
  --display-name "Audit: SQL Database should have private endpoint" \
  --policy "7698e800-9299-47a6-b3b6-5a0fee576ead" \
  --scope "/subscriptions/{sub-id}" \
  --enforcement-mode "Default" \
  --params '{"effect": {"value": "Audit"}}'

# Assign the Key Vault private link policy
az policy assignment create \
  --name "audit-kv-private-link" \
  --display-name "Audit: Key Vault should use private link" \
  --policy "a6abeaec-4d90-4a02-805f-6b26c4d3fbe9" \
  --scope "/subscriptions/{sub-id}" \
  --enforcement-mode "Default" \
  --params '{"effect": {"value": "Audit"}}'
```

## Step 2: Create a Policy Initiative

Instead of managing individual policies, bundle them into an initiative:

```bash
# Create a policy initiative (policy set) for private endpoint enforcement
az policy set-definition create \
  --name "require-private-endpoints" \
  --display-name "Require Private Endpoints on PaaS Services" \
  --description "Ensures all PaaS services use private endpoints for network access" \
  --definitions '[
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/6edd7eda-6dd8-40f7-810d-67160c639cd9",
      "policyDefinitionReferenceId": "storagePrivateLink",
      "parameters": {
        "effect": {"value": "[parameters('"'"'effect'"'"')]"}
      }
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/7698e800-9299-47a6-b3b6-5a0fee576ead",
      "policyDefinitionReferenceId": "sqlPrivateEndpoint",
      "parameters": {
        "effect": {"value": "[parameters('"'"'effect'"'"')]"}
      }
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/a6abeaec-4d90-4a02-805f-6b26c4d3fbe9",
      "policyDefinitionReferenceId": "keyVaultPrivateLink",
      "parameters": {
        "effect": {"value": "[parameters('"'"'effect'"'"')]"}
      }
    }
  ]' \
  --params '{
    "effect": {
      "type": "String",
      "metadata": {
        "displayName": "Effect",
        "description": "Audit or Deny"
      },
      "allowedValues": ["Audit", "Deny", "Disabled"],
      "defaultValue": "Audit"
    }
  }' \
  --subscription "{sub-id}"
```

## Step 3: Create a Custom Policy for Services Without Built-In Policies

Some PaaS services may not have a built-in private link policy. You can create custom policies. Here is a generic pattern:

```json
{
  // Custom policy to audit resources without private endpoint connections
  // This checks the privateEndpointConnections property
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.SignalRService/SignalR"
        },
        {
          // Check if no approved private endpoint connections exist
          "count": {
            "field": "Microsoft.SignalRService/SignalR/privateEndpointConnections[*]",
            "where": {
              "field": "Microsoft.SignalRService/SignalR/privateEndpointConnections[*].privateLinkServiceConnectionState.status",
              "equals": "Approved"
            }
          },
          "less": 1
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

The pattern is the same for most resource types - you check the `privateEndpointConnections` array for at least one approved connection.

## Step 4: Add a Policy to Disable Public Network Access

Having a private endpoint is only half the solution. The public endpoint is still active unless you explicitly disable public network access. Create or assign policies for this too:

```bash
# Assign the built-in policy to deny public network access on storage accounts
az policy assignment create \
  --name "deny-storage-public-access" \
  --display-name "Deny public network access on storage accounts" \
  --policy "b2982f36-99f2-4db5-8eff-283140c09693" \
  --scope "/subscriptions/{sub-id}" \
  --params '{"effect": {"value": "Deny"}}'
```

Here is a custom policy that ensures public network access is disabled on SQL servers:

```json
{
  // Deny SQL servers with public network access enabled
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Sql/servers"
        },
        {
          // Public network access should be Disabled
          "field": "Microsoft.Sql/servers/publicNetworkAccess",
          "notEquals": "Disabled"
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

## Step 5: Check Compliance and Identify Non-Compliant Resources

After assigning policies in Audit mode, trigger a compliance scan and review the results:

```bash
# Trigger a compliance scan
az policy state trigger-scan --subscription "{sub-id}" --no-wait

# After the scan completes, list non-compliant resources
az policy state list \
  --subscription "{sub-id}" \
  --policy-set-definition "require-private-endpoints" \
  --filter "complianceState eq 'NonCompliant'" \
  --query "[].{Resource:resourceId, Policy:policyDefinitionName, Compliance:complianceState}" \
  --output table
```

The compliance dashboard in the portal gives you a visual breakdown by resource type and policy.

## Step 6: Remediate Existing Resources

For each non-compliant resource, you need to create a private endpoint. Here is an example for a storage account:

```bash
# Create a private endpoint for a storage account
az network private-endpoint create \
  --name "pe-mystorageaccount" \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet myPrivateEndpointSubnet \
  --private-connection-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --group-id "blob" \
  --connection-name "storage-blob-connection"

# Create a private DNS zone for the storage blob endpoint
az network private-dns zone create \
  --name "privatelink.blob.core.windows.net" \
  --resource-group myResourceGroup

# Link the DNS zone to your VNet
az network private-dns link vnet create \
  --name "storage-dns-link" \
  --resource-group myResourceGroup \
  --zone-name "privatelink.blob.core.windows.net" \
  --virtual-network myVNet \
  --registration-enabled false

# Create DNS zone group for automatic DNS registration
az network private-endpoint dns-zone-group create \
  --name "storage-dns-zone-group" \
  --resource-group myResourceGroup \
  --endpoint-name "pe-mystorageaccount" \
  --private-dns-zone "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net" \
  --zone-name "blob"
```

## Step 7: Switch to Deny Mode

Once you have remediated existing resources and communicated the policy to development teams, switch the policies to Deny:

```bash
# Update the initiative assignment to Deny mode
az policy assignment update \
  --name "require-private-endpoints-assignment" \
  --params '{"effect": {"value": "Deny"}}'
```

After switching to Deny, any attempt to create a PaaS resource without a private endpoint will be blocked at deployment time. The user sees a policy violation error in the portal or their deployment tool.

## Handling Exceptions

Some resources legitimately need public endpoints. For example, a CDN origin or a public-facing API. Use policy exemptions:

```bash
# Create an exemption for a specific resource
az policy exemption create \
  --name "cdn-origin-exemption" \
  --policy-assignment "require-private-endpoints-assignment" \
  --exemption-category "Waiver" \
  --scope "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/cdnoriginaccount" \
  --description "CDN origin storage account requires public access per architecture decision" \
  --expires-on "2027-01-01"
```

Always set an expiration and document the reason. Review exemptions quarterly.

## Infrastructure as Code Integration

If your teams use Bicep or Terraform, the Deny policy will catch non-compliant deployments at deployment time. Make sure your IaC templates include private endpoint configuration:

```bicep
// Bicep example: Storage account with private endpoint
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'mystorageaccount'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    // Disable public network access
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
    }
  }
}

// Private endpoint for the storage account
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pe-${storageAccount.name}'
  location: location
  properties: {
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'storage-connection'
        properties: {
          privateLinkServiceId: storageAccount.id
          groupIds: ['blob']
        }
      }
    ]
  }
}
```

## Summary

Azure Policy is the right tool for enforcing private endpoints across your organization. Start with the built-in policies in Audit mode, create an initiative that covers all your PaaS service types, remediate existing resources, and then switch to Deny mode for enforcement. Do not forget to also enforce disabling public network access - having a private endpoint does not help if the public endpoint is still open. Combine this with exemptions for legitimate exceptions and you have a comprehensive network isolation strategy for your PaaS resources.
