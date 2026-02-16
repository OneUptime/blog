# How to Configure Azure Storage Object-Level Tiering with Last Access Time Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Access Tiering, Lifecycle Management, Cost Optimization, Last Access Time

Description: Learn how to enable last access time tracking in Azure Blob Storage and create lifecycle policies that automatically tier blobs based on when they were last read.

---

Most data follows a predictable pattern: it is accessed frequently right after creation, then access drops off sharply over time. Despite this, many organizations keep all their blobs in the Hot tier, paying premium storage rates for data that nobody has touched in months. Azure Blob Storage's last access time tracking, combined with lifecycle management policies, lets you automatically move individual blobs to cheaper tiers based on when they were last read - not just when they were created or modified.

This guide covers enabling access time tracking, creating policies that use it, and understanding the cost implications.

## Access Tiers in Azure Blob Storage

Azure Blob Storage offers four access tiers:

| Tier | Storage Cost | Access Cost | Retrieval Latency | Best For |
|------|-------------|-------------|-------------------|----------|
| Hot | Highest | Lowest | Milliseconds | Frequently accessed data |
| Cool | ~50% less | Higher | Milliseconds | Infrequently accessed (30+ days) |
| Cold | ~65% less | Higher | Milliseconds | Rarely accessed (90+ days) |
| Archive | ~90% less | Highest | Hours | Long-term retention |

The key insight is that storage costs decrease as you move to cooler tiers, but access and retrieval costs increase. The optimal strategy is to keep frequently accessed data in Hot and automatically move inactive data to cooler tiers.

## Why Last Access Time Matters

Without last access time tracking, lifecycle policies can only use two criteria:
- **Days since creation**: How old the blob is
- **Days since modification**: When the blob was last written to

Neither of these captures actual usage. A blob created 6 months ago might still be read every day. Moving it to Cool based on creation date would increase costs due to higher access charges.

Last access time tracking records when each blob was last read. This lets you create policies like: "Move to Cool tier if not accessed for 30 days" - which accurately targets data that nobody is using.

## Step 1: Enable Last Access Time Tracking

Enable the feature on your storage account:

```bash
# Enable last access time tracking
az storage account blob-service-properties update \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --enable-last-access-tracking true
```

Once enabled, Azure starts recording the last access time for every blob read operation (GetBlob, GetBlobProperties). The tracking applies to all blob operations going forward - it does not retroactively populate access times for existing blobs.

Verify the setting:

```bash
# Verify last access time tracking is enabled
az storage account blob-service-properties show \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --query "lastAccessTimeTrackingPolicy"
```

## Step 2: Understand How Access Time is Recorded

Not every read updates the last access time. Azure batches access time updates to reduce overhead:

- The first read of a blob updates the access time
- Subsequent reads within a 24-hour window may or may not update it
- The granularity is approximately 24 hours

This means the access time is not precise down to the second, but it is accurate enough for lifecycle management decisions. A blob that has not been accessed in 30 days will definitely show a last access time older than 30 days.

You can check a blob's last access time:

```bash
# Check the last access time of a specific blob
az storage blob show \
  --account-name stappdata2026 \
  --container-name data \
  --name reports/monthly-summary-2025-12.pdf \
  --query "properties.lastAccessedOn" \
  --output tsv
```

## Step 3: Create a Lifecycle Policy with Access Time Rules

Now create a lifecycle policy that tiers blobs based on last access time:

```bash
# Create a lifecycle management policy
az storage account management-policy create \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --policy @- << 'EOF'
{
  "rules": [
    {
      "name": "tier-based-on-access",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["data/", "reports/", "uploads/"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterLastAccessTimeGreaterThan": 30
            },
            "tierToCold": {
              "daysAfterLastAccessTimeGreaterThan": 90
            },
            "tierToArchive": {
              "daysAfterLastAccessTimeGreaterThan": 180
            },
            "delete": {
              "daysAfterLastAccessTimeGreaterThan": 730
            },
            "enableAutoTierToHotFromCool": true
          }
        }
      }
    }
  ]
}
EOF
```

This policy does the following:

1. After 30 days without access, move to Cool tier
2. After 90 days without access, move to Cold tier
3. After 180 days without access, move to Archive tier
4. After 730 days (2 years) without access, delete the blob
5. If a blob in Cool tier is accessed, automatically move it back to Hot

The `enableAutoTierToHotFromCool` setting is particularly useful. It ensures that if someone accesses a blob that was tiered down to Cool, it automatically moves back to Hot for optimal access performance.

## Step 4: Combine Access Time with Other Criteria

You can create more nuanced policies by combining access time rules with other criteria:

```bash
# Policy with different rules for different data types
az storage account management-policy create \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --policy @- << 'EOF'
{
  "rules": [
    {
      "name": "tier-images-aggressively",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["images/"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterLastAccessTimeGreaterThan": 14
            },
            "tierToArchive": {
              "daysAfterLastAccessTimeGreaterThan": 60
            },
            "enableAutoTierToHotFromCool": true
          }
        }
      }
    },
    {
      "name": "tier-documents-conservatively",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["documents/"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterLastAccessTimeGreaterThan": 60
            },
            "tierToCold": {
              "daysAfterLastAccessTimeGreaterThan": 180
            },
            "enableAutoTierToHotFromCool": true
          }
        }
      }
    },
    {
      "name": "manage-versions",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"]
        },
        "actions": {
          "version": {
            "tierToCool": {
              "daysAfterCreationGreaterThan": 30
            },
            "delete": {
              "daysAfterCreationGreaterThan": 90
            }
          }
        }
      }
    }
  ]
}
EOF
```

## Step 5: Monitor Tiering Activity

Track how the lifecycle policy is affecting your storage:

```bash
# Check capacity by access tier
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.Storage/storageAccounts/stappdata2026/blobServices/default" \
  --metric "BlobCapacity" \
  --dimension "Tier" \
  --interval P1D \
  --output table
```

You can also check blob counts per tier:

```bash
# Count blobs by tier in a container using Azure CLI
az storage blob list \
  --account-name stappdata2026 \
  --container-name data \
  --query "[?properties.blobTier=='Hot'].name | length(@)" \
  --output tsv

az storage blob list \
  --account-name stappdata2026 \
  --container-name data \
  --query "[?properties.blobTier=='Cool'].name | length(@)" \
  --output tsv
```

## Step 6: Manually Set Blob Tiers

Sometimes you want to override the lifecycle policy for specific blobs:

```python
from azure.storage.blob import BlobServiceClient, StandardBlobTier

# Initialize client
blob_service = BlobServiceClient.from_connection_string(connection_string)

# Move a specific blob to Cool tier immediately
blob_client = blob_service.get_blob_client("data", "large-dataset.csv")
blob_client.set_standard_blob_tier(StandardBlobTier.Cool)

# Move a batch of blobs to Archive tier
container = blob_service.get_container_client("data")
for blob in container.list_blobs(name_starts_with="old-reports/"):
    client = container.get_blob_client(blob.name)
    client.set_standard_blob_tier(StandardBlobTier.Archive)
    print(f"Archived: {blob.name}")
```

## Cost Savings Estimation

Here is a rough example of what access-time-based tiering can save.

Assume you have 10 TiB of data in the Hot tier, and usage analysis shows:
- 2 TiB accessed daily (stays Hot)
- 3 TiB accessed monthly (moves to Cool after 30 days)
- 3 TiB accessed quarterly (moves to Cold after 90 days)
- 2 TiB not accessed in 6+ months (moves to Archive)

Monthly storage cost comparison (approximate, East US 2 pricing):

| Scenario | Hot | Cool | Cold | Archive | Total |
|----------|-----|------|------|---------|-------|
| All Hot | $208 | - | - | - | $208/month |
| Tiered | $41.60 | $30 | $13.50 | $4 | $89.10/month |

That is roughly a 57% reduction in monthly storage costs, just from automatically tiering data based on access patterns.

## Important Considerations

**Early deletion fees**: Moving a blob to Cool, Cold, or Archive and then accessing it before the minimum retention period results in an early deletion charge. Cool has a 30-day minimum, Cold has 90 days, and Archive has 180 days.

**Archive rehydration time**: Blobs in Archive tier cannot be read directly. They must be rehydrated to Hot or Cool first, which takes up to 15 hours (standard) or up to 1 hour (high priority at higher cost).

**Access time granularity**: Last access time updates have approximately 24-hour granularity. Do not use this for fine-grained access tracking or analytics.

**Lifecycle policy execution**: Policies run once per day. Changes do not take effect immediately.

## Wrapping Up

Object-level tiering with last access time tracking is one of the most effective cost optimization features in Azure Blob Storage. Enable access time tracking, create lifecycle policies that move untouched data to cheaper tiers, and let Azure handle the rest. The savings add up quickly for storage accounts with terabytes of data where most blobs are rarely accessed. The enableAutoTierToHotFromCool feature ensures that data which becomes active again is automatically promoted back to the optimal tier.
