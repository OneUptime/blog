# How to Use Azure Resource Graph Explorer to Find Unattached Disks and Unused Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Resource Graph, Cost Optimization, Unused Resources, Managed Disks, Governance, FinOps

Description: Learn how to use Azure Resource Graph Explorer to find unattached disks, unused public IPs, idle resources, and other waste across your Azure subscriptions.

---

Every Azure environment accumulates waste over time. Developers create resources for testing and forget to clean them up. VMs get deleted but their disks, public IPs, and NICs stick around. Load balancers sit idle because the backend was decommissioned months ago. This waste adds up, and it is surprisingly hard to spot by browsing the portal.

Azure Resource Graph is the perfect tool for finding these orphaned and unused resources. In this guide, I will share a collection of battle-tested Resource Graph queries that will help you identify waste across your entire tenant.

## Why Resources Get Orphaned

Before jumping into queries, it helps to understand how orphaned resources happen. In Azure, deleting a virtual machine does not automatically delete its associated resources. When you delete a VM, the following resources can be left behind:

- Managed disks (OS disk and data disks)
- Network interfaces
- Public IP addresses
- Network security groups (if not shared)
- Boot diagnostics storage containers
- Availability sets (if empty)

The same pattern applies to other resource types. Deleting an AKS cluster may leave behind load balancers and public IPs. Deleting an Application Gateway leaves its public IP. Over time, these orphaned resources accumulate and generate costs.

## Finding Unattached Managed Disks

Unattached managed disks are the most common source of waste. Each disk costs money based on its size and tier, whether or not it is attached to a VM.

```kusto
// Find all unattached managed disks
resources
| where type == "microsoft.compute/disks"
| where properties.diskState == "Unattached"
| extend sizeGb = tostring(properties.diskSizeGB)
| extend sku = tostring(sku.name)
| extend timeCreated = tostring(properties.timeCreated)
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| project
    name,
    subscriptionName,
    resourceGroup,
    location,
    sizeGb,
    sku,
    timeCreated,
    tags
| sort by sizeGb desc
```

This query returns every unattached disk along with its size and SKU, so you can estimate the cost. Premium SSD disks are particularly expensive to leave sitting around.

### Estimating Cost of Unattached Disks

To prioritize cleanup, calculate the approximate monthly cost:

```kusto
// Estimate monthly cost of unattached disks
resources
| where type == "microsoft.compute/disks"
| where properties.diskState == "Unattached"
| extend sizeGb = toint(properties.diskSizeGB)
| extend sku = tostring(sku.name)
| extend estimatedMonthlyCost = case(
    sku == "Premium_LRS" and sizeGb <= 32, 5.28,
    sku == "Premium_LRS" and sizeGb <= 64, 10.21,
    sku == "Premium_LRS" and sizeGb <= 128, 19.71,
    sku == "Premium_LRS" and sizeGb <= 256, 38.02,
    sku == "Premium_LRS" and sizeGb <= 512, 73.22,
    sku == "Premium_LRS" and sizeGb <= 1024, 135.17,
    sku == "StandardSSD_LRS" and sizeGb <= 32, 2.40,
    sku == "StandardSSD_LRS" and sizeGb <= 64, 4.80,
    sku == "StandardSSD_LRS" and sizeGb <= 128, 9.60,
    sku == "Standard_LRS" and sizeGb <= 32, 1.54,
    sku == "Standard_LRS" and sizeGb <= 64, 3.01,
    0.0
)
| summarize
    DiskCount = count(),
    TotalSizeGB = sum(sizeGb),
    EstimatedMonthlyCost = sum(estimatedMonthlyCost)
    by sku
| sort by EstimatedMonthlyCost desc
```

Note: These prices are approximate and vary by region. Use this as a directional guide, not a billing estimate.

## Finding Unattached Network Interfaces

Network interfaces that are not attached to any VM are another common orphan:

```kusto
// Find network interfaces not attached to any VM
resources
| where type == "microsoft.network/networkinterfaces"
| where isnull(properties.virtualMachine)
| extend privateIp = tostring(properties.ipConfigurations[0].properties.privateIPAddress)
| extend subnet = tostring(split(properties.ipConfigurations[0].properties.subnet.id, "/")[10])
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| project
    name,
    subscriptionName,
    resourceGroup,
    privateIp,
    subnet,
    tags
| sort by subscriptionName asc
```

## Finding Unassociated Public IP Addresses

Public IPs that are not associated with any resource still incur charges:

```kusto
// Find public IPs not associated with any resource
resources
| where type == "microsoft.network/publicipaddresses"
| where isnull(properties.ipConfiguration) and isnull(properties.natGateway)
| extend ipAddress = tostring(properties.ipAddress)
| extend allocationMethod = tostring(properties.publicIPAllocationMethod)
| extend sku = tostring(sku.name)
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| project
    name,
    subscriptionName,
    resourceGroup,
    ipAddress,
    allocationMethod,
    sku,
    tags
| sort by sku desc
```

Standard SKU public IPs cost money even when unassociated, so these are worth cleaning up quickly.

## Finding Empty Availability Sets

Availability sets with no VMs serve no purpose:

```kusto
// Find availability sets with zero VMs
resources
| where type == "microsoft.compute/availabilitysets"
| where array_length(properties.virtualMachines) == 0
| project name, resourceGroup, subscriptionId, location
```

## Finding Unused Load Balancers

Load balancers without backend pools are not doing anything useful:

```kusto
// Find load balancers with empty backend pools
resources
| where type == "microsoft.network/loadbalancers"
| where array_length(properties.backendAddressPools) == 0
    or properties.backendAddressPools[0].properties.loadBalancerBackendAddresses == "[]"
| project name, resourceGroup, subscriptionId, location, sku = tostring(sku.name)
```

## Finding Unused Network Security Groups

NSGs not associated with any subnet or NIC are likely orphaned:

```kusto
// Find NSGs not associated with any subnet or network interface
resources
| where type == "microsoft.network/networksecuritygroups"
| where isnull(properties.networkInterfaces) or array_length(properties.networkInterfaces) == 0
| where isnull(properties.subnets) or array_length(properties.subnets) == 0
| project name, resourceGroup, subscriptionId, location
```

## Finding Stopped (Deallocated) VMs

VMs that have been stopped (deallocated) for a long time might be candidates for deletion. While deallocated VMs do not incur compute charges, they still consume storage for their disks:

```kusto
// Find deallocated VMs (note: Resource Graph shows resource config, not runtime state)
// This shows VMs that are still provisioned
resources
| where type == "microsoft.compute/virtualmachines"
| extend provisioningState = tostring(properties.provisioningState)
| extend vmSize = tostring(properties.hardwareProfile.vmSize)
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| project name, subscriptionName, resourceGroup, vmSize, provisioningState, tags
```

For actual power state information, you need to combine Resource Graph with the VM instance view, as Resource Graph does not track runtime power state directly.

## Finding Empty Resource Groups

Resource groups with no resources are clutter:

```kusto
// Find resource groups and count their resources
resourcecontainers
| where type == "microsoft.resources/subscriptions/resourcegroups"
| extend rgId = tolower(id)
| join kind=leftouter (
    resources
    | summarize resourceCount = count() by rgId = tolower(strcat("/subscriptions/", subscriptionId, "/resourcegroups/", resourceGroup))
) on rgId
| where isnull(resourceCount) or resourceCount == 0
| project name, subscriptionId, location
| sort by subscriptionId asc
```

## Building a Cleanup Automation

Once you have identified orphaned resources, you can automate the cleanup. Here is a script that deletes unattached disks older than 30 days:

```bash
#!/bin/bash
# Find and delete unattached disks older than 30 days
# CAUTION: Review the list before enabling deletion

THIRTY_DAYS_AGO=$(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ')

# Query for unattached disks older than 30 days
DISKS=$(az graph query -q "
    resources
    | where type == 'microsoft.compute/disks'
    | where properties.diskState == 'Unattached'
    | where properties.timeCreated < datetime('$THIRTY_DAYS_AGO')
    | project id, name, resourceGroup, subscriptionId
" --output json | jq -r '.data[] | "\(.subscriptionId) \(.resourceGroup) \(.name)"')

echo "Unattached disks older than 30 days:"
echo "$DISKS"

# Uncomment the following to actually delete (review first!)
# echo "$DISKS" | while read SUB RG DISK_NAME; do
#     echo "Deleting $DISK_NAME in $RG..."
#     az disk delete --name "$DISK_NAME" --resource-group "$RG" --subscription "$SUB" --yes --no-wait
# done
```

## Scheduling Regular Waste Reports

Set up a recurring report using Azure Automation or a Logic App that runs the key queries weekly and sends the results to your FinOps team:

```powershell
# PowerShell script for Azure Automation runbook
$queries = @{
    "Unattached Disks" = "resources | where type == 'microsoft.compute/disks' | where properties.diskState == 'Unattached' | summarize count(), sum(toint(properties.diskSizeGB))"
    "Orphaned NICs" = "resources | where type == 'microsoft.network/networkinterfaces' | where isnull(properties.virtualMachine) | summarize count()"
    "Unassociated PIPs" = "resources | where type == 'microsoft.network/publicipaddresses' | where isnull(properties.ipConfiguration) | summarize count()"
}

$report = "Weekly Waste Report`n==================`n"

foreach ($item in $queries.GetEnumerator()) {
    $result = Search-AzGraph -Query $item.Value
    $report += "$($item.Key): $($result | ConvertTo-Json -Compress)`n"
}

# Send the report via email or post to Teams
Write-Output $report
```

## Best Practices

**Run these queries weekly.** Waste accumulates fast, especially in environments with active development teams.

**Tag resources with owners.** When you find orphaned resources, tags help you identify who created them and whether they are still needed.

**Implement Azure Policy to prevent waste.** For example, require tags on all resources so you can always trace back to the owner.

**Review before deleting.** Always review the query results before mass deletion. Some "orphaned" resources might be intentionally kept for backup or disaster recovery purposes.

## Summary

Azure Resource Graph is an invaluable tool for finding waste in your Azure environment. The queries in this guide cover the most common types of orphaned resources: unattached disks, orphaned network interfaces, unassociated public IPs, empty availability sets, and unused load balancers. By running these queries regularly and acting on the results, you can keep your Azure environment clean and your costs under control.
