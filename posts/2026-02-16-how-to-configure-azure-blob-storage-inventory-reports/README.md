# How to Configure Azure Blob Storage Inventory Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Inventory Reports, Data Management, Cost Optimization, Storage Analytics, Governance

Description: How to set up Azure Blob Storage inventory reports to get a complete picture of your blobs, containers, and their properties for governance and cost management.

---

When you have millions of blobs spread across dozens of containers, keeping track of what you have becomes a real challenge. How much data is in the Archive tier? How many blobs have not been accessed in the last year? Are there blobs with incorrect access tiers that are costing you money? Azure Blob Storage inventory reports answer these questions by generating comprehensive CSV or Apache Parquet files that catalog every blob in your storage account along with their properties.

## What Inventory Reports Include

An inventory report is essentially a snapshot of your blob estate at a point in time. You configure which fields to include, and Azure generates the report on a schedule. The available fields include:

- **Name**: Full blob path including container
- **Container Name**: The container the blob lives in
- **Creation-Time**: When the blob was created
- **Last-Modified**: When it was last updated
- **Content-Length**: Size in bytes
- **Content-Type**: MIME type
- **BlobType**: Block blob, Page blob, or Append blob
- **AccessTier**: Hot, Cool, Cold, Archive, or Inferred
- **AccessTierChangeTime**: When the tier was last changed
- **LeaseStatus**: Whether the blob is leased
- **Tags**: Blob index tags
- **VersionId**: The version identifier (if versioning is enabled)
- **IsCurrentVersion**: Whether this is the current version
- **Snapshot**: Snapshot timestamp
- **Deleted**: Whether the blob is soft-deleted
- **RemainingRetentionDays**: Days until a soft-deleted blob is permanently removed

## Creating an Inventory Rule

You can create inventory rules through the Azure Portal, CLI, or ARM templates. Let us start with the CLI approach.

### Simple Daily Inventory

This creates a daily report that captures all blobs with their basic properties:

```bash
# Create a blob inventory policy
# The report runs daily and outputs CSV to the 'inventory' container
az storage account blob-inventory-policy create \
  --account-name mystorageaccount \
  --resource-group myResourceGroup \
  --policy '{
    "enabled": true,
    "type": "Inventory",
    "rules": [
      {
        "enabled": true,
        "name": "daily-blob-inventory",
        "destination": "inventory",
        "definition": {
          "filters": {
            "blobTypes": ["blockBlob", "appendBlob", "pageBlob"],
            "includeBlobVersions": false,
            "includeSnapshots": false
          },
          "format": "Csv",
          "schedule": "Daily",
          "objectType": "Blob",
          "schemaFields": [
            "Name",
            "Container-Name",
            "Creation-Time",
            "Last-Modified",
            "Content-Length",
            "Content-Type",
            "BlobType",
            "AccessTier",
            "AccessTierChangeTime",
            "LeaseStatus"
          ]
        }
      }
    ]
  }'
```

### Inventory with Blob Tags and Versions

For governance scenarios, you might want to include blob tags and version information:

```bash
# Create a comprehensive inventory including tags and versions
az storage account blob-inventory-policy create \
  --account-name mystorageaccount \
  --resource-group myResourceGroup \
  --policy '{
    "enabled": true,
    "type": "Inventory",
    "rules": [
      {
        "enabled": true,
        "name": "comprehensive-inventory",
        "destination": "inventory",
        "definition": {
          "filters": {
            "blobTypes": ["blockBlob"],
            "includeBlobVersions": true,
            "includeSnapshots": true,
            "prefixMatch": ["data/", "backups/", "logs/"]
          },
          "format": "Parquet",
          "schedule": "Weekly",
          "objectType": "Blob",
          "schemaFields": [
            "Name",
            "Container-Name",
            "Creation-Time",
            "Last-Modified",
            "Content-Length",
            "BlobType",
            "AccessTier",
            "Tags",
            "VersionId",
            "IsCurrentVersion",
            "Snapshot",
            "Deleted",
            "RemainingRetentionDays"
          ]
        }
      }
    ]
  }'
```

Notice the use of `prefixMatch` to limit the inventory to specific blob path prefixes. This is useful when you only care about certain containers or directories and want to keep the report size manageable.

### Container-Level Inventory

You can also inventory containers themselves, not just blobs:

```bash
# Create a container inventory rule
# This reports on container-level properties like public access and lease status
az storage account blob-inventory-policy create \
  --account-name mystorageaccount \
  --resource-group myResourceGroup \
  --policy '{
    "enabled": true,
    "type": "Inventory",
    "rules": [
      {
        "enabled": true,
        "name": "container-inventory",
        "destination": "inventory",
        "definition": {
          "format": "Csv",
          "schedule": "Weekly",
          "objectType": "Container",
          "schemaFields": [
            "Name",
            "Last-Modified",
            "LeaseStatus",
            "LeaseState",
            "LeaseDuration",
            "PublicAccess",
            "DefaultEncryptionScope",
            "HasImmutabilityPolicy",
            "HasLegalHold"
          ]
        }
      }
    ]
  }'
```

## Understanding the Output

Inventory reports are written to the destination container you specified. The file structure looks like:

```
inventory/
  daily-blob-inventory/
    2026/
      02/
        16/
          00-00-00/
            daily-blob-inventory_manifest.json
            daily-blob-inventory_0.csv
            daily-blob-inventory_1.csv
```

The manifest file describes the report run, including the rule name, timestamp, and a list of the data files. For large storage accounts, the data is split across multiple files.

## Analyzing Inventory Reports

### Using Python and Pandas

For CSV reports, you can analyze them directly with pandas:

```python
import pandas as pd
import glob

# Read all inventory CSV files for a specific date
csv_files = glob.glob("inventory/daily-blob-inventory/2026/02/16/00-00-00/*.csv")

# Combine all files into a single dataframe
# Each file has the same schema, so simple concatenation works
df = pd.concat([pd.read_csv(f) for f in csv_files], ignore_index=True)

# Summary statistics
print(f"Total blobs: {len(df):,}")
print(f"Total size: {df['Content-Length'].sum() / (1024**4):.2f} TiB")

# Breakdown by access tier
tier_summary = df.groupby("AccessTier").agg(
    count=("Name", "count"),
    total_size_gb=("Content-Length", lambda x: x.sum() / (1024**3))
).round(2)
print("\nBlobs by Access Tier:")
print(tier_summary)

# Find blobs that could be moved to a cooler tier
# Blobs in Hot tier not modified in the last 90 days
df["Last-Modified"] = pd.to_datetime(df["Last-Modified"])
stale_hot_blobs = df[
    (df["AccessTier"] == "Hot") &
    (df["Last-Modified"] < pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=90))
]
print(f"\nHot blobs not modified in 90 days: {len(stale_hot_blobs):,}")
print(f"Potential savings from tiering: {stale_hot_blobs['Content-Length'].sum() / (1024**3):.2f} GB")
```

### Using Azure Synapse or Databricks

For Parquet reports, use Azure Synapse Analytics or Databricks for server-side processing without downloading the data:

```sql
-- Query the inventory report using Synapse SQL serverless pool
-- OPENROWSET reads Parquet files directly from storage
SELECT
    [AccessTier],
    COUNT(*) AS blob_count,
    SUM([Content-Length]) / POWER(1024, 3) AS total_size_gb
FROM OPENROWSET(
    BULK 'https://mystorageaccount.blob.core.windows.net/inventory/comprehensive-inventory/2026/02/16/00-00-00/*.parquet',
    FORMAT = 'PARQUET'
) AS inventory
GROUP BY [AccessTier]
ORDER BY total_size_gb DESC
```

## Common Use Cases

### Cost Optimization

Identify blobs that are in more expensive tiers than they need to be:

```python
# Find large blobs in Hot tier that haven't been accessed recently
# These are candidates for Cool or Archive tier
candidates = df[
    (df["AccessTier"] == "Hot") &
    (df["Content-Length"] > 1024 * 1024) &  # Larger than 1 MB
    (df["Last-Modified"] < pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=30))
]

# Calculate estimated monthly savings if moved to Cool tier
# Hot tier: ~$0.018/GB/month, Cool tier: ~$0.01/GB/month
size_gb = candidates["Content-Length"].sum() / (1024**3)
monthly_savings = size_gb * (0.018 - 0.01)
print(f"Estimated monthly savings from tiering to Cool: ${monthly_savings:.2f}")
```

### Compliance and Governance

Check that all blobs in a compliance-sensitive container have the required tags:

```python
# Check for blobs missing required compliance tags
compliance_blobs = df[df["Container-Name"] == "financial-records"]
missing_tags = compliance_blobs[
    compliance_blobs["Tags"].isna() |
    ~compliance_blobs["Tags"].str.contains("classification", na=False)
]
print(f"Blobs missing classification tag: {len(missing_tags)}")
```

### Capacity Planning

Track storage growth over time by comparing weekly inventory reports:

```python
# Compare two weekly reports to see growth
this_week = pd.read_csv("inventory-2026-02-16.csv")
last_week = pd.read_csv("inventory-2026-02-09.csv")

growth_bytes = this_week["Content-Length"].sum() - last_week["Content-Length"].sum()
growth_blobs = len(this_week) - len(last_week)

print(f"Storage growth: {growth_bytes / (1024**3):.2f} GB")
print(f"New blobs: {growth_blobs:,}")
```

## Limitations and Tips

- **Report timing**: Daily reports run once per day. The exact time is not configurable - Azure picks the time. Do not rely on reports being available at a specific hour.
- **Multiple rules**: You can have up to 100 inventory rules per storage account. Use multiple rules for different purposes (one for cost analysis, another for compliance).
- **Report size**: For accounts with billions of blobs, reports can be very large. Use Parquet format for better compression and faster querying.
- **Destination container**: The inventory destination container must be in the same storage account. If you need the data elsewhere, set up a copy pipeline.
- **Cost**: Inventory reports are free - you only pay for the storage used by the report files themselves.

Blob inventory reports are one of the most underused features in Azure Storage. Setting up a daily or weekly report takes 5 minutes and gives you visibility into your storage estate that would otherwise require expensive and slow list operations. If you manage more than a few thousand blobs, this is worth your time.
