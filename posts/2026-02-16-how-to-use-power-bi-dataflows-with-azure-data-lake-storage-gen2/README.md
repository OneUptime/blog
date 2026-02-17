# How to Use Power BI Dataflows with Azure Data Lake Storage Gen2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power BI, Azure Data Lake, Dataflows, Data Engineering, ETL, Azure Storage, Business Intelligence

Description: A practical guide to connecting Power BI Dataflows with Azure Data Lake Storage Gen2 for scalable self-service data preparation.

---

Power BI Dataflows give business analysts and data engineers a way to build reusable data transformation logic right inside the Power BI service. When you connect those dataflows to Azure Data Lake Storage Gen2, you unlock a whole new level of control over where your prepared data lands, who can access it, and how it integrates with the rest of your data platform.

By default, Power BI stores dataflow data in its own internal storage. But if you attach an Azure Data Lake Storage Gen2 account, the data gets written to your own lake in the Common Data Model (CDM) format. This means other tools like Azure Databricks, Azure Synapse Analytics, and Azure Data Factory can read the same data without going through Power BI at all.

## Why Connect Dataflows to ADLS Gen2?

There are several practical reasons to do this:

- **Data ownership**: Your data stays in your storage account, under your control and your governance policies.
- **Cross-tool access**: Data scientists can read the same prepared data using Spark or Python notebooks in Databricks or Synapse.
- **Cost management**: You pay for storage at ADLS Gen2 rates, which are very affordable for large volumes.
- **Compliance**: You can apply Azure RBAC, network rules, and encryption policies to the storage account.
- **Versioning**: ADLS Gen2 supports snapshots and versioning for data recovery scenarios.

## Prerequisites

Before starting, gather the following:

- An Azure subscription with permissions to create storage accounts
- A Power BI Premium or Premium Per User workspace (dataflow storage attachment requires Premium)
- Global admin or Power BI admin access for the tenant-level storage configuration
- Azure CLI or Azure Portal access

## Step 1: Create an Azure Data Lake Storage Gen2 Account

If you do not already have an ADLS Gen2 account, create one through the Azure portal.

Navigate to "Storage accounts" and click "Create." When configuring the account, make sure to enable the "hierarchical namespace" option on the Advanced tab. This is what turns a regular blob storage account into a Data Lake Storage Gen2 account.

Choose a performance tier and redundancy option that fits your needs. For most Power BI dataflow scenarios, Standard performance with LRS or ZRS redundancy is sufficient.

After the account is created, create a container (file system) inside it. Name it something like `powerbi-dataflows`.

```bash
# Create the storage account with hierarchical namespace enabled
az storage account create \
    --name pbiDataLakeStore \
    --resource-group rg-powerbi \
    --location eastus \
    --sku Standard_LRS \
    --kind StorageV2 \
    --hns true

# Create a container for dataflow data
az storage fs create \
    --name powerbi-dataflows \
    --account-name pbiDataLakeStore
```

## Step 2: Grant Power BI Access to the Storage Account

The Power BI service needs permission to write data to your ADLS Gen2 account. There are two approaches: assigning the Storage Blob Data Owner role to the Power BI service principal, or using workspace-level service principals.

For the tenant-level approach, you need to grant the Power BI service (the first-party Microsoft application) access to the storage account.

In the Azure portal, go to your storage account, select "Access Control (IAM)," and add a role assignment. Assign the "Storage Blob Data Owner" role to the Power BI Service enterprise application.

You can also do this with the Azure CLI:

```bash
# Get the Power BI service principal object ID in your tenant
PBI_SP_ID=$(az ad sp list --display-name "Power BI Service" --query "[0].id" -o tsv)

# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
    --name pbiDataLakeStore \
    --resource-group rg-powerbi \
    --query id -o tsv)

# Assign Storage Blob Data Owner role to the Power BI service
az role assignment create \
    --assignee $PBI_SP_ID \
    --role "Storage Blob Data Owner" \
    --scope $STORAGE_ID
```

## Step 3: Configure Power BI Tenant Settings

Now you need to tell Power BI about your ADLS Gen2 account at the tenant level. Sign in to the Power BI admin portal as a global admin or Power BI admin.

Go to "Admin portal" then "Tenant settings." Under the "Dataflow settings" section, you will find an option called "Connect to Azure Data Lake Storage Gen2." Enable this setting and enter:

- **Storage account name**: Your ADLS Gen2 account name
- **Container**: The container you created (e.g., `powerbi-dataflows`)
- **Subscription ID**: Your Azure subscription ID
- **Resource group**: The resource group containing the storage account

Save the settings. Power BI will validate the connection and confirm that it has the necessary permissions.

## Step 4: Attach Storage at the Workspace Level

With tenant-level storage configured, you can now attach it to specific workspaces. Open the workspace where you want to create dataflows, go to "Settings," and look for the "Azure Connections" or "Dataflow storage" section.

Select the option to use the organization's ADLS Gen2 account. Alternatively, if your tenant admin has enabled workspace-level storage overrides, you can point individual workspaces to different storage accounts.

## Step 5: Create a Dataflow That Writes to ADLS Gen2

Now for the fun part. In your workspace, click "New" and select "Dataflow." Power BI opens the Power Query Online editor where you can connect to various data sources and apply transformations.

For this example, connect to an Azure SQL Database containing sales data:

1. Select "Azure SQL Database" as the data source
2. Enter the server name and database name
3. Authenticate with your credentials
4. Select the tables you want to transform (e.g., Orders, Products, Customers)

Apply transformations using Power Query. You might filter out test records, merge tables, add calculated columns, or reshape the data for downstream consumption.

When you save the dataflow, Power BI will write the output to your ADLS Gen2 container in CDM format. The folder structure looks like this:

```
powerbi-dataflows/
  <workspace-name>/
    <dataflow-name>/
      model.json          # CDM metadata describing the entities
      Orders/
        Orders.csv.snapshots/
          <timestamp>/
            Orders.csv    # The actual data files
      Products/
        Products.csv.snapshots/
          ...
```

## Step 6: Access Dataflow Data from Other Tools

One of the biggest advantages of writing to ADLS Gen2 is that other tools can read the same data. Here is how to read dataflow output from Azure Databricks using PySpark:

```python
# Read Power BI dataflow output from ADLS Gen2 in Databricks
# Configure access to the storage account
spark.conf.set(
    "fs.azure.account.key.pbiDataLakeStore.dfs.core.windows.net",
    dbutils.secrets.get(scope="storage", key="adls-key")
)

# Path to the dataflow entity data
orders_path = (
    "abfss://powerbi-dataflows@pbiDataLakeStore.dfs.core.windows.net/"
    "SalesWorkspace/SalesDataflow/Orders/*.csv"
)

# Read the CSV data into a Spark DataFrame
orders_df = spark.read.format("csv") \
    .option("header", "true") \
    .option("inferSchema", "true") \
    .load(orders_path)

# Show the first few rows to verify the data
orders_df.show(5)

# You can now join, aggregate, or further transform this data
# alongside other datasets in your lake
```

## Step 7: Schedule Dataflow Refresh

Back in the Power BI portal, configure a refresh schedule for your dataflow. Go to the dataflow settings and set up a schedule that matches your data freshness requirements.

Each refresh will create a new snapshot in ADLS Gen2, so the data in the lake is always in sync with the latest dataflow run. You can also trigger refreshes programmatically via the Power BI REST API:

```python
# Trigger a dataflow refresh using the Power BI REST API
import requests

# Authenticate and get access token (using client credentials)
token_url = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
token_data = {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "scope": "https://analysis.windows.net/powerbi/api/.default",
    "grant_type": "client_credentials"
}
token_resp = requests.post(token_url, data=token_data)
access_token = token_resp.json()["access_token"]

# Trigger the dataflow refresh
group_id = "your-workspace-id"
dataflow_id = "your-dataflow-id"
refresh_url = f"https://api.powerbi.com/v1.0/myorg/groups/{group_id}/dataflows/{dataflow_id}/refreshes"

headers = {"Authorization": f"Bearer {access_token}"}
response = requests.post(refresh_url, headers=headers)

if response.status_code == 200:
    print("Dataflow refresh triggered successfully")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

## Monitoring and Governance

Once your dataflows are writing to ADLS Gen2, you can apply the full range of Azure governance tools:

- **Azure Monitor**: Track storage account metrics like ingress, egress, and transaction counts
- **Azure Policy**: Enforce naming conventions, encryption requirements, and network rules
- **Microsoft Purview**: Catalog and classify the data for data governance
- **Lifecycle management policies**: Automatically move older snapshots to cool or archive storage tiers

## Common Pitfalls

A few things to watch out for. First, the storage account must have hierarchical namespace enabled - regular blob storage will not work. Second, if you change the tenant-level ADLS Gen2 configuration, existing dataflows will not automatically migrate to the new location. Third, make sure the Power BI service principal retains the Storage Blob Data Owner role; if someone removes it, dataflow refreshes will start failing.

## Summary

Connecting Power BI Dataflows to Azure Data Lake Storage Gen2 bridges the gap between self-service data preparation and enterprise data management. Analysts get the familiar Power Query experience, while data engineers get standardized CDM data in a storage account they control. The data is accessible to Databricks, Synapse, and any tool that can read from ADLS Gen2, turning your dataflows into a shared asset rather than an isolated silo.
