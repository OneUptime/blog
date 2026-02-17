# How to Implement Azure RBAC Custom Roles Scoped to Resource Groups for Development Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, RBAC, Custom Roles, Resource Groups, Access Control, Security, Governance

Description: A hands-on guide to creating Azure RBAC custom roles with least-privilege permissions scoped to resource groups for isolating development team access in shared subscriptions.

---

Azure's built-in RBAC roles cover a lot of ground, but they are often too broad or too narrow for real-world development team needs. The Contributor role gives too much access - it can delete resources, modify networking, and manage role assignments. The Reader role gives too little - teams cannot deploy or manage their own applications. Custom roles let you define exactly the permissions each team needs, scoped to their resource group, following the principle of least privilege.

In this guide, I will walk through designing, creating, and managing custom roles for development teams in a shared Azure subscription.

## Why Custom Roles for Dev Teams

In a typical enterprise setup, multiple development teams share a subscription. Each team has their own resource group. The goal is:

- Team A can manage all resources in their resource group but cannot touch Team B's resources
- No team can modify networking, security, or subscription-level settings
- Each team can deploy and manage the specific Azure services they use
- No team can assign roles to other users (preventing privilege escalation)

The built-in Contributor role fails here because it includes permissions like `Microsoft.Authorization/roleAssignments/write` (through inherited assignments at higher scopes) and access to resources in other resource groups if assigned at the subscription level.

## Understanding Custom Role Structure

An Azure custom role definition has these key components:

```json
{
  "Name": "Role display name",
  "Description": "What this role is for",
  "Actions": [
    // Management plane operations allowed
    // e.g., "Microsoft.Compute/virtualMachines/read"
  ],
  "NotActions": [
    // Operations explicitly denied
    // Subtracts from Actions
  ],
  "DataActions": [
    // Data plane operations allowed
    // e.g., "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"
  ],
  "NotDataActions": [
    // Data plane operations denied
  ],
  "AssignableScopes": [
    // Where this role can be assigned
    // e.g., "/subscriptions/{sub-id}/resourceGroups/{rg}"
  ]
}
```

The effective permissions are `Actions` minus `NotActions`. Use `Actions` to include broad permission sets and `NotActions` to carve out exceptions.

## Step 1: Design the Permission Set

Start by listing what each team needs to do. Here is a common pattern for a web application team:

**They need to:**
- Deploy and manage App Service (Web Apps, Function Apps)
- Manage Azure SQL databases
- Read and write Key Vault secrets
- Deploy and manage Storage accounts
- View monitoring data and set up alerts
- Deploy to their own resource group

**They should NOT be able to:**
- Modify virtual networks, NSGs, or firewalls
- Assign RBAC roles
- Move resources between resource groups
- Delete the resource group itself
- Access other teams' resource groups
- Modify subscription-level policies

## Step 2: Create the Custom Role Definition

Here is a custom role for a web application development team:

```json
{
  "Name": "Web App Developer",
  "IsCustom": true,
  "Description": "Can deploy and manage web applications, databases, and supporting services within assigned resource groups",
  "Actions": [
    // App Service permissions
    "Microsoft.Web/sites/*",
    "Microsoft.Web/serverfarms/*",
    "Microsoft.Web/certificates/*",

    // Azure SQL permissions
    "Microsoft.Sql/servers/read",
    "Microsoft.Sql/servers/databases/*",
    "Microsoft.Sql/servers/firewallRules/*",

    // Storage permissions (management plane)
    "Microsoft.Storage/storageAccounts/*",

    // Key Vault permissions (management plane only)
    "Microsoft.KeyVault/vaults/read",
    "Microsoft.KeyVault/vaults/deploy/action",

    // Application Insights / Monitoring
    "Microsoft.Insights/components/*",
    "Microsoft.Insights/alertRules/*",
    "Microsoft.Insights/metricAlerts/*",
    "Microsoft.Insights/diagnosticSettings/*",

    // Resource group level read access
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Resources/deployments/*",

    // General resource operations
    "Microsoft.Resources/tags/*",
    "Microsoft.OperationalInsights/workspaces/read",
    "Microsoft.OperationalInsights/workspaces/sharedKeys/read",

    // Cache for Redis
    "Microsoft.Cache/redis/*",

    // Managed Identity (for App Service)
    "Microsoft.ManagedIdentity/userAssignedIdentities/*"
  ],
  "NotActions": [
    // Prevent role assignment changes (no privilege escalation)
    "Microsoft.Authorization/*/Write",
    "Microsoft.Authorization/*/Delete",

    // Prevent resource group deletion
    "Microsoft.Resources/subscriptions/resourceGroups/delete",

    // Prevent network changes
    "Microsoft.Network/*",

    // Prevent policy changes
    "Microsoft.PolicyInsights/*",

    // Prevent changes to locks
    "Microsoft.Authorization/locks/*"
  ],
  "DataActions": [
    // Blob storage data access
    "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*",
    "Microsoft.Storage/storageAccounts/queueServices/queues/messages/*"
  ],
  "NotDataActions": [],
  "AssignableScopes": [
    // Scope to a specific subscription
    // When assigned, it will be at the resource group level
    "/subscriptions/your-subscription-id"
  ]
}
```

Create the role using Azure CLI:

```bash
# Save the role definition to a JSON file first, then create it
az role definition create --role-definition @web-app-developer-role.json

# Verify the role was created
az role definition list --custom-role-only true \
  --query "[?roleName=='Web App Developer'].{Name:roleName, Id:name}" \
  --output table
```

## Step 3: Create Roles for Different Team Types

Different teams need different permissions. Here are additional role examples:

**Data Engineering Team:**

```bash
# Create a custom role for data engineers
az role definition create --role-definition '{
  "Name": "Data Engineer",
  "IsCustom": true,
  "Description": "Can manage data services including Data Factory, Databricks, and data storage",
  "Actions": [
    "Microsoft.DataFactory/factories/*",
    "Microsoft.Databricks/workspaces/*",
    "Microsoft.Storage/storageAccounts/*",
    "Microsoft.Sql/servers/read",
    "Microsoft.Sql/servers/databases/*",
    "Microsoft.EventHub/namespaces/*",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Resources/deployments/*",
    "Microsoft.Insights/components/*",
    "Microsoft.Insights/diagnosticSettings/*"
  ],
  "NotActions": [
    "Microsoft.Authorization/*/Write",
    "Microsoft.Authorization/*/Delete",
    "Microsoft.Resources/subscriptions/resourceGroups/delete",
    "Microsoft.Network/*"
  ],
  "DataActions": [
    "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/*"
  ],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/your-subscription-id"
  ]
}'
```

**Infrastructure Team (more permissive, but still scoped):**

```bash
az role definition create --role-definition '{
  "Name": "Infrastructure Engineer",
  "IsCustom": true,
  "Description": "Can manage infrastructure resources including VMs, networking, and containers within assigned resource groups",
  "Actions": [
    "Microsoft.Compute/*",
    "Microsoft.Network/*",
    "Microsoft.Storage/*",
    "Microsoft.ContainerService/*",
    "Microsoft.ContainerRegistry/*",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Resources/deployments/*",
    "Microsoft.Insights/*",
    "Microsoft.OperationalInsights/*",
    "Microsoft.ManagedIdentity/*"
  ],
  "NotActions": [
    "Microsoft.Authorization/*/Write",
    "Microsoft.Authorization/*/Delete",
    "Microsoft.Resources/subscriptions/resourceGroups/delete"
  ],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/your-subscription-id"
  ]
}'
```

## Step 4: Assign the Custom Role at the Resource Group Level

Assign the role to a group (recommended) or individual user at the resource group scope:

```bash
# Create a security group for the team
GROUP_ID=$(az ad group create \
  --display-name "Team-Alpha-Developers" \
  --mail-nickname "team-alpha-dev" \
  --query "id" --output tsv)

# Assign the custom role at the resource group scope
az role assignment create \
  --assignee $GROUP_ID \
  --role "Web App Developer" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-team-alpha"

# Verify the assignment
az role assignment list \
  --resource-group "rg-team-alpha" \
  --query "[?roleDefinitionName=='Web App Developer'].{Principal:principalName, Role:roleDefinitionName, Scope:scope}" \
  --output table
```

The key here is the scope. By assigning at the resource group level, the team only has permissions within that resource group. They cannot see or modify resources in other resource groups.

## Step 5: Test the Permissions

After assignment, test that the team can do what they need and cannot do what they should not:

```bash
# Sign in as a user in the Team Alpha group
az login

# These should work (within their resource group)
az webapp create --name test-app --resource-group rg-team-alpha --plan test-plan
az sql db create --name test-db --server team-alpha-sql --resource-group rg-team-alpha
az storage account create --name teamalphastorage --resource-group rg-team-alpha --sku Standard_LRS

# These should fail (not in their resource group)
az webapp list --resource-group rg-team-beta
# Expected: Authorization error

# These should fail (excluded by NotActions)
az role assignment create --assignee someone@contoso.com --role Reader --resource-group rg-team-alpha
# Expected: Authorization error - cannot assign roles

# This should fail (cannot delete resource group)
az group delete --name rg-team-alpha
# Expected: Authorization error
```

## Step 6: Handle Cross-Team Shared Resources

Some resources need to be shared across teams. For example, a shared container registry, a shared Key Vault, or a shared virtual network.

Create a separate resource group for shared resources and grant read-only access to the teams that need it:

```bash
# Grant read access to shared resources
az role assignment create \
  --assignee $GROUP_ID \
  --role "Reader" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-shared-services"

# For specific services, grant more targeted access
# For example, allow pulling images from the shared container registry
az role assignment create \
  --assignee $GROUP_ID \
  --role "AcrPull" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-shared-services/providers/Microsoft.ContainerRegistry/registries/sharedACR"
```

## Step 7: Audit and Review Role Assignments

Periodically audit who has what access:

```bash
# List all custom role assignments in a subscription
az role assignment list \
  --subscription "{sub-id}" \
  --query "[?contains(roleDefinitionName, 'Web App') || contains(roleDefinitionName, 'Data Engineer') || contains(roleDefinitionName, 'Infrastructure')].{Principal:principalName, Role:roleDefinitionName, Scope:scope}" \
  --output table

# Check for overly broad assignments (roles assigned at subscription level)
az role assignment list \
  --subscription "{sub-id}" \
  --query "[?scope=='/subscriptions/{sub-id}'].{Principal:principalName, Role:roleDefinitionName}" \
  --output table
```

Set up Azure Monitor alerts for role assignment changes:

```bash
# Create an activity log alert for role assignment changes
az monitor activity-log alert create \
  --name "role-assignment-changes" \
  --resource-group myResourceGroup \
  --action-group "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/SecurityTeam" \
  --condition category=Administrative and operationName=Microsoft.Authorization/roleAssignments/write
```

## Managing Custom Role Updates

When you need to update a custom role (add or remove permissions), update the role definition:

```bash
# Get the current role definition
az role definition list --custom-role-only true --name "Web App Developer" --output json > current-role.json

# Edit the JSON file to add or remove permissions
# Then update the role
az role definition update --role-definition @updated-role.json
```

Changes to role definitions take effect within minutes for all existing assignments. This is a powerful feature but also means you should be careful with updates - they affect everyone who has the role assigned.

## Best Practices

- Use groups for role assignments, not individual users. This scales better and simplifies management.
- Start with minimal permissions and add more as teams request them. It is easier to grant additional access than to revoke it.
- Always include `Microsoft.Resources/deployments/*` in Actions. Without it, teams cannot deploy ARM templates or Bicep, which blocks most deployment tools.
- Never include `Microsoft.Authorization/roleAssignments/write` in custom roles for development teams. This would let them grant themselves more permissions.
- Document each custom role with the intended audience and rationale for each permission. Store the role definitions in source control.
- Review custom roles quarterly. Azure services add new resource providers and actions regularly, and your roles may need updates to support new features.
- Set up PIM for custom roles on critical resource groups so team members must activate their access rather than having it always on.
- Use naming conventions for roles that indicate the team type and permission level (e.g., "Web App Developer," "Data Engineer - ReadOnly").

## Summary

Custom RBAC roles scoped to resource groups give you precise control over what each development team can do in a shared Azure subscription. Design roles based on actual team needs, use NotActions to carve out dangerous permissions, assign through groups at the resource group scope, and test thoroughly before relying on the role in production. The combination of custom roles and resource group scoping implements least privilege without creating operational friction for your development teams.
