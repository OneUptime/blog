# How to Export Azure Advisor Recommendations to a CSV or Power BI Report

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Advisor, Power BI, CSV Export, Cloud Governance, Reporting, Azure Resource Graph

Description: Learn how to export Azure Advisor recommendations to CSV files and Power BI dashboards for reporting, tracking, and governance across your organization.

---

Azure Advisor recommendations are useful in the portal, but when you need to share them with stakeholders, track progress over time, or build governance reports for management, you need the data outside the portal. Whether it is a simple CSV for a spreadsheet or a Power BI dashboard that updates automatically, getting Advisor data into a reporting format is straightforward once you know the available methods.

This post covers three approaches: direct CSV download from the portal, Azure Resource Graph queries for programmatic extraction, and Power BI integration for automated dashboards.

## Method 1: Direct CSV Download from the Portal

The quickest way to get Advisor recommendations into a CSV file is the built-in export feature.

1. Go to **Azure Advisor** in the portal.
2. Click on a category tab (Cost, Security, Reliability, Performance, or Operational Excellence) or view all recommendations.
3. Apply any filters you need (subscription, resource group, impact level).
4. Click the **Download as CSV** button at the top of the recommendations list.

The CSV includes:

- Recommendation name.
- Impact level.
- Category.
- Affected resource.
- Resource group.
- Subscription.
- Problem description.
- Solution description.
- Potential benefits (like estimated savings for cost recommendations).

This is fine for one-off exports, but it does not scale well for multi-subscription environments or recurring reports.

## Method 2: Azure Resource Graph Queries

Azure Resource Graph is the most powerful way to query Advisor recommendations programmatically. It works across all subscriptions in your tenant and supports filtering, projection, and aggregation.

### Basic Query

```bash
# Query all Advisor recommendations across all subscriptions you have access to
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | project
      id,
      name,
      subscriptionId,
      resourceGroup,
      Category = tostring(properties.category),
      Impact = tostring(properties.impact),
      Problem = tostring(properties.shortDescription.problem),
      Solution = tostring(properties.shortDescription.solution),
      AffectedResource = tostring(properties.resourceMetadata.resourceId),
      LastUpdated = tostring(properties.lastUpdated)
  | order by Category asc, Impact desc
" -o table
```

### Export to CSV

Pipe the output to a file with the `--output` flag set to `tsv` or use `jq` for true CSV formatting.

```bash
# Export recommendations to a CSV file using jq for proper formatting
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | project
      Category = tostring(properties.category),
      Impact = tostring(properties.impact),
      Problem = tostring(properties.shortDescription.problem),
      Solution = tostring(properties.shortDescription.solution),
      Resource = tostring(properties.resourceMetadata.resourceId),
      Subscription = subscriptionId,
      ResourceGroup = resourceGroup
" --first 1000 -o json | jq -r '
  ["Category","Impact","Problem","Solution","Resource","Subscription","ResourceGroup"],
  (.data[] | [.Category, .Impact, .Problem, .Solution, .Resource, .Subscription, .ResourceGroup])
  | @csv
' > advisor-recommendations.csv
```

### Filter by Category

```bash
# Get only cost recommendations with estimated savings
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | where properties.category == 'Cost'
  | project
      Problem = tostring(properties.shortDescription.problem),
      AnnualSavings = tostring(properties.extendedProperties.annualSavingsAmount),
      Currency = tostring(properties.extendedProperties.savingsCurrency),
      Resource = tostring(properties.resourceMetadata.resourceId)
  | order by AnnualSavings desc
" -o table
```

### Summary Report

```bash
# Get a summary count of recommendations by category and impact
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | summarize Count = count() by
      Category = tostring(properties.category),
      Impact = tostring(properties.impact)
  | order by Category asc, Impact desc
" -o table
```

## Method 3: PowerShell Script for Automated Exports

If you want to schedule regular exports, a PowerShell script works well with Azure Automation or a scheduled task.

```powershell
# PowerShell script to export Advisor recommendations to CSV
# Can be run in Azure Automation or locally with Az module

# Connect to Azure (use managed identity in Azure Automation)
Connect-AzAccount

# Query recommendations using Resource Graph
$query = @"
advisorresources
| where type == 'microsoft.advisor/recommendations'
| project
    Category = tostring(properties.category),
    Impact = tostring(properties.impact),
    Problem = tostring(properties.shortDescription.problem),
    Solution = tostring(properties.shortDescription.solution),
    Resource = tostring(properties.resourceMetadata.resourceId),
    SubscriptionId = subscriptionId,
    ResourceGroup = resourceGroup,
    LastUpdated = tostring(properties.lastUpdated)
"@

# Execute the query across all subscriptions
$results = Search-AzGraph -Query $query -First 1000

# Export to CSV
$results | Export-Csv -Path "advisor-recommendations-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation

Write-Host "Exported $($results.Count) recommendations to CSV"
```

## Method 4: Power BI Integration

For executive dashboards and automated reporting, connect Power BI to Azure Resource Graph.

### Option A: Azure Resource Graph Connector (Recommended)

Power BI Desktop has a built-in Azure Resource Graph connector.

1. Open Power BI Desktop.
2. Click **Get Data** > **Azure** > **Azure Resource Graph**.
3. Sign in with your Azure credentials.
4. Enter your query:

```
advisorresources
| where type == 'microsoft.advisor/recommendations'
| project
    Category = tostring(properties.category),
    Impact = tostring(properties.impact),
    Problem = tostring(properties.shortDescription.problem),
    Solution = tostring(properties.shortDescription.solution),
    Resource = tostring(properties.resourceMetadata.resourceId),
    Subscription = subscriptionId,
    ResourceGroup = resourceGroup
```

5. Click **Load** to import the data.

Now you can build visualizations:

- A bar chart showing recommendation count by category.
- A table with all high-impact recommendations.
- A pie chart showing the distribution by impact level.
- A card showing estimated total cost savings.

### Option B: REST API and Scheduled Refresh

For automated Power BI reports that refresh on a schedule:

1. Create a Power BI dataset using the Azure Resource Graph REST API.
2. Set up scheduled refresh in Power BI Service (requires a gateway for on-premises, but not for cloud data sources).
3. The report refreshes daily or hourly, always showing current recommendations.

### Building the Dashboard

Here is a suggested layout for an Advisor recommendations Power BI dashboard:

**Top row - Summary cards:**
- Total recommendations count.
- High-impact recommendations count.
- Estimated annual cost savings.
- Secure score (from Defender for Cloud).

**Middle row - Charts:**
- Bar chart: Recommendations by category (Cost, Security, Reliability, Performance, Operational Excellence).
- Bar chart: Recommendations by impact level per category.
- Trend line: Recommendations count over time (requires historical snapshots).

**Bottom row - Detail tables:**
- Top 10 cost savings opportunities with dollar amounts.
- All high-impact reliability and security recommendations.
- Recently added recommendations (last 7 days).

## Tracking Recommendations Over Time

One limitation of all the above methods is that they show you the current state. They do not tell you how many recommendations you had last month or whether your security posture is improving. To track trends, you need to snapshot the data periodically.

### Option 1: Store Snapshots in a Storage Account

Schedule an Azure Automation runbook or Azure Function to run daily, query the recommendations, and store the results as dated CSV files in a storage account.

```python
# Python Azure Function to snapshot Advisor recommendations daily
import azure.functions as func
from azure.identity import DefaultAzureCredential
from azure.mgmt.resourcegraph import ResourceGraphClient
from azure.storage.blob import BlobServiceClient
import json
from datetime import datetime

def main(timer: func.TimerRequest):
    # Query recommendations using Resource Graph
    credential = DefaultAzureCredential()
    client = ResourceGraphClient(credential)

    query = """
    advisorresources
    | where type == 'microsoft.advisor/recommendations'
    | project Category=tostring(properties.category),
              Impact=tostring(properties.impact),
              Problem=tostring(properties.shortDescription.problem),
              Resource=tostring(properties.resourceMetadata.resourceId)
    """

    # Execute the query
    result = client.resources({"query": query})

    # Upload to blob storage with today's date as filename
    blob_client = BlobServiceClient.from_connection_string("<conn-string>")
    container = blob_client.get_container_client("advisor-snapshots")
    blob_name = f"recommendations-{datetime.utcnow().strftime('%Y-%m-%d')}.json"
    container.upload_blob(blob_name, json.dumps(result.data))
```

### Option 2: Ingest into Log Analytics

Send the snapshots to a Log Analytics custom table and use KQL to analyze trends.

```
// Query recommendation trend from historical snapshots
AdvisorSnapshots_CL
| where TimeGenerated > ago(90d)
| summarize RecommendationCount = count() by bin(TimeGenerated, 1d), Category_s
| render timechart
```

## Sharing Reports

For sharing with stakeholders who do not have Azure portal access:

- **PDF export**: Export Power BI reports as PDFs and distribute via email.
- **Power BI Workspace**: Publish to a Power BI workspace and share with specific users.
- **Scheduled email**: Configure Power BI to email a snapshot of the report on a schedule.
- **CSV attachment**: Use Azure Automation to generate a CSV and email it to a distribution list.

## Wrapping Up

Exporting Azure Advisor recommendations transforms them from a portal-only tool into a governance and reporting asset. For quick, one-off exports, use the built-in CSV download. For programmatic access across subscriptions, use Azure Resource Graph queries via the CLI or PowerShell. For executive dashboards and automated reporting, connect Power BI to Azure Resource Graph. And for trend tracking, set up daily snapshots that let you measure improvement over time. The combination of these approaches gives you complete visibility into your Azure optimization opportunities, in whatever format your stakeholders prefer.
