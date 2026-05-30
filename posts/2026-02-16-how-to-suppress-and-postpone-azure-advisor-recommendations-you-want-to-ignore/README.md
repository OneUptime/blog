# How to Suppress and Postpone Azure Advisor Recommendations You Want to Ignore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Advisor, Recommendation Management, Cloud Governance, Azure Administration, Noise Reduction, Best Practice

Description: Learn how to dismiss, postpone, and suppress Azure Advisor recommendations that are not applicable to your environment to reduce noise and focus on what matters.

---

Azure Advisor means well, but not every recommendation applies to every environment. Maybe it tells you to enable zone redundancy on a dev server that gets rebuilt every morning. Maybe it recommends reserved instances for workloads you plan to decommission next quarter. Maybe it flags a storage account as having public access when that is intentional because it hosts a static website. If you leave these irrelevant recommendations sitting in Advisor, they clutter the view and make it harder to spot the ones that actually matter.

Advisor provides several mechanisms to handle recommendations you want to ignore: dismissing, postponing, and configuring Advisor to exclude subscriptions or resource groups from recommendation generation. This post covers all of them, including how to use them through the portal, CLI, and automation.

## Types of Recommendation Management

There are three main ways to handle recommendations you want to ignore:

1. **Dismiss** - Mark a recommendation as not applicable. It disappears from the active list but can be viewed in dismissed recommendations. You should provide a reason.

2. **Postpone** - Snooze a recommendation for a specific period (1 day, 7 days, 30 days, or 90 days). It reappears after the snooze period.

3. **Exclude** (via Advisor configuration) - Exclude a subscription or resource group from Advisor recommendation generation.

## Dismissing a Recommendation in the Portal

1. Go to **Azure Advisor** in the portal.
2. Navigate to the recommendation you want to dismiss.
3. Click on the recommendation to see its details.
4. Click the **Dismiss** button.
5. If prompted, confirm the dismissal.

The recommendation moves to the dismissed list and no longer affects your Advisor score after the next score refresh.

## Postponing a Recommendation in the Portal

Postponing is useful when a recommendation is valid but the timing is wrong - maybe you are in a code freeze, or the fix is scheduled for next sprint.

1. Open the recommendation in Advisor.
2. Click **Postpone**.
3. Select a snooze duration:
   - 1 day
   - 7 days
   - 30 days
   - 90 days
4. Click **Postpone**.

The recommendation disappears from the active view until the snooze period ends, at which point it reappears automatically.

## Managing Recommendations via Azure CLI

For bulk operations, the CLI is more practical than clicking through the portal for each recommendation.

```bash
# List all active recommendations

az advisor recommendation list \
  --query "[].{Id:id, Name:name, Category:category, Impact:impact, Problem:shortDescription.problem}" \
  -o table

# Dismiss a specific recommendation by ID
az advisor recommendation disable \
  --ids "<recommendation-resource-id>"
```

To find the recommendation resource ID, list recommendations and note the `id` field. The `name` field contains the recommendation GUID.

## Managing via Azure Resource Graph

For querying and managing recommendations across subscriptions, Resource Graph is the most scalable approach.

```bash
# Find all recommendations for a specific resource that you might want to dismiss
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | where properties.resourceMetadata.resourceId contains 'dev-'
  | project
      RecommendationId = name,
      Category = tostring(properties.category),
      Problem = tostring(properties.shortDescription.problem),
      Resource = tostring(properties.resourceMetadata.resourceId)
" -o table
```

## Bulk Dismissal with PowerShell

For dismissing multiple recommendations at once - for example, all cost recommendations for dev resources - use PowerShell.

```powershell
# Dismiss all cost recommendations for resources in the dev resource group
$recommendations = Search-AzGraph -Query @"
advisorresources
| where type == 'microsoft.advisor/recommendations'
| where properties.category == 'Cost'
| where resourceGroup == 'rg-dev'
| project id, name
"@

foreach ($rec in $recommendations) {
    # Suppress the recommendation using the REST API
    $uri = "https://management.azure.com$($rec.id)/suppressions/dev-suppression?api-version=2023-01-01"
    $body = @{
        properties = @{
            suppressionId = [guid]::NewGuid().ToString()
            ttl = "30.00:00:00"  # Suppress for 30 days
        }
    } | ConvertTo-Json

    Invoke-AzRestMethod -Method PUT -Uri $uri -Payload $body
    Write-Host "Suppressed: $($rec.name)"
}
```

## Configuring Advisor Exclusions

If certain subscriptions or resource groups should not be evaluated by Advisor, you can exclude them from recommendation generation. This is different from dismissing individual recommendations - it prevents Advisor recommendations from being generated for the excluded scope.

1. Go to **Azure Advisor** in the portal.
2. Click **Configuration** in the left menu.
3. Select the subscription.
4. Use the **Resources** tab to include or exclude subscriptions and resource groups.
5. Use the **VM/Virtual Machine Scale Sets right sizing** tab to adjust the average CPU utilization threshold for VM right-sizing recommendations.
6. Adjust the settings as needed.
7. Click **Apply**.

For the CLI:

```bash
# Configure Advisor settings for a subscription
# This changes the CPU threshold for VM right-sizing recommendations
az advisor configuration update \
  --configuration-name "default" \
  --low-cpu-threshold 10

# Exclude a resource group from Advisor recommendation generation
az advisor configuration update \
  --resource-group "rg-dev" \
  --exclude
```

## Using Suppressions via the REST API

The Advisor REST API provides the most granular control over suppressions. A suppression is applied to a specific recommendation for a specific resource.

```bash
# Create a suppression using the REST API directly
# This suppresses a specific recommendation for 90 days
curl -X PUT \
  "https://management.azure.com/<resource-id>/providers/Microsoft.Advisor/recommendations/<rec-id>/suppressions/my-suppression?api-version=2023-01-01" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "suppressionId": "00000000-0000-0000-0000-000000000000",
      "ttl": "90.00:00:00"
    }
  }'
```

The `ttl` field accepts a timespan format.

## Viewing Dismissed and Postponed Recommendations

To see recommendations you have previously dismissed or postponed:

1. In Azure Advisor, look for the **Dismissed** or **Postponed** filter options.
2. Toggle the filter to show dismissed recommendations.

This is useful during periodic reviews when you want to check if any dismissed recommendations should be reconsidered.

```bash
# List dismissed/suppressed recommendations via Resource Graph
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/suppressions'
  | project
      SuppressionName = name,
      SuppressionId = tostring(properties.suppressionId),
      TTL = tostring(properties.ttl),
      ExpirationStamp = tostring(properties.expirationTimeStamp)
" -o table
```

## Best Practices for Managing Recommendations

### Document Your Decisions

When you dismiss a recommendation, always provide a reason. Six months from now, when someone else reviews the Advisor data, they need to understand why the recommendation was dismissed. "Not applicable because this is a dev environment with auto-delete enabled" is much better than just "N/A".

### Use Postpone for Timing Issues

If the recommendation is valid but you cannot act on it right now, postpone rather than dismiss. This keeps it on the radar. Common scenarios:

- You are in a maintenance window freeze.
- The recommendation requires budget approval.
- A dependent change needs to happen first.

### Review Dismissed Recommendations Quarterly

Circumstances change. A recommendation you dismissed because the workload was temporary might become relevant if the workload is now permanent. Set a quarterly reminder to review dismissed recommendations.

### Standardize Across the Organization

If you manage multiple subscriptions or teams, establish a policy for when to dismiss vs postpone vs suppress. For example:

- **Dismiss**: Only for recommendations that are permanently irrelevant (wrong resource type, intentional configuration).
- **Postpone**: For recommendations that are valid but need to be scheduled.
- **Exclude with Advisor configuration**: For subscriptions or resource groups, such as test environments, that should not be evaluated by Advisor.

### Automate for Ephemeral Environments

Dev and test environments often generate a lot of noise in Advisor. If you spin up and tear down environments frequently, consider automating the dismissal of certain recommendation types for resources in specific resource groups.

```bash
# Automation script to dismiss cost recommendations for resources in the dev resource group
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | where properties.category == 'Cost'
  | where properties.resourceMetadata.resourceId contains '/resourceGroups/rg-dev/'
  | project id
" --first 500 -o json | jq -r '.data[].id' | while read rec_id; do
  suppression_id=$(uuidgen)
  az rest --method PUT \
    --url "https://management.azure.com${rec_id}/suppressions/auto-dev-suppression?api-version=2023-01-01" \
    --body "{\"properties\":{\"suppressionId\":\"${suppression_id}\",\"ttl\":\"7.00:00:00\"}}"
done
```

## Impact on Advisor Score

Dismissed recommendations no longer count against your Advisor score after the next score refresh. This means your score reflects only the recommendations that are actually actionable. However, be careful not to dismiss everything just to inflate your score - that defeats the purpose.

Postponed recommendations are also excluded from the score calculation after the next refresh.

## Wrapping Up

Managing Advisor recommendations is as important as implementing them. A cluttered Advisor view with dozens of irrelevant recommendations makes it easy to miss the ones that matter. Use dismiss for permanently irrelevant recommendations, postpone for timing issues, and Advisor configuration for scopes that should not be evaluated. Document your reasoning, review dismissed recommendations quarterly, and automate dismissals for ephemeral environments. The goal is a clean, actionable Advisor view that surfaces only the recommendations worth acting on.
