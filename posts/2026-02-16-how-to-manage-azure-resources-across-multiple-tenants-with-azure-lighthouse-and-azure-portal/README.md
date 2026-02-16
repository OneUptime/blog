# How to Manage Azure Resources Across Multiple Tenants with Azure Lighthouse and Azure Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Lighthouse, Multi-Tenant, Azure Portal, Resource Management, Managed Services, Cross-Tenant

Description: A hands-on guide to managing Azure resources across multiple tenants using Azure Lighthouse and the Azure Portal without switching directories.

---

If you manage Azure resources across multiple tenants, you know the frustration of constantly switching directories in the Azure Portal. Log in, switch tenant, do some work, switch back, lose your context, repeat. Azure Lighthouse eliminates this pain by projecting resources from other tenants into your home tenant, so you can manage everything from a single portal session.

In this post, I will show you the practical, day-to-day experience of managing multi-tenant resources through the Azure Portal with Lighthouse. This is not about setting up Lighthouse (I have covered that elsewhere) - this is about using it effectively once the delegations are in place.

## The Cross-Tenant Experience in the Azure Portal

Once a customer or partner tenant has delegated resources to you through Lighthouse, those resources appear in your Azure Portal alongside your own resources. You do not need to switch directories. You do not need separate credentials. The resources just show up.

Navigate to the Azure Lighthouse blade in the portal and click on "My customers." You will see all tenants that have delegated resources to you, along with the specific subscriptions and resource groups within each delegation.

But the real power is that delegated resources show up in all the standard Azure Portal blades too. When you go to Virtual Machines, you see VMs from all delegated subscriptions. When you go to Azure Monitor, you see metrics and logs from all tenants. This is the "single pane of glass" that people talk about, and it genuinely works well.

## Filtering Resources by Tenant

With resources from multiple tenants mixed together, filtering becomes essential. The Azure Portal provides a subscription filter at the top of most blades. Click on it and you will see subscriptions organized by directory (tenant). You can quickly select or deselect entire tenants or individual subscriptions.

I recommend creating saved filter configurations for common scenarios:

- **All resources** - everything across all tenants
- **Customer A only** - just one customer's subscriptions
- **Production subscriptions** - production subs across all tenants
- **My internal resources** - only your own tenant's resources

The subscription filter persists across your portal session, so once you set it, it stays until you change it.

## Managing Virtual Machines Across Tenants

Let me walk through a practical scenario. Say you need to check the status of all VMs across three customer tenants and apply a tag to any that are missing one.

First, go to Virtual Machines in the portal and make sure all relevant subscriptions are selected in the filter. You now see every VM across all delegated tenants in a single list.

You can sort, filter, and search this list just like you would for your own VMs. Want to find all VMs without the "Environment" tag? Click "Add filter," select "Tag," and filter for VMs where the Environment tag is missing.

For bulk operations, select multiple VMs using the checkboxes, then use the toolbar actions. You can start, stop, restart, or assign tags to VMs across multiple tenants in a single operation.

For more advanced management, you can use Azure CLI or PowerShell from within the portal's Cloud Shell:

```powershell
# List all VMs across all delegated subscriptions
$allSubs = Get-AzSubscription
$allVMs = @()

foreach ($sub in $allSubs) {
    Set-AzContext -SubscriptionId $sub.Id | Out-Null
    # Get VMs and add subscription context
    $vms = Get-AzVM -Status
    foreach ($vm in $vms) {
        $allVMs += [PSCustomObject]@{
            Tenant       = $sub.TenantId
            Subscription = $sub.Name
            VMName       = $vm.Name
            ResourceGroup = $vm.ResourceGroupName
            Status       = $vm.PowerState
            Location     = $vm.Location
        }
    }
}

# Display VMs missing the Environment tag
$allVMs | Where-Object {
    $vm = Get-AzVM -ResourceGroupName $_.ResourceGroup -Name $_.VMName
    -not $vm.Tags.ContainsKey("Environment")
} | Format-Table -AutoSize
```

## Cross-Tenant Azure Monitor

One of the most valuable aspects of Lighthouse integration with the portal is Azure Monitor. You can create a single monitoring view that spans all your managed tenants.

### Metrics Explorer

In Azure Monitor's Metrics Explorer, you can select resources from any delegated subscription. This means you can build a single chart showing CPU usage across VMs in different tenants. To do this:

1. Open Metrics Explorer
2. Click "Select a scope"
3. Browse through the subscription tree - you will see delegated subscriptions alongside your own
4. Select resources from multiple tenants
5. Choose your metric and aggregation

### Log Analytics Queries Across Tenants

If customers have Log Analytics workspaces in their delegated subscriptions, you can query them from your portal. You can even create cross-workspace queries that pull data from multiple tenants:

```kusto
// Query heartbeat data across multiple customer workspaces
let workspace1 = workspace("customer-a-workspace-id");
let workspace2 = workspace("customer-b-workspace-id");
union
    (workspace1 | Heartbeat | where TimeGenerated > ago(1h)),
    (workspace2 | Heartbeat | where TimeGenerated > ago(1h))
| summarize LastHeartbeat = max(TimeGenerated) by Computer, _ResourceId
| where LastHeartbeat < ago(10m)
// Find machines that haven't sent a heartbeat in 10 minutes
| sort by LastHeartbeat asc
```

## Managing Azure Policy Across Tenants

Azure Policy is another area where the portal integration shines. You can view policy compliance across all delegated subscriptions from a single compliance dashboard.

Navigate to Azure Policy and check the compliance blade. With all subscriptions selected, you see the aggregate compliance state across all tenants. You can drill down into specific policies to see which resources are non-compliant, regardless of which tenant they belong to.

You can also assign policies to delegated subscriptions, provided your delegation includes the appropriate role (typically Contributor or a custom role with policy write permissions). This is incredibly useful for enforcing standards across all managed environments:

```bash
# Assign a policy to a delegated subscription using Azure CLI
az policy assignment create \
  --name "require-tag-environment" \
  --display-name "Require Environment tag on all resources" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef391786494f" \
  --scope "/subscriptions/customer-subscription-id" \
  --params '{"tagName": {"value": "Environment"}}'
```

## Automation and Runbooks Across Tenants

Azure Automation works seamlessly with Lighthouse. You can create runbooks in your own tenant that operate on resources in delegated subscriptions.

Here is a practical example - a runbook that shuts down non-production VMs across all managed tenants at the end of the business day:

```powershell
# Azure Automation runbook for cross-tenant VM shutdown
# Runs on a schedule (e.g., 7 PM daily)

# Authenticate using the Automation Run As account
$connection = Get-AutomationConnection -Name "AzureRunAsConnection"
Connect-AzAccount -ServicePrincipal `
    -TenantId $connection.TenantId `
    -ApplicationId $connection.ApplicationId `
    -CertificateThumbprint $connection.CertificateThumbprint

# Get all subscriptions (including delegated ones)
$subscriptions = Get-AzSubscription

foreach ($sub in $subscriptions) {
    Set-AzContext -SubscriptionId $sub.Id | Out-Null

    # Find non-production VMs that are running
    $vms = Get-AzVM -Status | Where-Object {
        $_.Tags["Environment"] -eq "Development" -and
        $_.PowerState -eq "VM running"
    }

    foreach ($vm in $vms) {
        Write-Output "Stopping $($vm.Name) in $($sub.Name)"
        Stop-AzVM -Name $vm.Name `
            -ResourceGroupName $vm.ResourceGroupName `
            -Force -NoWait
    }
}
```

## Azure Security Center Across Tenants

Azure Security Center (now Microsoft Defender for Cloud) provides a unified security view when combined with Lighthouse. You can see security recommendations and alerts from all delegated subscriptions in a single dashboard.

This is particularly useful for MSPs who need to maintain security standards across customer environments. The secure score for each subscription is visible, and you can drill into recommendations and apply fixes without switching tenants.

## Practical Tips for Daily Operations

**Use favorites and dashboards.** Create custom dashboards that show key metrics from all tenants. Pin frequently accessed resources to your favorites for quick navigation.

**Set up subscription naming conventions.** When you see subscriptions from multiple tenants in a single list, clear naming helps enormously. Work with your customers to adopt a convention like "CustomerName-Environment-Purpose."

**Leverage resource tags consistently.** Tags are your best friend in multi-tenant management. Use consistent tag keys and values across all managed tenants so you can filter and group resources effectively.

**Use Azure Resource Graph for complex queries.** The portal views are great for day-to-day operations, but for complex inventory or compliance queries, Azure Resource Graph gives you the query power you need.

**Document which subscriptions belong to which customer.** It sounds obvious, but when you manage dozens of delegated subscriptions, a simple reference document saves time and prevents mistakes.

## Limitations to Be Aware Of

Lighthouse does not project every Azure service. Some services have limited or no cross-tenant support. Key limitations include:

- Azure Kubernetes Service management is limited
- Key Vault access requires additional configuration
- Some Azure AD operations are not available cross-tenant
- Certain portal blades may not show delegated resources in all views

Check Microsoft's documentation for the latest list of supported services.

## Summary

Managing Azure resources across multiple tenants with Lighthouse and the Azure Portal transforms the multi-tenant management experience from a painful exercise in directory switching to a smooth, unified workflow. By using the portal's subscription filters, Azure Monitor cross-tenant queries, Azure Policy compliance views, and Automation runbooks, you can effectively manage complex multi-tenant environments from a single pane of glass. The key is to establish consistent naming conventions, tagging strategies, and operational procedures that work across all managed tenants.
