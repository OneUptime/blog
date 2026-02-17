# How to Use Azure Storage Immutable Policies for SEC 17a-4 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Immutable Storage, SEC 17a-4, WORM, Compliance, Financial Regulations

Description: Step-by-step guide to configuring Azure Blob Storage immutable policies to meet SEC Rule 17a-4 requirements for WORM storage compliance.

---

If your organization deals with broker-dealer records, financial transactions, or any data subject to SEC Rule 17a-4, you need WORM (Write Once Read Many) storage. SEC 17a-4 requires that certain records be preserved in a non-rewritable, non-erasable format for specified retention periods. Azure Blob Storage immutable policies provide a way to meet these requirements using cloud storage instead of traditional optical or tape media.

This guide walks through the technical implementation of Azure immutable storage for SEC 17a-4 compliance.

## Understanding SEC 17a-4 Requirements

SEC Rule 17a-4(f) requires broker-dealers to:

- Preserve records in a non-rewritable, non-erasable format (WORM)
- Retain records for specified periods (3 years or 6 years depending on record type)
- Provide immediate access to records for the first 2 years
- Provide records to regulators upon request
- Maintain an index of records for easy retrieval
- Designate a third party who can access records (the "designated examining authority")

Azure Blob Storage with locked immutability policies has been assessed by Cohasset Associates and found to meet these requirements. Microsoft publishes this assessment, which you should reference when discussing compliance with your auditors.

## Step 1: Create a Compliant Storage Account

Start with a storage account configured for compliance:

```bash
# Create a resource group for compliance data
az group create \
  --name rg-sec-compliance \
  --location eastus2

# Create a storage account with geo-redundant storage
# RA-GRS ensures data availability even during regional outages
az storage account create \
  --name stsec17a4records \
  --resource-group rg-sec-compliance \
  --location eastus2 \
  --sku Standard_RAGZRS \
  --kind StorageV2 \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2 \
  --default-action Deny \
  --https-only true
```

Key settings for compliance:
- **RA-GZRS**: Maximum durability and availability
- **No public access**: Records should only be accessible through authenticated requests
- **TLS 1.2 minimum**: Ensures encrypted transport
- **Default deny**: Network rules block all access except explicitly allowed sources
- **HTTPS only**: Prevents unencrypted access

## Step 2: Lock Down Network Access

Restrict access to the storage account to specific networks:

```bash
# Allow access only from your corporate VNet
az storage account network-rule add \
  --account-name stsec17a4records \
  --resource-group rg-sec-compliance \
  --vnet-name vnet-corporate \
  --subnet snet-compliance-apps

# Allow access from compliance team IP addresses
az storage account network-rule add \
  --account-name stsec17a4records \
  --resource-group rg-sec-compliance \
  --ip-address 203.0.113.0/24

# Optionally add a private endpoint for fully private access
az network private-endpoint create \
  --resource-group rg-sec-compliance \
  --name pe-sec-storage \
  --vnet-name vnet-corporate \
  --subnet snet-private-endpoints \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-sec-compliance/providers/Microsoft.Storage/storageAccounts/stsec17a4records" \
  --group-ids blob \
  --connection-name sec-storage-connection
```

## Step 3: Create Containers with Immutability Policies

Create separate containers for different record types with appropriate retention periods:

```bash
# Container for trade records (6-year retention = 2190 days)
az storage container create \
  --account-name stsec17a4records \
  --name trade-records \
  --auth-mode login

# Set a 6-year immutability policy on the trade records container
az storage container immutability-policy create \
  --account-name stsec17a4records \
  --container-name trade-records \
  --period 2190 \
  --allow-protected-append-writes true

# Container for communications (3-year retention = 1095 days)
az storage container create \
  --account-name stsec17a4records \
  --name communications \
  --auth-mode login

az storage container immutability-policy create \
  --account-name stsec17a4records \
  --container-name communications \
  --period 1095 \
  --allow-protected-append-writes true
```

The `--allow-protected-append-writes` flag is important. It allows new data to be appended to append blobs (useful for ongoing logging) while still preventing modification or deletion of existing data. This is a SEC 17a-4 compliant setting.

## Step 4: Lock the Immutability Policies

This is the critical step. Locking the policy makes it irrevocable. After locking:
- The retention period cannot be shortened (only extended)
- The policy cannot be deleted
- Blobs cannot be deleted or modified until the retention period expires
- Even Azure support cannot override a locked policy

```bash
# Get the ETag for the trade-records policy
ETAG_TRADE=$(az storage container immutability-policy show \
  --account-name stsec17a4records \
  --container-name trade-records \
  --query "etag" -o tsv)

# Lock the trade records policy (IRREVERSIBLE)
az storage container immutability-policy lock \
  --account-name stsec17a4records \
  --container-name trade-records \
  --if-match "$ETAG_TRADE"

# Get the ETag for the communications policy
ETAG_COMM=$(az storage container immutability-policy show \
  --account-name stsec17a4records \
  --container-name communications \
  --query "etag" -o tsv)

# Lock the communications policy (IRREVERSIBLE)
az storage container immutability-policy lock \
  --account-name stsec17a4records \
  --container-name communications \
  --if-match "$ETAG_COMM"
```

After locking, verify the policies:

```bash
# Verify locked status
az storage container immutability-policy show \
  --account-name stsec17a4records \
  --container-name trade-records \
  --query "{period:immutabilityPeriodSinceCreationInDays, state:state}"
```

The state should show "Locked".

## Step 5: Upload Records

Now upload your compliance records. Once uploaded, they cannot be modified or deleted until the retention period expires.

This Python script demonstrates proper record ingestion with metadata tagging:

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
from datetime import datetime

# Authenticate using managed identity or service principal
credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    account_url="https://stsec17a4records.blob.core.windows.net",
    credential=credential
)

container = blob_service.get_container_client("trade-records")

def upload_trade_record(record_id, record_content, record_type):
    """Upload a trade record with compliance metadata"""

    # Generate a structured blob name for easy indexing
    timestamp = datetime.utcnow().strftime("%Y/%m/%d")
    blob_name = f"{timestamp}/{record_type}/{record_id}.json"

    # Set metadata for record classification and retrieval
    metadata = {
        "record_type": record_type,
        "record_id": record_id,
        "ingestion_time": datetime.utcnow().isoformat(),
        "retention_years": "6",
        "classification": "SEC-17a4"
    }

    blob_client = container.get_blob_client(blob_name)
    blob_client.upload_blob(
        record_content,
        metadata=metadata,
        overwrite=False  # Prevent accidental overwrites
    )

    print(f"Record {record_id} uploaded to {blob_name}")
    return blob_name

# Upload a sample trade record
upload_trade_record(
    "TRD-2026-02-16-001",
    '{"trade_id": "TRD-001", "symbol": "MSFT", "quantity": 1000, "price": 425.50}',
    "equity-trade"
)
```

## Step 6: Add Legal Holds for Active Investigations

When a regulatory investigation requires preservation of specific records, apply legal holds:

```bash
# Apply legal hold for an SEC investigation
az storage container legal-hold set \
  --account-name stsec17a4records \
  --container-name trade-records \
  --tags "SEC-INV-2026-0042" "FINRA-REQ-2026-0015"

# Verify legal holds are active
az storage container legal-hold show \
  --account-name stsec17a4records \
  --container-name trade-records
```

Legal holds prevent deletion even after the retention period expires. They remain in effect until explicitly removed:

```bash
# Remove a specific legal hold tag when investigation concludes
az storage container legal-hold clear \
  --account-name stsec17a4records \
  --container-name trade-records \
  --tags "SEC-INV-2026-0042"
```

## Step 7: Set Up an Index for Record Retrieval

SEC 17a-4 requires an index for record retrieval. Use Azure Cognitive Search or a custom index stored in a database:

```bash
# Create a search service for indexing records
az search service create \
  --name srch-sec-records \
  --resource-group rg-sec-compliance \
  --sku standard \
  --location eastus2

# Create an indexer that scans blob metadata
# This allows searching records by type, date, and record ID
```

Alternatively, maintain an index in Azure SQL or Cosmos DB that stores metadata for each record along with its blob path. The index itself does not need immutability since it is a reference to the immutable data.

## Step 8: Configure Audit Logging

Enable diagnostic logging to track all access to compliance data:

```bash
# Enable diagnostic settings for comprehensive audit logging
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-sec-compliance/providers/Microsoft.Storage/storageAccounts/stsec17a4records/blobServices/default" \
  --name diag-sec-audit \
  --workspace law-compliance-audit \
  --logs '[{"category":"StorageRead","enabled":true},{"category":"StorageWrite","enabled":true},{"category":"StorageDelete","enabled":true}]' \
  --metrics '[{"category":"Transaction","enabled":true}]'
```

These logs capture who accessed what records and when, which is essential for demonstrating compliance during audits.

## Step 9: Grant Designated Examiner Access

SEC 17a-4 requires that a designated third party (typically FINRA or another SRO) can access records. Create a read-only role assignment:

```bash
# Create a custom role with read-only access to compliance storage
az role assignment create \
  --assignee "examiner@finra.org" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-sec-compliance/providers/Microsoft.Storage/storageAccounts/stsec17a4records"
```

For external examiners, you may need to use Azure AD B2B to invite them to your tenant, or generate time-limited SAS tokens for specific containers.

## Compliance Validation Checklist

Before going to production, verify these items:

- Immutability policies are locked on all compliance containers
- Retention periods match SEC requirements (3 or 6 years)
- Network access is restricted to authorized sources
- Audit logging is enabled and flowing to a secure workspace
- Record index is operational and searchable
- Designated examiner access has been tested
- Geo-redundant replication is active and healthy
- Disaster recovery plan has been tested

## Wrapping Up

Azure Blob Storage immutable policies provide a cloud-native way to meet SEC 17a-4 WORM storage requirements. The critical steps are creating containers with appropriate retention periods, locking the policies to make them irrevocable, and setting up audit logging and examiner access. Once locked, the policies guarantee that records cannot be modified or deleted, giving you the compliance assurance that regulators require. Always work with your legal and compliance teams to verify that your specific implementation meets your regulatory obligations, and reference the Cohasset Associates assessment when discussing Azure compliance with auditors.
