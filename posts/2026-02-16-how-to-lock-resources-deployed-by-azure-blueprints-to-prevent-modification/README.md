# How to Lock Resources Deployed by Azure Blueprints to Prevent Modification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Blueprints, Resource Locking, Governance, Cloud Security, Infrastructure as Code, Compliance

Description: Learn how to lock resources deployed by Azure Blueprints to prevent accidental or unauthorized modification and maintain environment consistency.

---

When you deploy resources through Azure Blueprints, you get a powerful governance tool that can standardize environment configurations across subscriptions. Azure Blueprints is a preview service and Microsoft has announced that it will be deprecated on July 11, 2026, so new governance designs should evaluate Template Specs and Deployment Stacks as migration targets. But if you already use Blueprints, deploying resources is only half the battle. If anyone with the right RBAC role can walk in and change those resources after deployment, your carefully designed blueprint becomes meaningless. That is where blueprint resource locks come in.

In this guide, I will walk you through how Azure Blueprint resource locks work, how they differ from standard Azure resource locks, and how to configure them to keep your deployed resources safe from unauthorized changes.

## Understanding Azure Blueprint Resource Locks

Azure Blueprints has its own locking mechanism that is separate from the standard Azure resource locks you might already be familiar with. Standard Azure locks (CanNotDelete and ReadOnly) can be removed by anyone with the Microsoft.Authorization/locks/delete permission. Blueprint locks are different because they are managed by the blueprint assignment itself, and only Azure Blueprints can remove the generated deny assignment. These locks apply to non-extension resources deployed by the blueprint assignment; existing resources in an already-existing resource group do not automatically get blueprint locks.

This distinction matters a lot. With standard locks, a subscription owner can simply remove the lock and make changes. With blueprint locks, even subscription owners cannot remove the generated deny assignment directly; they have to modify or delete the blueprint assignment. If you need to prevent subscription owners from deleting the assignment itself, assign the blueprint at management group scope. This provides a much stronger guarantee that your deployed resources stay in the intended configuration.

There are three locking modes available for blueprint assignments:

1. **Don't Lock** - No locks are applied. Resources can be modified or deleted freely.
2. **Do Not Delete** - Resources cannot be deleted, but they can be modified.
3. **Read Only** - Resources cannot be deleted or modified through most Azure Resource Manager operations, with documented exceptions such as tags.

## Setting Up Blueprint Resource Locks in the Azure Portal

Let me walk through the process of applying locks during a blueprint assignment. First, you need to have a published blueprint definition ready.

Navigate to the Azure Portal and go to the Blueprints service. Select your blueprint definition and click "Assign blueprint." In the assignment form, scroll down to the "Lock Assignment" section.

Here you will see the three options I mentioned above. For most production governance scenarios, I recommend starting with "Do Not Delete" rather than jumping straight to "Read Only." The reason is that Read Only locks can interfere with normal operations in ways you might not expect. For example, a Read Only lock on a storage account blocks control-plane write operations such as listing account keys and creating blob containers through Azure Resource Manager. It does not protect blobs, queues, tables, or files from data-plane writes or deletes, so you still need service-specific data protection controls.

## Configuring Locks Using ARM Templates

If you prefer infrastructure as code (and you should), you can set the lock mode when creating a blueprint assignment through an ARM template or the REST API.

Here is an ARM template snippet that creates a blueprint assignment with resource locking enabled:

```json
{
  "type": "Microsoft.Blueprint/blueprintAssignments",
  "apiVersion": "2018-11-01-preview",
  "name": "my-locked-assignment",
  "location": "eastus",
  "identity": {
    "type": "SystemAssigned"
  },
  "properties": {
    "blueprintId": "/providers/Microsoft.Management/managementGroups/myMG/providers/Microsoft.Blueprint/blueprints/myBlueprint/versions/1.0",
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
  -Lock "AllResourcesDoNotDelete" `
  -SystemAssignedIdentity
```

## Excluding Principals and Actions from Locks

Sometimes you need certain service principals or automation accounts to modify blueprint-locked resources. For example, your CI/CD pipeline might need to deploy application code to an App Service that is locked by a blueprint.

You can exclude specific principals and actions from blueprint locks. This is done through the excludedPrincipals and excludedActions properties. Azure PowerShell does not have separate parameters for these exclusions, so create the assignment with a JSON assignment file or use the REST API.

```json
{
  "identity": {
    "type": "SystemAssigned"
  },
  "location": "eastus",
  "properties": {
    "blueprintId": "/providers/Microsoft.Management/managementGroups/myMG/providers/Microsoft.Blueprint/blueprints/myBlueprint/versions/1.0",
    "locks": {
      "mode": "AllResourcesReadOnly",
      "excludedPrincipals": [
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      ],
      "excludedActions": [
        "Microsoft.Web/sites/config/write",
        "Microsoft.Web/sites/extensions/write"
      ]
    },
    "parameters": {},
    "resourceGroups": {}
  }
}
```

```powershell
# Create assignment from assignment.json with exclusions for your CI/CD service principal
New-AzBlueprintAssignment `
  -Name "locked-with-exclusions" `
  -SubscriptionId "00000000-0000-0000-0000-000000000000" `
  -AssignmentFile ".\assignment.json"
```

Be careful with exclusions. Every exclusion you add is a potential hole in your governance posture. Keep exclusions to the minimum necessary and document why each one exists.

## How Blueprint Locks Interact with RBAC

One thing that trips people up is how blueprint locks interact with Azure RBAC. Even if a user has Owner or Contributor role on a subscription, they cannot bypass the deny assignment that implements blueprint locks. The locks are enforced at the Azure Resource Manager level, and the only way to remove them is to change the blueprint assignment.

This means you need to be thoughtful about who has permission to modify or delete blueprint assignments. The key permissions to watch are:

- Microsoft.Blueprint/blueprintAssignments/write
- Microsoft.Blueprint/blueprintAssignments/delete

Anyone with these permissions can change the lock settings by modifying the assignment or remove the locks entirely by deleting the assignment. The Owner role includes these permissions at subscription scope, so use a management group assignment when subscription owners should not be able to remove the assignment and associated locks. I recommend restricting these permissions to a small group of platform team members.

## Handling Lock-Related Errors

When a lock is in place and someone tries to modify a locked resource, they will get an error like this:

```text
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

Azure Blueprint resource locks are a strong governance tool for existing Azure Blueprints environments, though Blueprints itself is scheduled for deprecation on July 11, 2026. Unlike standard resource locks, blueprint-created deny assignments cannot be removed directly by subscription owners. By combining appropriate lock modes with targeted exclusions, management group assignments where needed, and monitoring, you can maintain tight control over your deployed infrastructure while still allowing the operational flexibility your teams need.

The key takeaway is this: deploying resources through blueprints gives you consistency, but locking those resources gives you durability. Both are essential for mature cloud governance.
