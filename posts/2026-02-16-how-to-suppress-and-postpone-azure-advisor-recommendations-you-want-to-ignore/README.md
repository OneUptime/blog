# How to Suppress and Postpone Azure Advisor Recommendations You Want to Ignore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Advisor, Recommendation Management, Cloud Governance, Azure Administration, Noise Reduction, Best Practices

Description: Learn how to dismiss, postpone, and suppress Azure Advisor recommendations that are not applicable to your environment to reduce noise and focus on what matters.

---

Azure Advisor means well, but not every recommendation applies to every environment. Maybe it tells you to enable zone redundancy on a dev server that gets rebuilt every morning. Maybe it recommends reserved instances for workloads you plan to decommission next quarter. Maybe it flags a storage account as having public access when that is intentional because it hosts a static website. If you leave these irrelevant recommendations sitting in Advisor, they clutter the view and make it harder to spot the ones that actually matter.

Advisor provides several mechanisms to handle recommendations you want to ignore: dismissing, postponing, and configuring suppression at the subscription level. This post covers all of them, including how to use them through the portal, CLI, and automation.

## Types of Recommendation Management

There are three main ways to handle recommendations you want to ignore:

1. **Dismiss** - Mark a recommendation as not applicable. It disappears from the active list but can be viewed in dismissed recommendations. You should provide a reason.

2. **Postpone** - Snooze a recommendation for a specific period (1 day, 7 days, 30 days, or a custom date). It reappears after the snooze period.

3. **Suppress** (via Advisor configuration) - Disable specific recommendation types at the subscription level so they never appear.

## Dismissing a Recommendation in the Portal

1. Go to **Azure Advisor** in the portal.
2. Navigate to the recommendation you want to dismiss.
3. Click on the recommendation to see its details.
4. Click the **Dismiss** button.
5. Select a reason:
   - **Not applicable** - The recommendation does not apply to this resource.
   - **Will not fix** - You are aware of the recommendation but choose not to implement it.
   - **Other** - Free-text explanation.
6. Optionally add a comment explaining your reasoning.
7. Click **Dismiss**.

The recommendation moves to the dismissed list and no longer affects your Advisor score.

## Postponing a Recommendation in the Portal

Postponing is useful when a recommendation is valid but the timing is wrong - maybe you are in a code freeze, or the fix is scheduled for next sprint.

1. Open the recommendation in Advisor.
2. Click **Postpone**.
3. Select a snooze duration:
   - 1 day
   - 7 days
   - 30 days
   - Custom date
4. Click **Postpone**.

The recommendation disappears from the active view until the snooze period ends, at which point it reappears automatically.

## Managing Recommendations via Azure CLI

For bulk operations, the CLI is more practical than clicking through the portal for each recommendation.

```bash
# List all active recommendations
az advisor recommendation list \
  --query "[].{Name:name, Category:category, Impact:impact, Problem:shortDescription.problem}" \
  -o table

# Dismiss a specific recommendation by ID
az advisor recommendation disable \
  --ids "/subscriptions/<sub-id>/providers/Microsoft.Advisor/recommendations/<recommendation-id>"
```

To find the recommendation ID, list recommendations and note the `name` field, which contains the GUID.

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

    Invoke-AzRestMethod -Method PUT -Path $uri -Payload $body
    Write-Host "Suppressed: $($rec.name)"
}
```

## Configuring Subscription-Level Suppression

If certain recommendation types never apply to your environment, you can disable them at the subscription level. This is different from dismissing individual recommendations - it prevents the recommendation type from appearing at all.

1. Go to **Azure Advisor** in the portal.
2. Click **Configuration** in the left menu.
3. Select the subscription.
4. You will see configuration options for specific recommendation types:
   - **VM right-sizing** - Adjust the CPU threshold or disable entirely.
   - **Average CPU utilization** - Set the percentage threshold.
5. Adjust the settings as needed.
6. Click **Apply**.

For the CLI:

```bash
# Configure Advisor settings for a subscription
# This changes the CPU threshold for VM right-sizing recommendations
az advisor configuration update \
  --resource-group "" \
  --configuration-name "default" \
  --low-cpu-threshold 10 \
  --exclude "AzureBlob"
```

## Using Suppressions via the REST API

The Advisor REST API provides the most granular control over suppressions. A suppression is applied to a specific recommendation for a specific resource.

```bash
# Create a suppression using the REST API directly
# This suppresses a specific recommendation for 90 days
curl -X PUT \
  "https://management.azure.com/subscriptions/<sub-id>/providers/Microsoft.Advisor/recommendations/<rec-id>/suppressions/my-suppression?api-version=2023-01-01" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "suppressionId": "unique-suppression-id",
      "ttl": "90.00:00:00"
    }
  }'
```

The `ttl` field accepts a timespan format. Set it to an empty string for permanent suppression.

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
      RecommendationId = tostring(properties.suppressionId),
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
- **Suppress at subscription level**: For recommendation types that never apply to your org's architecture.

### Automate for Ephemeral Environments

Dev and test environments often generate a lot of noise in Advisor. If you spin up and tear down environments frequently, consider automating the dismissal of certain recommendation types for resources in specific resource groups.

```bash
# Automation script to dismiss cost recommendations for all resources tagged as "Environment: dev"
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | where properties.category == 'Cost'
  | where properties.resourceMetadata.resourceId contains '/resourceGroups/rg-dev/'
  | project id
" --first 500 -o json | jq -r '.data[].id' | while read rec_id; do
  az rest --method PUT \
    --url "https://management.azure.com${rec_id}/suppressions/auto-dev-suppression?api-version=2023-01-01" \
    --body '{"properties":{"suppressionId":"auto","ttl":"7.00:00:00"}}'
done
```

## Impact on Advisor Score

Dismissed recommendations no longer count against your Advisor score. This means your score reflects only the recommendations that are actually actionable. However, be careful not to dismiss everything just to inflate your score - that defeats the purpose.

Postponed recommendations still count against your score until they are resolved or dismissed.

## Wrapping Up

Managing Advisor recommendations is as important as implementing them. A cluttered Advisor view with dozens of irrelevant recommendations makes it easy to miss the ones that matter. Use dismiss for permanently irrelevant recommendations, postpone for timing issues, and subscription-level configuration for types that never apply. Document your reasoning, review dismissed recommendations quarterly, and automate dismissals for ephemeral environments. The goal is a clean, actionable Advisor view that surfaces only the recommendations worth acting on.
