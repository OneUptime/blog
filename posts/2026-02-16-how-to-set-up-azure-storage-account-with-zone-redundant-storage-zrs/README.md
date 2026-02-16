# How to Set Up Azure Storage Account with Zone-Redundant Storage (ZRS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage Account, Zone-Redundant Storage, ZRS, High Availability, Disaster Recovery

Description: Learn how to create and configure Azure Storage accounts with Zone-Redundant Storage for high availability across availability zones within a region.

---

Availability zones are physically separate datacenters within an Azure region. Each zone has its own power, cooling, and networking. Zone-Redundant Storage (ZRS) replicates your data across three availability zones synchronously, which means your data survives the complete failure of any single datacenter. This is a significant upgrade over Locally Redundant Storage (LRS), which keeps all three copies in a single datacenter.

This guide covers when to use ZRS, how to set it up, and how to migrate existing storage accounts to ZRS.

## Understanding Zone-Redundant Storage

With ZRS, every write operation is confirmed only after the data has been written to all three availability zones. This synchronous replication means:

- **Zero data loss** if an entire availability zone goes down
- **No downtime** during single zone failures - your storage account remains accessible
- **Strong consistency** - reads always return the most recent write

The trade-off compared to LRS is a slightly higher cost (roughly 25% more) and marginally higher write latency due to synchronous replication across zones.

Here is how ZRS compares to other redundancy options:

| Feature | LRS | ZRS | GRS | GZRS |
|---------|-----|-----|-----|------|
| Copies | 3 | 3 | 6 | 6 |
| Zones | 1 | 3 | 1+1 (secondary region) | 3+1 |
| Survives zone failure | No | Yes | No (primary) | Yes |
| Survives region failure | No | No | Yes | Yes |
| Durability (11 nines) | 99.999999999% | 99.9999999999% | 99.99999999999999% | 99.99999999999999% |

## When to Use ZRS

ZRS is the right choice when:

- Your application needs high availability within a single region
- You cannot tolerate downtime from datacenter-level failures
- Your compliance requirements mandate data distribution across fault domains
- You need strong consistency with zone-level resilience
- You do not need cross-region replication (or you handle it at the application level)

ZRS is available in most Azure regions that support availability zones. Check the Azure documentation for the latest list of supported regions.

## Step 1: Create a Storage Account with ZRS

Creating a ZRS storage account is straightforward - you just specify the ZRS SKU:

```bash
# Create a resource group
az group create \
  --name rg-ha-storage \
  --location eastus2

# Create a storage account with Zone-Redundant Storage
az storage account create \
  --name sthazrs2026 \
  --resource-group rg-ha-storage \
  --location eastus2 \
  --sku Standard_ZRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true
```

For premium performance with zone redundancy:

```bash
# Premium block blob storage with ZRS
az storage account create \
  --name stpremiumzrs2026 \
  --resource-group rg-ha-storage \
  --location eastus2 \
  --sku Premium_ZRS \
  --kind BlockBlobStorage \
  --min-tls-version TLS1_2

# Premium file storage with ZRS
az storage account create \
  --name stfileszrs2026 \
  --resource-group rg-ha-storage \
  --location eastus2 \
  --sku Premium_ZRS \
  --kind FileStorage \
  --min-tls-version TLS1_2
```

## Step 2: Verify Zone-Redundant Configuration

After creation, verify the redundancy setting:

```bash
# Check the storage account SKU
az storage account show \
  --name sthazrs2026 \
  --resource-group rg-ha-storage \
  --query "{name:name, sku:sku.name, kind:kind, location:location}" \
  --output json
```

The SKU should show `Standard_ZRS` (or `Premium_ZRS` for premium accounts).

## Step 3: Migrate an Existing Account from LRS to ZRS

If you have an existing LRS storage account and want to upgrade to ZRS, you have two options:

**Option A: Live migration (no downtime)**

Request a live migration through Azure. This is handled by Microsoft and requires no downtime, but it can take days to weeks:

```bash
# Request a live migration from LRS to ZRS
# This is initiated through a support request or the portal
# The Azure CLI does not directly support live migration requests
# Use the portal: Storage Account > Settings > Configuration > Replication > Change
```

Live migration is only available for Standard storage accounts, not Premium.

**Option B: Manual migration (faster but requires planning)**

Copy data to a new ZRS account and switch over:

```bash
# Create the new ZRS storage account
az storage account create \
  --name stnewzrs2026 \
  --resource-group rg-ha-storage \
  --location eastus2 \
  --sku Standard_ZRS \
  --kind StorageV2

# Copy data from old account to new account using AzCopy
azcopy login --tenant-id "<tenant-id>"

azcopy copy \
  "https://stoldlrs2026.blob.core.windows.net/?$SAS_OLD" \
  "https://stnewzrs2026.blob.core.windows.net/?$SAS_NEW" \
  --recursive

# After verifying all data is copied, update your application
# connection strings to point to the new account
```

**Option C: In-place SKU change**

For some scenarios, you can change the SKU directly:

```bash
# Change SKU from LRS to ZRS (if supported for the account type)
az storage account update \
  --name stexisting2026 \
  --resource-group rg-ha-storage \
  --sku Standard_ZRS
```

This works for Standard general-purpose v2 accounts. The change triggers an asynchronous data migration in the background. During migration, your account remains accessible with LRS durability until the migration completes.

## Step 4: Configure for Maximum Availability

To get the most out of ZRS, combine it with other availability features:

```bash
# Enable blob versioning for data protection
az storage account blob-service-properties update \
  --account-name sthazrs2026 \
  --resource-group rg-ha-storage \
  --enable-versioning true

# Enable soft delete for blob recovery
az storage account blob-service-properties update \
  --account-name sthazrs2026 \
  --resource-group rg-ha-storage \
  --enable-delete-retention true \
  --delete-retention-days 14

# Enable container soft delete
az storage account blob-service-properties update \
  --account-name sthazrs2026 \
  --resource-group rg-ha-storage \
  --enable-container-delete-retention true \
  --container-delete-retention-days 7
```

## Step 5: Design Applications for Zone Resilience

Your storage account being zone-redundant only helps if your application is also designed for zone resilience. Here are key patterns:

**Deploy across zones**: Run your application in multiple availability zones using Zone-Redundant App Service Plans, AKS with zone-spread, or VMs in an Availability Zone set.

**Use retry logic**: Even with ZRS, transient failures can occur during zone failover. Implement retry logic in your application:

```python
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ServiceRequestError
import time

def upload_with_retry(blob_client, data, max_retries=3):
    """Upload a blob with retry logic for transient failures"""
    for attempt in range(max_retries):
        try:
            blob_client.upload_blob(data, overwrite=True)
            return True
        except ServiceRequestError as e:
            if attempt < max_retries - 1:
                # Exponential backoff: 1s, 2s, 4s
                wait_time = 2 ** attempt
                print(f"Upload failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
            else:
                raise

# Usage
connection_string = "DefaultEndpointsProtocol=https;AccountName=sthazrs2026;..."
blob_service = BlobServiceClient.from_connection_string(connection_string)
blob_client = blob_service.get_blob_client("data", "report.pdf")

with open("report.pdf", "rb") as f:
    upload_with_retry(blob_client, f)
```

**Monitor availability**: Set up alerts for storage availability drops:

```bash
# Create an alert for availability drops below 99.9%
az monitor metrics alert create \
  --resource-group rg-ha-storage \
  --name alert-storage-availability \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-ha-storage/providers/Microsoft.Storage/storageAccounts/sthazrs2026" \
  --condition "avg Availability < 99.9" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-ha-storage/providers/microsoft.insights/actionGroups/ag-ops" \
  --description "Storage availability dropped below 99.9%" \
  --severity 1
```

## Step 6: Use GZRS for Cross-Region Protection

If you need both zone redundancy and cross-region protection, use Geo-Zone-Redundant Storage (GZRS):

```bash
# Create a GZRS storage account
az storage account create \
  --name stgzrs2026 \
  --resource-group rg-ha-storage \
  --location eastus2 \
  --sku Standard_GZRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2

# Or with read access to the secondary region (RA-GZRS)
az storage account create \
  --name stragzrs2026 \
  --resource-group rg-ha-storage \
  --location eastus2 \
  --sku Standard_RAGZRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2
```

GZRS gives you the best of both worlds: three copies across zones in the primary region, plus three copies in the paired secondary region. This protects against both zone-level and region-level failures.

## Cost Comparison

Here is a rough cost comparison for 1 TiB of Hot tier blob storage in East US 2 (prices are approximate and subject to change):

| SKU | Monthly Cost | Premium over LRS |
|-----|-------------|-----------------|
| Standard_LRS | $20.80 | - |
| Standard_ZRS | $26.00 | 25% |
| Standard_GRS | $43.30 | 108% |
| Standard_GZRS | $48.50 | 133% |
| Standard_RAGZRS | $52.00 | 150% |

ZRS provides significant durability and availability improvements for a modest cost increase. For production workloads where zone-level failures are a concern, the 25% premium is well worth it.

## SLA Differences

The SLA for ZRS is higher than LRS:

- **LRS**: 99.9% availability for read and write (Hot tier)
- **ZRS**: 99.9% availability for read and write (Hot tier)
- **RA-GZRS**: 99.99% availability for read (Hot tier)

While the listed SLAs are similar, ZRS provides better actual availability in practice because it survives zone-level failures that would cause LRS downtime.

## Wrapping Up

Zone-Redundant Storage is a straightforward upgrade from LRS that significantly improves your storage account's resilience against datacenter-level failures. The setup is as simple as choosing the ZRS SKU when creating or updating your storage account. For existing accounts, you can request a live migration or perform a manual data copy. Combine ZRS with application-level zone redundancy, retry logic, and monitoring to build a truly resilient architecture. If you also need cross-region protection, step up to GZRS or RA-GZRS for comprehensive disaster recovery.
