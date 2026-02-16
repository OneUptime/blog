# How to Write Azure Resource Graph Queries to Inventory All Resources in Your Tenant

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Resource Graph, KQL, Resource Inventory, Governance, Cloud Management, Querying

Description: Learn how to write Azure Resource Graph queries using KQL to build a complete inventory of all resources across your Azure tenant for governance and reporting.

---

Knowing what resources exist in your Azure environment seems like it should be simple. But when you have dozens of subscriptions, hundreds of resource groups, and thousands of resources, getting a complete picture requires more than just browsing the portal. Azure Resource Graph lets you query all your resources across all your subscriptions in a single, fast query using Kusto Query Language (KQL).

In this guide, I will teach you how to write Resource Graph queries from scratch, starting with the basics and working up to complex inventory queries that you can use for governance, cost optimization, and compliance reporting.

## What Is Azure Resource Graph?

Azure Resource Graph is a service that provides efficient and performant resource exploration. Unlike the standard Azure Resource Manager (ARM) API, which requires you to query each subscription individually and paginate through results, Resource Graph indexes your resources and lets you query across all subscriptions at once.

Resource Graph queries run against an index that is updated as resources change. The index is near real-time but not perfectly synchronized - there can be a short delay (usually seconds to minutes) between a resource change and the index update.

## Getting Started with Resource Graph Explorer

The easiest way to start writing queries is the Resource Graph Explorer in the Azure Portal. Navigate to it by searching for "Resource Graph Explorer" in the portal search bar.

The explorer provides:
- A query editor with IntelliSense
- A results pane with table and chart views
- Saved queries
- The ability to pin results to dashboards

You can also run queries from the Azure CLI:

```bash
# Run a simple Resource Graph query
az graph query -q "resources | summarize count()" --output table
```

## The Basics: Tables and Columns

Resource Graph has several tables:

- **resources** - All Azure resources (VMs, storage accounts, etc.)
- **resourcecontainers** - Subscriptions, resource groups, management groups
- **advisorresources** - Azure Advisor recommendations
- **securityresources** - Microsoft Defender for Cloud data
- **healthresources** - Resource health events
- **servicehealthresources** - Service health events

The `resources` table is where you will spend most of your time. Each row represents one Azure resource.

Here is a simple query to get started:

```kusto
// Count all resources in your tenant
resources
| summarize count()
```

And here is one that shows you the columns available:

```kusto
// Show the first 10 resources with all their properties
resources
| take 10
```

The key columns in the resources table are:
- `id` - The full resource ID
- `name` - The resource name
- `type` - The resource type (e.g., microsoft.compute/virtualmachines)
- `location` - The Azure region
- `resourceGroup` - The resource group name
- `subscriptionId` - The subscription ID
- `tags` - Resource tags (as a dynamic/JSON object)
- `properties` - Resource-specific properties (dynamic/JSON)

## Building Inventory Queries

Let me walk through progressively more useful inventory queries.

### Count Resources by Type

```kusto
// How many of each resource type do you have?
resources
| summarize ResourceCount = count() by type
| sort by ResourceCount desc
| take 20
```

This gives you a high-level view of your resource distribution. You might be surprised to see how many network interfaces or managed disks you have.

### Count Resources by Subscription

```kusto
// Resource count per subscription with subscription names
resources
| summarize ResourceCount = count() by subscriptionId
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId = subscriptionId, subscriptionName = name
) on subscriptionId
| project subscriptionName, ResourceCount
| sort by ResourceCount desc
```

### Count Resources by Region

```kusto
// Resource distribution across Azure regions
resources
| summarize ResourceCount = count() by location
| sort by ResourceCount desc
```

### Full Virtual Machine Inventory

```kusto
// Detailed VM inventory including size, OS, and power state
resources
| where type == "microsoft.compute/virtualmachines"
| extend vmSize = tostring(properties.hardwareProfile.vmSize)
| extend osType = tostring(properties.storageProfile.osDisk.osType)
| extend osPublisher = tostring(properties.storageProfile.imageReference.publisher)
| extend osSku = tostring(properties.storageProfile.imageReference.sku)
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
    vmSize,
    osType,
    osPublisher,
    osSku,
    tags
| sort by subscriptionName asc, name asc
```

### Storage Account Inventory

```kusto
// Storage account inventory with access tier and replication
resources
| where type == "microsoft.storage/storageaccounts"
| extend accessTier = tostring(properties.accessTier)
| extend replication = tostring(properties.primaryEndpoints)
| extend kind = tostring(kind)
| extend httpsOnly = tostring(properties.supportsHttpsTrafficOnly)
| extend minimumTlsVersion = tostring(properties.minimumTlsVersion)
| project
    name,
    resourceGroup,
    location,
    kind,
    accessTier,
    httpsOnly,
    minimumTlsVersion,
    subscriptionId
| sort by name asc
```

### Network Security Group Rules Inventory

```kusto
// List all NSG rules across the tenant
resources
| where type == "microsoft.network/networksecuritygroups"
| mv-expand rules = properties.securityRules
| extend ruleName = tostring(rules.name)
| extend direction = tostring(rules.properties.direction)
| extend access = tostring(rules.properties.access)
| extend protocol = tostring(rules.properties.protocol)
| extend sourceAddress = tostring(rules.properties.sourceAddressPrefix)
| extend destPort = tostring(rules.properties.destinationPortRange)
| extend priority = toint(rules.properties.priority)
| project
    nsgName = name,
    resourceGroup,
    ruleName,
    direction,
    access,
    protocol,
    sourceAddress,
    destPort,
    priority
| sort by nsgName asc, priority asc
```

## Working with Tags

Tags are one of the most queried properties. Here are useful tag-related queries.

### Find Resources Missing a Required Tag

```kusto
// Find resources missing the 'Environment' tag
resources
| where isnull(tags['Environment']) or tags['Environment'] == ""
| project name, type, resourceGroup, subscriptionId, tags
| sort by type asc
```

### Tag Value Distribution

```kusto
// Distribution of values for the 'Environment' tag
resources
| where isnotnull(tags['Environment'])
| extend environment = tostring(tags['Environment'])
| summarize count() by environment
| sort by count_ desc
```

### Resources with No Tags at All

```kusto
// Resources with zero tags
resources
| where tags == "{}" or isnull(tags)
| summarize count() by type
| sort by count_ desc
```

## Advanced Query Techniques

### Using the Properties Bag

The `properties` column contains resource-specific data as a JSON object. You access nested properties using dot notation:

```kusto
// Find VMs with specific configurations
resources
| where type == "microsoft.compute/virtualmachines"
| extend
    vmSize = tostring(properties.hardwareProfile.vmSize),
    bootDiag = tobool(properties.diagnosticsProfile.bootDiagnostics.enabled)
| where vmSize startswith "Standard_D"
| where bootDiag == false
| project name, vmSize, bootDiag, resourceGroup
```

### Joining Tables

You can join the resources table with resourcecontainers to get subscription and resource group information:

```kusto
// Resources with their subscription and resource group details
resources
| take 100
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/resourcegroups"
    | project rgId = id, rgLocation = location, rgTags = tags
) on $left.id startswith $right.rgId
| project name, type, subscriptionName, resourceGroup, location
```

### Exporting Results

For large inventory reports, export the results to CSV:

```bash
# Export query results to a CSV file
az graph query -q "
    resources
    | project name, type, location, resourceGroup, subscriptionId, tags
    | sort by type asc
" --first 5000 --output tsv > resource-inventory.tsv
```

For more than 1000 results, you need to use pagination:

```bash
# Paginated query for large result sets
SKIP=0
BATCH=1000

while true; do
    RESULT=$(az graph query -q "
        resources
        | project name, type, location, resourceGroup, subscriptionId
        | sort by type asc, name asc
    " --first $BATCH --skip $SKIP --output tsv)

    if [ -z "$RESULT" ]; then
        break
    fi

    echo "$RESULT" >> full-inventory.tsv
    SKIP=$((SKIP + BATCH))
done
```

## Scheduling Regular Inventory Reports

You can automate inventory queries using Azure Automation or Logic Apps. Here is a PowerShell script for Azure Automation:

```powershell
# Azure Automation runbook for weekly inventory report
$query = @"
resources
| summarize count() by type, location
| sort by count_ desc
"@

# Run the Resource Graph query
$results = Search-AzGraph -Query $query -First 1000

# Convert to CSV and send via email or store in a blob
$csv = $results | ConvertTo-Csv -NoTypeInformation
# Store or email the CSV as needed
```

## Best Practices

**Start simple and iterate.** Build your queries incrementally. Start with a basic query and add filters, projections, and joins one at a time.

**Use project to limit columns.** Returning only the columns you need makes queries faster and results more readable.

**Be aware of the 1000-row default limit.** Resource Graph returns at most 1000 rows by default. Use `--first` and `--skip` for larger result sets.

**Save frequently used queries.** The Resource Graph Explorer lets you save queries for reuse and sharing with your team.

**Combine with Azure Workbooks for visualization.** You can use Resource Graph queries as data sources in Azure Workbooks for interactive dashboards.

## Summary

Azure Resource Graph is an essential tool for anyone managing Azure resources at scale. By learning KQL and the Resource Graph schema, you can build comprehensive inventory reports, find misconfigurations, audit tag compliance, and answer governance questions across your entire tenant in seconds. Start with the basic queries in this guide, customize them for your environment, and save them for regular use.
