# How to Use Azure Resource Graph to Audit Tag Compliance Across Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Resource Graph, Tags, Compliance, Governance, FinOps, Cost Management

Description: Learn how to use Azure Resource Graph to audit tag compliance across your Azure organization and identify resources with missing or incorrect tags.

---

Tags are one of the most important governance mechanisms in Azure. They let you categorize resources for cost allocation, identify owners, track environments, and support automation. But tags are only useful if they are consistently applied. In practice, getting to 100% tag compliance is a constant struggle because there are always resources that slip through without the right tags.

Azure Resource Graph gives you the ability to audit tag compliance across your entire Azure estate in seconds. In this post, I will show you how to build comprehensive tag compliance queries, generate reports, and set up ongoing monitoring.

## Defining Your Tagging Strategy

Before you can audit compliance, you need to define what compliance means. A typical enterprise tagging strategy includes some or all of these tags:

| Tag Key | Purpose | Example Values |
|---------|---------|----------------|
| Environment | Identifies the deployment stage | Production, Staging, Development |
| Owner | Who is responsible for this resource | team-name or email |
| CostCenter | Financial allocation | CC-1234 |
| Application | Which application this belongs to | order-service, web-portal |
| Department | Business unit | Engineering, Marketing |
| CreatedBy | Who created the resource | john@company.com |
| ExpirationDate | When this resource can be deleted | 2026-06-01 |

Not all tags need to be required on all resources. You might require Environment and Owner on everything but only require CostCenter on production resources.

## Basic Tag Compliance Queries

Let me start with the fundamental queries and build up to more sophisticated ones.

### Resources Missing a Specific Tag

```kusto
// Find all resources missing the 'Environment' tag
resources
| where isnull(tags['Environment']) or tostring(tags['Environment']) == ""
| summarize MissingCount = count() by type
| sort by MissingCount desc
| take 20
```

### Resources Missing Any Required Tags

```kusto
// Check multiple required tags at once
resources
| extend
    hasEnvironment = isnotnull(tags['Environment']),
    hasOwner = isnotnull(tags['Owner']),
    hasCostCenter = isnotnull(tags['CostCenter']),
    hasApplication = isnotnull(tags['Application'])
| extend missingTags = strcat(
    iff(not(hasEnvironment), "Environment ", ""),
    iff(not(hasOwner), "Owner ", ""),
    iff(not(hasCostCenter), "CostCenter ", ""),
    iff(not(hasApplication), "Application ", "")
)
| where missingTags != ""
| project name, type, resourceGroup, subscriptionId, missingTags
| sort by type asc
```

### Overall Tag Compliance Percentage

```kusto
// Calculate overall compliance percentage for each required tag
resources
| summarize
    Total = count(),
    WithEnvironment = countif(isnotnull(tags['Environment'])),
    WithOwner = countif(isnotnull(tags['Owner'])),
    WithCostCenter = countif(isnotnull(tags['CostCenter'])),
    WithApplication = countif(isnotnull(tags['Application']))
| extend
    EnvironmentPct = round(100.0 * WithEnvironment / Total, 1),
    OwnerPct = round(100.0 * WithOwner / Total, 1),
    CostCenterPct = round(100.0 * WithCostCenter / Total, 1),
    ApplicationPct = round(100.0 * WithApplication / Total, 1)
| project Total, EnvironmentPct, OwnerPct, CostCenterPct, ApplicationPct
```

## Per-Subscription Compliance

Compliance often varies dramatically between subscriptions. The production subscription might be well-tagged while the dev subscription is a mess.

```kusto
// Tag compliance broken down by subscription
resources
| join kind=leftouter (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| summarize
    Total = count(),
    WithEnvironment = countif(isnotnull(tags['Environment'])),
    WithOwner = countif(isnotnull(tags['Owner']))
    by subscriptionName
| extend
    EnvironmentPct = round(100.0 * WithEnvironment / Total, 1),
    OwnerPct = round(100.0 * WithOwner / Total, 1)
| project subscriptionName, Total, EnvironmentPct, OwnerPct
| sort by EnvironmentPct asc
```

## Per-Resource-Type Compliance

Some resource types tend to have worse tag compliance than others. Child resources (like disks and NICs) are often created implicitly and miss out on tags.

```kusto
// Tag compliance by resource type
resources
| summarize
    Total = count(),
    Tagged = countif(isnotnull(tags['Environment']))
    by type
| extend CompliancePct = round(100.0 * Tagged / Total, 1)
| where Total > 5
| sort by CompliancePct asc
| take 20
```

## Validating Tag Values

Having a tag is not enough - it also needs to have a valid value. Here are queries to check tag value correctness.

### Find Invalid Environment Tag Values

```kusto
// Find resources with non-standard Environment tag values
let validEnvironments = dynamic(["Production", "Staging", "Development", "Testing", "Sandbox"]);
resources
| where isnotnull(tags['Environment'])
| extend environment = tostring(tags['Environment'])
| where environment !in (validEnvironments)
| summarize count() by environment
| sort by count_ desc
```

### Find Case-Inconsistent Tag Values

```kusto
// Find case variations of the Environment tag
resources
| where isnotnull(tags['Environment'])
| extend environment = tostring(tags['Environment'])
| summarize count() by environment
| sort by count_ desc
```

This might reveal values like "production", "Production", "PRODUCTION", and "prod" all being used for the same thing.

### Check for Common Tag Key Misspellings

```kusto
// Find tags that look like misspellings of common tag keys
resources
| mv-expand tagKey = bag_keys(tags)
| extend tagKeyStr = tostring(tagKey)
| where tagKeyStr matches regex "(?i)(enviro|environm|env[^i])" and tagKeyStr != "Environment"
| summarize count() by tagKeyStr
```

## Building a Compliance Dashboard

You can pin Resource Graph queries to Azure dashboards for ongoing visibility. Here is a comprehensive query designed for dashboard display:

```kusto
// Dashboard-ready compliance summary
resources
| summarize
    TotalResources = count(),
    FullyCompliant = countif(
        isnotnull(tags['Environment']) and
        isnotnull(tags['Owner']) and
        isnotnull(tags['CostCenter'])
    ),
    MissingEnvironment = countif(isnull(tags['Environment'])),
    MissingOwner = countif(isnull(tags['Owner'])),
    MissingCostCenter = countif(isnull(tags['CostCenter'])),
    NoTagsAtAll = countif(tags == "{}" or isnull(tags))
| extend ComplianceRate = round(100.0 * FullyCompliant / TotalResources, 1)
```

## Tracking Compliance Over Time

Resource Graph does not store historical compliance data, so you need to capture snapshots yourself. Here is a PowerShell script that saves daily compliance data:

```powershell
# Daily compliance snapshot script for Azure Automation
$date = Get-Date -Format "yyyy-MM-dd"

$complianceQuery = @"
resources
| summarize
    Total = count(),
    WithEnvironment = countif(isnotnull(tags['Environment'])),
    WithOwner = countif(isnotnull(tags['Owner'])),
    WithCostCenter = countif(isnotnull(tags['CostCenter']))
"@

$result = Search-AzGraph -Query $complianceQuery

# Create a record with the date
$snapshot = [PSCustomObject]@{
    Date = $date
    TotalResources = $result.Total
    EnvironmentTagged = $result.WithEnvironment
    OwnerTagged = $result.WithOwner
    CostCenterTagged = $result.WithCostCenter
    EnvironmentPct = [math]::Round(100 * $result.WithEnvironment / $result.Total, 1)
    OwnerPct = [math]::Round(100 * $result.WithOwner / $result.Total, 1)
    CostCenterPct = [math]::Round(100 * $result.WithCostCenter / $result.Total, 1)
}

# Store in a Log Analytics workspace or storage account
$json = $snapshot | ConvertTo-Json
Write-Output $json
# Add code to send to Log Analytics custom table or blob storage
```

## Automating Tag Remediation

For resources that should be tagged but are not, you can build automated remediation:

```bash
#!/bin/bash
# Tag resources that are missing the Environment tag based on their resource group

# Find resources missing the Environment tag
RESOURCES=$(az graph query -q "
    resources
    | where isnull(tags['Environment'])
    | project id, resourceGroup
    | take 100
" --output json | jq -r '.data[] | "\(.id)|\(.resourceGroup)"')

echo "$RESOURCES" | while IFS='|' read -r RESOURCE_ID RG; do
    if [ -z "$RESOURCE_ID" ]; then continue; fi

    # Try to inherit the Environment tag from the resource group
    RG_ENV=$(az tag list --resource-id "/subscriptions/.../resourceGroups/$RG" \
        --query "properties.tags.Environment" --output tsv 2>/dev/null)

    if [ -n "$RG_ENV" ]; then
        echo "Tagging resource with Environment=$RG_ENV: $RESOURCE_ID"
        az tag update --resource-id "$RESOURCE_ID" \
            --operation merge \
            --tags "Environment=$RG_ENV"
    fi
done
```

## Using Azure Policy for Tag Enforcement

While Resource Graph is great for auditing, Azure Policy is what you use for enforcement. Here are the key policies for tag governance:

```bash
# Require a tag on resources
az policy assignment create \
    --name "require-environment-tag" \
    --display-name "Require Environment tag" \
    --policy "871b6d14-10aa-478d-b466-ef391786494f" \
    --scope "/subscriptions/your-sub-id" \
    --params '{"tagName": {"value": "Environment"}}'

# Inherit a tag from the resource group if missing
az policy assignment create \
    --name "inherit-environment-from-rg" \
    --display-name "Inherit Environment tag from resource group" \
    --policy "cd3aa116-8754-49c9-a813-ad46512ece54" \
    --scope "/subscriptions/your-sub-id" \
    --params '{"tagName": {"value": "Environment"}}' \
    --mi-system-assigned \
    --location "eastus"
```

## Generating Compliance Reports for Stakeholders

For a report that you can share with management, combine multiple queries:

```powershell
# Generate a comprehensive tag compliance report
$report = @{}

# Overall compliance
$report["Overall"] = Search-AzGraph -Query @"
resources
| summarize
    Total = count(),
    FullyCompliant = countif(
        isnotnull(tags['Environment']) and
        isnotnull(tags['Owner']) and
        isnotnull(tags['CostCenter']))
| extend ComplianceRate = round(100.0 * FullyCompliant / Total, 1)
"@

# Per-subscription compliance
$report["BySubscription"] = Search-AzGraph -Query @"
resources
| join kind=leftouter (
    resourcecontainers | where type == 'microsoft.resources/subscriptions'
    | project subscriptionId, subscriptionName = name
) on subscriptionId
| summarize
    Total = count(),
    Compliant = countif(isnotnull(tags['Environment']) and isnotnull(tags['Owner']))
    by subscriptionName
| extend Rate = round(100.0 * Compliant / Total, 1)
| sort by Rate asc
"@

# Worst offending resource types
$report["ByType"] = Search-AzGraph -Query @"
resources
| where isnull(tags['Environment'])
| summarize NonCompliant = count() by type
| sort by NonCompliant desc
| take 10
"@

# Output the report
$report | ConvertTo-Json -Depth 5
```

## Best Practices

**Define your required tags clearly and document them.** Everyone in the organization should know which tags are required and what values are acceptable.

**Audit before enforcing.** Run audit queries to understand your current state before turning on deny policies. A sudden enforcement without warning will frustrate teams.

**Automate tag inheritance.** Use Azure Policy to inherit tags from resource groups. This catches most resources that would otherwise be untagged.

**Review compliance weekly.** Tag compliance degrades over time as new resources are created. Regular review keeps it in check.

**Focus on high-value resources first.** Not every resource type needs to be tagged. Focus on the resources that drive cost and operational complexity.

## Summary

Azure Resource Graph makes tag compliance auditing fast and comprehensive. By combining the queries in this guide with regular reporting and Azure Policy enforcement, you can achieve and maintain high tag compliance across your organization. The key is treating tag governance as an ongoing process, not a one-time project - regular auditing with Resource Graph, enforcement with Azure Policy, and automated remediation for the gaps.
