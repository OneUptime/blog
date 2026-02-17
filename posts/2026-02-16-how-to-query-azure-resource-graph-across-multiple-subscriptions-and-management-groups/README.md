# How to Query Azure Resource Graph Across Multiple Subscriptions and Management Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Resource Graph, KQL, Management Groups, Subscriptions, Cross-Subscription, Governance

Description: Learn how to query Azure Resource Graph across multiple subscriptions and management groups for comprehensive tenant-wide resource visibility.

---

One of the biggest advantages of Azure Resource Graph over the standard ARM APIs is its ability to query across multiple subscriptions in a single call. But the default behavior and scoping rules can be confusing, especially when management groups are involved. In this post, I will clarify how Resource Graph scoping works and show you how to write queries that cover exactly the subscriptions you need.

## How Resource Graph Scoping Works

By default, when you run a Resource Graph query, it runs against all subscriptions that the calling identity has read access to. This means if your account has Reader role on 50 subscriptions, your query will search across all 50 automatically.

This default behavior is convenient but not always what you want. Sometimes you need to query a specific set of subscriptions, or you need to scope your query to a management group hierarchy.

## Querying Specific Subscriptions

### Using Azure CLI

The `--subscriptions` parameter lets you specify which subscriptions to query:

```bash
# Query specific subscriptions by ID
az graph query -q "resources | summarize count() by type | top 10 by count_" \
    --subscriptions "sub-id-1" "sub-id-2" "sub-id-3" \
    --output table

# Query a single subscription
az graph query -q "resources | where type == 'microsoft.compute/virtualmachines' | project name, location" \
    --subscriptions "your-subscription-id" \
    --output table
```

### Using PowerShell

```powershell
# Query specific subscriptions
$subscriptions = @(
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
)

$results = Search-AzGraph -Query "resources | summarize count() by type" `
    -Subscription $subscriptions

$results | Format-Table
```

### Using the REST API

```bash
# Query specific subscriptions via the REST API
az rest --method post \
    --url "https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2022-10-01" \
    --body '{
        "query": "resources | summarize count() by type | top 10 by count_",
        "subscriptions": [
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222"
        ]
    }'
```

## Querying by Management Group

Management groups provide a hierarchical structure for organizing subscriptions. You can scope Resource Graph queries to a management group, which automatically includes all subscriptions under that group and its child groups.

### Using Azure CLI

```bash
# Query all subscriptions under a management group
az graph query -q "resources | summarize count() by type | top 10 by count_" \
    --management-groups "my-management-group-id" \
    --output table
```

### Using PowerShell

```powershell
# Query scoped to a management group
$results = Search-AzGraph -Query "resources | summarize count()" `
    -ManagementGroup "production-mg"

$results | Format-Table
```

### Querying the Root Management Group

To query your entire tenant, you can scope to the root management group. The root management group ID is your tenant ID:

```bash
# Query the entire tenant through the root management group
az graph query -q "resources | summarize count()" \
    --management-groups "your-tenant-id" \
    --output table
```

Note that this only works if you have the necessary permissions at the root management group level. By default, Global Administrators can elevate access to the root management group.

## Including Subscription Information in Results

When querying across multiple subscriptions, it is essential to include subscription context in your results so you know which subscription each resource belongs to:

```kusto
// Include subscription names in query results
resources
| where type == "microsoft.compute/virtualmachines"
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| project name, subscriptionName, resourceGroup, location
| sort by subscriptionName asc, name asc
```

## Including Management Group Information

You can also include management group hierarchy information in your queries:

```kusto
// Show resources with their management group hierarchy
resourcecontainers
| where type == "microsoft.resources/subscriptions"
| extend managementGroupChain = properties.managementGroupAncestorsChain
| mv-expand mgChain = managementGroupChain
| extend mgName = tostring(mgChain.displayName)
| extend mgId = tostring(mgChain.name)
| project subscriptionName = name, subscriptionId, mgName, mgId
```

This query shows you which management group each subscription belongs to, including the full ancestor chain.

## Cross-Subscription Comparison Queries

Resource Graph is great for comparing resource configurations across subscriptions. Here are some practical examples.

### Compare VM Sizes Across Subscriptions

```kusto
// VM size distribution per subscription
resources
| where type == "microsoft.compute/virtualmachines"
| extend vmSize = tostring(properties.hardwareProfile.vmSize)
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| summarize VMCount = count() by subscriptionName, vmSize
| sort by subscriptionName asc, VMCount desc
```

### Find Resources That Exist in One Subscription but Not Another

```kusto
// Find resource types in production that are missing from DR
let prodResources = resources
| where subscriptionId == "production-sub-id"
| distinct type;
let drResources = resources
| where subscriptionId == "dr-sub-id"
| distinct type;
prodResources
| join kind=leftanti drResources on type
| project MissingInDR = type
```

### Compare Tag Compliance Across Subscriptions

```kusto
// Tag compliance comparison across subscriptions
resources
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| extend hasEnvironmentTag = isnotnull(tags['Environment'])
| extend hasOwnerTag = isnotnull(tags['Owner'])
| extend hasCostCenterTag = isnotnull(tags['CostCenter'])
| summarize
    TotalResources = count(),
    WithEnvironment = countif(hasEnvironmentTag),
    WithOwner = countif(hasOwnerTag),
    WithCostCenter = countif(hasCostCenterTag)
    by subscriptionName
| extend EnvironmentCompliance = round(100.0 * WithEnvironment / TotalResources, 1)
| extend OwnerCompliance = round(100.0 * WithOwner / TotalResources, 1)
| extend CostCenterCompliance = round(100.0 * WithCostCenter / TotalResources, 1)
| project subscriptionName, TotalResources, EnvironmentCompliance, OwnerCompliance, CostCenterCompliance
| sort by EnvironmentCompliance asc
```

## Handling Large Result Sets

Resource Graph has a default limit of 1000 rows per query. For cross-subscription queries that return more results, you need to use pagination.

### CLI Pagination

```bash
# Fetch results in batches of 1000
SKIP=0
BATCH=1000
TOTAL=0

while true; do
    RESULT=$(az graph query -q "
        resources
        | project name, type, subscriptionId, resourceGroup
        | order by type asc, name asc
    " --first $BATCH --skip $SKIP --output tsv 2>/dev/null)

    # Check if we got any results
    LINES=$(echo "$RESULT" | wc -l | tr -d ' ')
    if [ "$LINES" -le 1 ] && [ -z "$RESULT" ]; then
        break
    fi

    echo "$RESULT" >> all-resources.tsv
    TOTAL=$((TOTAL + LINES))
    SKIP=$((SKIP + BATCH))

    echo "Fetched $TOTAL resources so far..."
done

echo "Total resources: $TOTAL"
```

### PowerShell Pagination

```powershell
# Paginated query in PowerShell
$allResults = @()
$batchSize = 1000
$skip = 0

do {
    $batch = Search-AzGraph -Query @"
        resources
        | project name, type, subscriptionId, resourceGroup
        | order by type asc, name asc
"@ -First $batchSize -Skip $skip

    $allResults += $batch
    $skip += $batchSize
    Write-Output "Fetched $($allResults.Count) resources..."

} while ($batch.Count -eq $batchSize)

Write-Output "Total: $($allResults.Count) resources"
$allResults | Export-Csv "all-resources.csv" -NoTypeInformation
```

## Performance Considerations

Resource Graph queries are fast, but there are some things to keep in mind when querying at scale:

**Throttling.** Resource Graph has rate limits. For programmatic queries, implement retry logic with exponential backoff. The limits are generous (15 queries per 5 seconds per tenant for CLI, 5 queries per 5 seconds per tenant for REST API), but batch operations can hit them.

**Query complexity.** Joins, aggregations, and mv-expand operations add processing time. For complex queries across many subscriptions, consider breaking them into smaller scoped queries.

**Result set size.** The maximum result set per query is 1000 rows. Plan your pagination strategy accordingly.

```bash
# Example with retry logic
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    RESULT=$(az graph query -q "resources | summarize count()" --output tsv 2>&1)
    if [ $? -eq 0 ]; then
        echo "$RESULT"
        break
    fi
    echo "Query throttled, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    RETRY_DELAY=$((RETRY_DELAY * 2))
done
```

## Using the ResourceContainers Table

The `resourcecontainers` table is essential for cross-subscription queries. It contains three types of entries:

```kusto
// List all management groups
resourcecontainers
| where type == "microsoft.management/managementgroups"
| project name, id, properties

// List all subscriptions with their state
resourcecontainers
| where type == "microsoft.resources/subscriptions"
| extend state = tostring(properties.state)
| project name, subscriptionId, state

// List all resource groups across subscriptions
resourcecontainers
| where type == "microsoft.resources/subscriptions/resourcegroups"
| project name, subscriptionId, location, tags
```

## Practical Governance Query: Subscription Inventory

Here is a comprehensive query that gives you a full subscription inventory with resource counts and management group placement:

```kusto
// Comprehensive subscription inventory
resourcecontainers
| where type == "microsoft.resources/subscriptions"
| extend state = tostring(properties.state)
| extend mgChain = properties.managementGroupAncestorsChain
| extend directMG = tostring(mgChain[0].displayName)
| project subscriptionName = name, subscriptionId, state, directMG
| join kind=leftouter (
    resources
    | summarize resourceCount = count() by subscriptionId
) on subscriptionId
| project subscriptionName, subscriptionId, state, directMG,
    resourceCount = coalesce(resourceCount, 0)
| sort by directMG asc, subscriptionName asc
```

## Summary

Azure Resource Graph's cross-subscription and management group querying capabilities make it the go-to tool for tenant-wide resource visibility. By understanding how scoping works, using management groups for hierarchical queries, and implementing proper pagination for large result sets, you can build comprehensive governance, compliance, and inventory reports that cover your entire Azure footprint. The queries in this guide give you a solid foundation to build on for your specific organizational needs.
