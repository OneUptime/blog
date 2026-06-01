# Schedule Recurring Cost Exports from Azure Cost Management to a Storage Account

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cost Management, Cost Exports, Azure Storage, FinOps, Cost Reporting, Billing Automation

Description: Learn how to schedule recurring cost data exports from Azure Cost Management to a storage account for automated reporting and analysis.

---

Cost analysis in the Azure portal is great for interactive exploration, but when you need to feed cost data into external systems - a data warehouse, a BI tool, a chargeback system, or a custom dashboard - you need the raw data in a file. Azure Cost Management's export feature lets you schedule recurring exports that automatically deliver cost data to an Azure Storage account as CSV or Parquet files.

This post covers how to set up exports, what data formats are available, how to automate downstream processing, and how to keep costs under control.

## What Gets Exported

Cost Management exports can produce CSV or Parquet files containing detailed cost records. The examples in this post use CSV files. Each record includes:

- **Date** - The usage date.
- **Resource ID** - The full Azure resource ID.
- **Resource name** - The friendly name.
- **Resource group** - The resource group containing the resource.
- **Meter category** - The service category (Compute, Storage, etc.).
- **Meter subcategory** - More specific classification.
- **Meter name** - The specific meter (e.g., "D4s v5 VM").
- **Quantity** - The usage quantity.
- **Unit price** - The price per unit.
- **Cost** - The calculated cost.
- **Tags** - Resource tags.
- **Subscription** - The subscription name and ID.

The export includes all the dimensions you need for chargeback, trend analysis, and anomaly detection.

## Export Types

Common cost and usage export types include:

1. **Actual cost** - Standard usage and purchase charges as they were charged.
2. **Amortized cost** - Spreads eligible purchases (like reservations and savings plans) across their benefit period.
3. **Usage only** - Standard usage charges without purchase information. This type is supported for existing usage-only exports and for limited scopes such as management group exports.

For most use cases, amortized cost is the best choice because it gives you a consistent view of spending without the spiky effect of one-time purchases.

## Creating an Export in the Portal

1. Go to **Cost Management + Billing** in the Azure portal.
2. Select a scope (subscription, resource group, or management group).
3. Click **Exports** in the left menu.
4. Click **Add**.
5. Fill in the details:
   - **Name**: A descriptive name like "daily-actual-costs".
   - **Export type**: Actual cost, Amortized cost, or Usage.
   - **Dataset version**: Use the latest version for the most complete schema.
   - **Frequency**: Daily or Monthly for cost and usage exports.
   - **Start date**: When to begin exporting.
6. Under **Storage**:
   - **Subscription**: The subscription containing the storage account.
   - **Storage account**: Select or create a storage account.
   - **Container**: The blob container name (created automatically if it does not exist).
   - **Directory**: A folder path within the container.
7. Click **Create**.

The first export is queued after creation, and the export process can take up to 24 hours before data is ready. Subsequent exports follow the configured schedule.

## Creating an Export with Azure CLI

```bash
# Create a daily actual cost export to a storage account

az costmanagement export create \
  --name "daily-actual-costs" \
  --scope "/subscriptions/<sub-id>" \
  --type "ActualCost" \
  --timeframe "MonthToDate" \
  --storage-account-id "/subscriptions/<sub-id>/resourceGroups/rg-finance/providers/Microsoft.Storage/storageAccounts/stcostexports" \
  --storage-container "cost-data" \
  --storage-directory "daily" \
  --recurrence "Daily" \
  --schedule-status "Active" \
  --recurrence-period from="2026-02-16T00:00:00Z" to="2027-02-16T00:00:00Z"
```

## Creating an Export with ARM Templates

For infrastructure-as-code:

```json
{
  "type": "Microsoft.CostManagement/exports",
  "apiVersion": "2023-03-01",
  "name": "daily-amortized-costs",
  "properties": {
    "schedule": {
      "status": "Active",
      "recurrence": "Daily",
      "recurrencePeriod": {
        "from": "2026-02-16T00:00:00Z",
        "to": "2027-02-16T00:00:00Z"
      }
    },
    "format": "Csv",
    "deliveryInfo": {
      "destination": {
        "resourceId": "[parameters('storageAccountId')]",
        "container": "cost-data",
        "rootFolderPath": "amortized"
      }
    },
    "definition": {
      "type": "AmortizedCost",
      "timeframe": "MonthToDate",
      "dataSet": {
        "granularity": "Daily"
      }
    }
  }
}
```

## How Exported Files Are Organized

The exported files follow a consistent directory structure within the blob container:

```text
cost-data/
  daily/
    daily-actual-costs/
      20260216-20260216/
        <run-id>/
          part0.csv
          manifest.json
      20260217-20260217/
        <run-id>/
          part0.csv
          manifest.json
```

Each export creates a dated folder containing the run output. Current exports include a manifest file and partitioned data files; to process the full dataset, read each partition listed in the manifest.

## Processing Exported Data

Once the CSV files land in storage, you can process them with various tools.

### Azure Data Factory

Create an Azure Data Factory pipeline that triggers when new files arrive in the storage account (using an event-based trigger). The pipeline can:

- Copy data to a SQL database or data warehouse.
- Transform and aggregate the data.
- Load it into Power BI datasets.

### Azure Synapse Analytics

Query the exported CSV files directly from Synapse using serverless SQL.

```sql
-- Query cost export files directly from Synapse serverless SQL
SELECT
    Date,
    ResourceGroup,
    MeterCategory,
    SUM(CostInBillingCurrency) as TotalCost
FROM OPENROWSET(
    BULK 'https://stcostexports.blob.core.windows.net/cost-data/daily/**/*.csv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE
) AS costs
GROUP BY Date, ResourceGroup, MeterCategory
ORDER BY TotalCost DESC
```

### Power BI

Connect Power BI directly to the storage account and import the CSV files. Set up scheduled refresh so the report updates automatically when new data arrives.

1. In Power BI Desktop, click **Get Data** > **Azure Blob Storage**.
2. Enter the storage account URL.
3. Navigate to the cost export container and load the CSV files.
4. Build your reports and publish to Power BI Service.
5. Configure scheduled refresh.

### Python Script

For custom processing, a Python script can read the exported files and perform analysis.

```python
# Python script to process cost export files from Azure Storage
from azure.storage.blob import BlobServiceClient
import pandas as pd
import io

# Connect to the storage account
blob_service = BlobServiceClient.from_connection_string("<connection-string>")
container_client = blob_service.get_container_client("cost-data")

# List all CSV files in the export directory
blobs = container_client.list_blobs(name_starts_with="daily/")
csv_blobs = [b for b in blobs if b.name.endswith(".csv")]

# Read and combine all CSV files into a single DataFrame
dataframes = []
for blob in csv_blobs:
    blob_client = container_client.get_blob_client(blob.name)
    content = blob_client.download_blob().readall()
    df = pd.read_csv(io.BytesIO(content))
    dataframes.append(df)

combined = pd.concat(dataframes, ignore_index=True)

# Analyze: top spending resource groups this month
top_rgs = combined.groupby("ResourceGroup")["CostInBillingCurrency"].sum()
top_rgs = top_rgs.sort_values(ascending=False).head(10)
print("Top 10 Resource Groups by Cost:")
print(top_rgs)
```

## Setting Up Multiple Exports

A common pattern is to set up multiple exports for different purposes:

1. **Daily actual cost** - For daily monitoring dashboards.
2. **Monthly amortized cost** - For chargeback reports that spread RI costs.
3. **Daily usage** - For capacity planning and utilization analysis.

```bash
# Daily actual cost for dashboards
az costmanagement export create \
  --name "daily-dashboard" \
  --scope "/subscriptions/<sub-id>" \
  --type "ActualCost" \
  --timeframe "MonthToDate" \
  --storage-account-id "<storage-id>" \
  --storage-container "cost-data" \
  --storage-directory "dashboard" \
  --recurrence "Daily" \
  --schedule-status "Active" \
  --recurrence-period from="2026-02-16T00:00:00Z" to="2027-02-16T00:00:00Z"

# Monthly amortized cost for chargeback
az costmanagement export create \
  --name "monthly-chargeback" \
  --scope "/subscriptions/<sub-id>" \
  --type "AmortizedCost" \
  --timeframe "TheLastMonth" \
  --storage-account-id "<storage-id>" \
  --storage-container "cost-data" \
  --storage-directory "chargeback" \
  --recurrence "Monthly" \
  --schedule-status "Active" \
  --recurrence-period from="2026-02-16T00:00:00Z" to="2027-02-16T00:00:00Z"
```

## Managing Export Costs

The exports themselves are free - Azure does not charge for the Cost Management export feature. However, you do pay for:

- **Storage** - The blob storage for the CSV files. Cost export files are relatively small (usually a few MB to a few hundred MB per export), so the storage cost is minimal.
- **Data processing** - If you use Synapse, Data Factory, or other tools to process the data.

To keep storage costs low:

1. Use lifecycle management to delete old export files after a retention period.

```bash
# Delete cost export files older than 90 days
az storage account management-policy create \
  --account-name stcostexports \
  --resource-group rg-finance \
  --policy '{
    "rules": [
      {
        "name": "deleteOldExports",
        "enabled": true,
        "type": "Lifecycle",
        "definition": {
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["cost-data/"]
          },
          "actions": {
            "baseBlob": {
              "delete": {
                "daysAfterModificationGreaterThan": 90
              }
            }
          }
        }
      }
    ]
  }'
```

2. Use Standard_LRS storage tier for the cheapest option.

## Monitoring Export Health

Exports can fail silently if the storage account is misconfigured or permissions change. Check the status of your exports regularly.

1. In Cost Management, go to **Exports**.
2. Click on an export to see its run history.
3. Each run shows the status (Succeeded or Failed), the time it ran, and any error messages.

You can also set up an alert to notify you if an export fails. Use Azure Monitor to track the storage account for new blob creation, and alert if no new blobs appear within the expected timeframe.

## Export Across Management Groups

For Enterprise Agreement environments with multiple subscriptions, you can create exports at the management group level. This produces a single set of CSV files that includes usage charge data from all subscriptions under that management group. Management group exports do not support Microsoft Customer Agreement scopes, multiple currencies, purchases, reservations, savings plans, or amortized cost reports.

```bash
# Create an export at the management group level
az costmanagement export create \
  --name "enterprise-daily" \
  --scope "/providers/Microsoft.Management/managementGroups/<mg-id>" \
  --type "Usage" \
  --timeframe "MonthToDate" \
  --storage-account-id "<storage-id>" \
  --storage-container "cost-data" \
  --storage-directory "enterprise" \
  --recurrence "Daily" \
  --schedule-status "Active" \
  --recurrence-period from="2026-02-16T00:00:00Z" to="2027-02-16T00:00:00Z"
```

## Wrapping Up

Scheduled cost exports bridge the gap between Azure's portal-based cost analysis and your organization's reporting and FinOps workflows. Set up daily exports for operational monitoring, monthly exports for chargeback and financial reporting, and process the data with whatever tools your team is comfortable with - Power BI, Synapse, Python, or Data Factory. The exports are free, the storage costs are negligible, and the value of having cost data available for automated analysis and reporting is significant. Start with a single daily actual cost export and expand from there based on your needs.
