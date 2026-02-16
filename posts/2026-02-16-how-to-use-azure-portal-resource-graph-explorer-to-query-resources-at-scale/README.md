# How to Use Azure Portal Resource Graph Explorer to Query Resources at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Resource Graph, KQL, Azure Portal, Cloud Management, Governance, Query

Description: Learn how to use Azure Resource Graph Explorer to query and analyze Azure resources across subscriptions at scale using Kusto Query Language.

---

When you have a handful of resources in a single subscription, the Azure portal's standard resource list works fine. But when you manage hundreds of subscriptions with thousands of resources, scrolling through the portal becomes impractical. Azure Resource Graph solves this problem by letting you query all your resources across subscriptions using Kusto Query Language (KQL). Queries run against an indexed data store, so results come back in seconds even at massive scale.

This post covers how to use Resource Graph Explorer effectively, with practical query examples you can use right away.

## What is Azure Resource Graph

Azure Resource Graph is a service that maintains an index of all your Azure resources. Unlike ARM API calls that query each resource provider individually (which is slow and subject to throttling), Resource Graph queries run against a pre-built index. This makes it possible to:

- Query resources across all your subscriptions in a single query
- Get results in seconds regardless of how many resources you have
- Join resource data with policy compliance data
- Filter, sort, and aggregate results using KQL

You can access Resource Graph through the Azure portal (Resource Graph Explorer), Azure CLI (`az graph query`), PowerShell (`Search-AzGraph`), or the REST API.

## Getting Started with Resource Graph Explorer

Open the Azure portal and search for "Resource Graph Explorer." You will see a query editor with a results pane below it.

The default scope is all subscriptions your account has access to. You can narrow the scope using the subscription picker at the top if needed.

Let us start with some basic queries.

### List All Resources

The simplest possible query returns all resources:

```kql
Resources
| project name, type, location, resourceGroup, subscriptionId
| order by name asc
```

This is not very useful by itself, but it shows the basic structure. The `Resources` table contains all ARM resources. Use `project` to select columns and `order by` to sort.

### Count Resources by Type

Get a quick inventory of what you have:

```kql
Resources
| summarize count() by type
| order by count_ desc
```

This returns a table showing how many of each resource type you have across all subscriptions. Useful for cost analysis and governance.

### Find Resources by Tag

Tags are essential for governance, but finding untagged or mistagged resources is a pain without Resource Graph.

```kql
// Find all resources missing the 'Environment' tag
Resources
| where isnull(tags['Environment'])
| project name, type, resourceGroup, subscriptionId
| order by type asc
```

```kql
// Find all production resources across all subscriptions
Resources
| where tags['Environment'] =~ 'production'
| project name, type, resourceGroup, subscriptionId, location
| order by type asc
```

The `=~` operator performs case-insensitive comparison, which is useful since tag values are often inconsistently cased.

### Find Virtual Machines by Size

```kql
// List all VMs grouped by size to understand your compute footprint
Resources
| where type == 'microsoft.compute/virtualmachines'
| extend vmSize = properties.hardwareProfile.vmSize
| summarize count() by tostring(vmSize)
| order by count_ desc
```

### Find Public IP Addresses

Security teams often want to know about public-facing resources:

```kql
// Find all resources with public IP addresses
Resources
| where type == 'microsoft.network/publicipaddresses'
| extend ipAddress = properties.ipAddress
| extend associatedResource = properties.ipConfiguration.id
| project name, tostring(ipAddress), tostring(associatedResource), resourceGroup, subscriptionId
```

## Advanced Query Techniques

### Joining Tables

Resource Graph has several tables beyond `Resources`. The `ResourceContainers` table has subscription and resource group information. You can join them to enrich your results.

```kql
// List resources with their subscription names instead of just IDs
Resources
| join kind=leftouter (
    ResourceContainers
    | where type == 'microsoft.resources/subscriptions'
    | project subscriptionId, subscriptionName=name
) on subscriptionId
| project name, type, resourceGroup, subscriptionName
| order by subscriptionName asc, type asc
```

### Querying Resource Properties

Resource properties are stored as dynamic (JSON) fields. You can drill into them using dot notation or bracket notation.

```kql
// Find SQL databases and their pricing tiers
Resources
| where type == 'microsoft.sql/servers/databases'
| extend sku_name = sku.name
| extend sku_tier = sku.tier
| project name, tostring(sku_name), tostring(sku_tier), resourceGroup
| order by sku_tier asc
```

```kql
// Find storage accounts not using HTTPS-only
Resources
| where type == 'microsoft.storage/storageaccounts'
| where properties.supportsHttpsTrafficOnly == false
| project name, resourceGroup, subscriptionId
```

### Working with Policy Compliance Data

The `PolicyResources` table contains compliance data from Azure Policy. This lets you query which resources are non-compliant.

```kql
// Find non-compliant resources and the policies they violate
PolicyResources
| where type == 'microsoft.policyinsights/policystates'
| where properties.complianceState == 'NonCompliant'
| extend policyName = tostring(properties.policyDefinitionName)
| extend resourceId = tostring(properties.resourceId)
| summarize count() by policyName
| order by count_ desc
```

### Network Analysis

Resource Graph is great for understanding your network topology:

```kql
// Find all NSG rules that allow traffic from the internet
Resources
| where type == 'microsoft.network/networksecuritygroups'
| mv-expand rules = properties.securityRules
| where rules.properties.access == 'Allow'
    and rules.properties.direction == 'Inbound'
    and rules.properties.sourceAddressPrefix == '*'
| project nsgName=name,
    ruleName=tostring(rules.name),
    destinationPort=tostring(rules.properties.destinationPortRange),
    resourceGroup
```

This query is valuable for security audits. It finds NSG rules that allow inbound traffic from any source, which might indicate overly permissive network configurations.

## Using Resource Graph from the Command Line

You can run the same queries from Azure CLI or PowerShell, which is useful for scripting and automation.

```bash
# Run a Resource Graph query from Azure CLI
az graph query -q "
Resources
| where type == 'microsoft.compute/virtualmachines'
| summarize count() by tostring(properties.hardwareProfile.vmSize)
| order by count_ desc
" --output table
```

```powershell
# Run from PowerShell (requires Az.ResourceGraph module)
Search-AzGraph -Query @"
Resources
| where type == 'microsoft.compute/virtualmachines'
| where properties.storageProfile.osDisk.osType == 'Linux'
| project name, resourceGroup, location
"@
```

## Pagination for Large Result Sets

Resource Graph returns a maximum of 1,000 rows per query by default. For larger result sets, use the `$top` and `$skip` parameters.

```bash
# Get the first 1000 results
az graph query -q "Resources | project name, type" --first 1000

# Get the next 1000 results
az graph query -q "Resources | project name, type" --first 1000 --skip 1000
```

In the portal, Resource Graph Explorer handles pagination automatically with a "Load more" button.

## Creating and Saving Queries

Resource Graph Explorer lets you save queries for reuse. Click "Save" and give your query a name and description. Saved queries appear in the left panel under "My queries."

You can also share queries with your team by saving them as shared queries, which are stored as Azure resources in a resource group. This makes them visible to anyone with access to that resource group.

## Building Dashboards

One of the most powerful features is pinning query results to Azure dashboards. After running a query, click "Pin to dashboard" to create a live chart or table on your dashboard. The dashboard tile refreshes automatically, giving you an always-current view of your resource inventory.

Some useful dashboard tiles:

- Resource count by type (bar chart)
- Resources by location (map)
- Non-compliant resources by policy (table)
- Untagged resources count (number tile)

## Performance Tips

Resource Graph is fast, but you can make it faster:

- Use `project` early in your query to reduce the columns processed
- Filter with `where` as early as possible to reduce rows
- Avoid `mv-expand` on large arrays when you can filter first
- Use `summarize` to aggregate data on the server side rather than downloading all rows and aggregating locally

## Limitations to Be Aware Of

Resource Graph has some constraints:

- Data freshness is typically within a few minutes, but it is not real-time. Resource changes may take up to 5 minutes to appear in the index.
- Not all resource properties are indexed. Some deeply nested or rarely used properties may not be queryable.
- Cross-tenant queries require Azure Lighthouse or multi-tenant app registrations.
- The maximum query result size is 5 MB, regardless of pagination.

Resource Graph Explorer is one of those tools that becomes indispensable once you start using it. For anyone managing Azure resources beyond a trivial scale, it replaces hours of portal clicking and API scripting with quick, repeatable queries.
