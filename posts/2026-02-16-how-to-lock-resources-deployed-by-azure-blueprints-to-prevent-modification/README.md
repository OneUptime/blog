# How to Lock Resources Deployed by Azure Blueprints to Prevent Modification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Blueprints, Resource Locking, Governance, Cloud Security, Infrastructure as Code, Compliance

Description: Learn how to lock resources deployed by Azure Blueprints to prevent accidental or unauthorized modification and maintain environment consistency.

---

When you deploy resources through Azure Blueprints, you get a powerful governance tool that can standardize environment configurations across subscriptions. But deploying resources is only half the battle. If anyone with the right RBAC role can walk in and change those resources after deployment, your carefully designed blueprint becomes meaningless. That is where blueprint resource locks come in.

In this guide, I will walk you through how Azure Blueprint resource locks work, how they differ from standard Azure resource locks, and how to configure them to keep your deployed resources safe from unauthorized changes.

## Understanding Azure Blueprint Resource Locks

Azure Blueprints has its own locking mechanism that is separate from the standard Azure resource locks you might already be familiar with. Standard Azure locks (CanNotDelete and ReadOnly) can be removed by anyone with the Microsoft.Authorization/locks/delete permission. Blueprint locks are different because they are managed by the blueprint assignment itself, and only the system can remove them.

This distinction matters a lot. With standard locks, a subscription owner can simply remove the lock and make changes. With blueprint locks, even subscription owners cannot remove them without first modifying or deleting the blueprint assignment. This provides a much stronger guarantee that your deployed resources stay in the intended configuration.

There are three locking modes available for blueprint assignments:

1. **Don't Lock** - No locks are applied. Resources can be modified or deleted freely.
2. **Do Not Delete** - Resources cannot be deleted, but they can be modified.
3. **Read Only** - Resources cannot be deleted or modified in any way.

## Setting Up Blueprint Resource Locks in the Azure Portal

Let me walk through the process of applying locks during a blueprint assignment. First, you need to have a published blueprint definition ready.

Navigate to the Azure Portal and go to the Blueprints service. Select your blueprint definition and click "Assign blueprint." In the assignment form, scroll down to the "Lock Assignment" section.

Here you will see the three options I mentioned above. For most production governance scenarios, I recommend starting with "Do Not Delete" rather than jumping straight to "Read Only." The reason is that Read Only locks can interfere with normal operations in ways you might not expect. For example, a Read Only lock on a storage account will prevent any data from being written to it, which defeats the purpose of having a storage account in the first place.

## Configuring Locks Using ARM Templates

If you prefer infrastructure as code (and you should), you can set the lock mode when creating a blueprint assignment through an ARM template or the REST API.

Here is an ARM template snippet that creates a blueprint assignment with resource locking enabled:

```json
{
  // Blueprint assignment resource definition
  "type": "Microsoft.Blueprint/blueprintAssignments",
  "apiVersion": "2018-11-01-preview",
  "name": "my-locked-assignment",
  "location": "eastus",
  "identity": {
    // Managed identity used by the blueprint to deploy resources
    "type": "SystemAssigned"
  },
  "properties": {
    "blueprintId": "/providers/Microsoft.Management/managementGroups/myMG/providers/Microsoft.Blueprint/blueprints/myBlueprint/versions/1.0",
    // Lock settings - "AllResourcesDoNotDelete" prevents deletion
    "locks": {
      "mode": "AllResourcesDoNotDelete",
      "excludedPrincipals": [],
      "excludedActions": []
    },
    "parameters": {},
    "resourceGroups": {}
  }
}
```

The lock mode values for the API are slightly different from the portal labels. Here is the mapping:

- **None** corresponds to "Don't Lock"
- **AllResourcesDoNotDelete** corresponds to "Do Not Delete"
- **AllResourcesReadOnly** corresponds to "Read Only"

## Using Azure PowerShell to Assign Blueprints with Locks

You can also create locked assignments using Azure PowerShell, which is handy for automation scripts.

```powershell
# First, get the reference to your published blueprint
$blueprint = Get-AzBlueprint -ManagementGroupId "myMG" -Name "myBlueprint" -LatestPublished

# Create the assignment with Do Not Delete locking
New-AzBlueprintAssignment `
  -Name "locked-assignment" `
  -Blueprint $blueprint `
  -SubscriptionId "00000000-0000-0000-0000-000000000000" `
  -Location "eastus" `
  -LockMode "AllResourcesDoNotDelete" `
  -SystemAssignedIdentity
```

## Excluding Principals and Actions from Locks

Sometimes you need certain service principals or automation accounts to modify blueprint-locked resources. For example, your CI/CD pipeline might need to deploy application code to an App Service that is locked by a blueprint.

You can exclude specific principals and actions from blueprint locks. This is done through the excludedPrincipals and excludedActions properties.

```powershell
# Create assignment with exclusions for your CI/CD service principal
New-AzBlueprintAssignment `
  -Name "locked-with-exclusions" `
  -Blueprint $blueprint `
  -SubscriptionId "00000000-0000-0000-0000-000000000000" `
  -Location "eastus" `
  -LockMode "AllResourcesReadOnly" `
  -LockExcludePrincipal @(
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"  # CI/CD service principal
  ) `
  -LockExcludeAction @(
    "Microsoft.Web/sites/config/write",      # Allow app config changes
    "Microsoft.Web/sites/extensions/write"    # Allow deployment extensions
  ) `
  -SystemAssignedIdentity
```

Be careful with exclusions. Every exclusion you add is a potential hole in your governance posture. Keep exclusions to the minimum necessary and document why each one exists.

## How Blueprint Locks Interact with RBAC

One thing that trips people up is how blueprint locks interact with Azure RBAC. Even if a user has Owner or Contributor role on a subscription, they cannot bypass blueprint locks. The locks are enforced at the Azure Resource Manager level, and the only way to remove them is to change the blueprint assignment.

This means you need to be thoughtful about who has permission to modify or delete blueprint assignments. The key permissions to watch are:

- Microsoft.Blueprint/blueprintAssignments/write
- Microsoft.Blueprint/blueprintAssignments/delete

Anyone with these permissions can change the lock settings by modifying the assignment or remove the locks entirely by deleting the assignment. I recommend restricting these permissions to a small group of platform team members.

## Handling Lock-Related Errors

When a lock is in place and someone tries to modify a locked resource, they will get an error like this:

```
The scope '/subscriptions/.../resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/myStorage'
cannot perform write operation because following scope(s) are locked:
'/subscriptions/.../providers/Microsoft.Blueprint/blueprintAssignments/my-assignment'.
```

This error is actually helpful because it tells you exactly which blueprint assignment is responsible for the lock. If someone reports this error, you can quickly identify whether the lock is intentional and whether an exclusion needs to be added.

## Best Practices for Blueprint Resource Locks

After working with blueprint locks across multiple enterprise environments, here are the patterns that work well:

**Start with Do Not Delete.** Read Only locks are very restrictive and can break things in unexpected ways. Start with Do Not Delete and only escalate to Read Only for resources that truly should never be modified, such as network security groups or diagnostic settings.

**Use exclusions sparingly.** Every exclusion weakens your governance posture. If you find yourself adding many exclusions, it might be a sign that your blueprint is too broad.

**Document your lock strategy.** Make sure your team knows which resources are locked and why. Include this information in your blueprint documentation.

**Test locks in a dev environment first.** Before rolling out locks to production, test them in a development subscription. Make sure your operational workflows still function with the locks in place.

**Monitor blueprint assignment changes.** Set up Azure Activity Log alerts for changes to blueprint assignments. If someone modifies or deletes an assignment (which removes the locks), you want to know about it immediately.

## The Lock Lifecycle

Blueprint locks are tied to the lifecycle of the blueprint assignment. When you update an assignment, the locks are reapplied based on the new settings. When you delete an assignment, all locks from that assignment are removed.

This means you should think of blueprint assignments as long-lived governance artifacts, not one-time deployment tools. If you delete the assignment after deployment, you lose the locks.

You can also use the blueprint assignment update flow to temporarily relax locks for planned maintenance windows. Change the lock mode to None, perform your maintenance, then change it back. Just make sure you have monitoring in place to alert you if the lock is not restored within the expected timeframe.

## Wrapping Up

Azure Blueprint resource locks are one of the strongest governance tools available in Azure. Unlike standard resource locks, they cannot be bypassed by subscription owners, making them ideal for enforcing organizational standards across multiple subscriptions. By combining appropriate lock modes with targeted exclusions and monitoring, you can maintain tight control over your deployed infrastructure while still allowing the operational flexibility your teams need.

The key takeaway is this: deploying resources through blueprints gives you consistency, but locking those resources gives you durability. Both are essential for mature cloud governance.
