# How to Configure Azure Blob Storage Retention Policies for Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Retention Policies, Compliance, Data Governance, Cloud Storage

Description: Learn how to configure retention policies in Azure Blob Storage to meet regulatory compliance requirements and protect critical data from accidental deletion.

---

Regulatory compliance is one of the biggest headaches in cloud storage. Whether you are dealing with GDPR, HIPAA, or financial regulations, having proper data retention policies in place is non-negotiable. Azure Blob Storage provides built-in immutability features that let you enforce retention policies at the container or blob level, ensuring data cannot be modified or deleted until the retention period expires.

In this guide, we will walk through the process of configuring retention policies for Azure Blob Storage, covering both time-based retention and legal holds.

## Understanding Immutable Storage in Azure

Azure Blob Storage supports two types of immutability policies:

1. **Time-based retention policies** - Data cannot be modified or deleted for a specified number of days.
2. **Legal hold policies** - Data cannot be modified or deleted until the legal hold is explicitly removed.

Both of these work on the container level when using the legacy approach, or at the version level when you enable versioning with version-level immutability.

The key difference is that time-based retention has a defined expiration, while legal holds remain active indefinitely until someone removes them. For compliance scenarios, you will often use both together.

## Prerequisites

Before we begin, make sure you have:

- An Azure subscription with appropriate permissions
- Azure CLI installed and configured
- A storage account with Blob Storage (or a general-purpose v2 account)
- The storage account must NOT have hierarchical namespace enabled (ADLS Gen2 is not supported for immutable policies on the legacy path)

## Step 1: Create a Storage Account with Versioning

If you are starting fresh, first create a storage account that supports version-level immutability.

The following CLI command creates a storage account and enables blob versioning, which is required for version-level immutability support:

```bash
# Create a resource group
az group create \
  --name rg-compliance-storage \
  --location eastus2

# Create the storage account with version-level immutability support
az storage account create \
  --name stcompliancedata2026 \
  --resource-group rg-compliance-storage \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-versioning true \
  --allow-blob-public-access false \
  --enable-version-level-immutability true
```

Enabling version-level immutability at account creation time is important because this setting cannot be changed after the account is created.

## Step 2: Create a Container with a Default Retention Policy

Now, create a container and set a default immutability policy on it. Any blobs uploaded to this container will inherit this policy unless overridden at the blob level.

This command creates a container and sets a default 365-day retention period:

```bash
# Create a container with a default immutability policy
az storage container immutability-policy create \
  --account-name stcompliancedata2026 \
  --container-name compliance-records \
  --period 365

# Verify the policy was applied
az storage container show \
  --account-name stcompliancedata2026 \
  --name compliance-records \
  --query "properties.immutabilityPolicy"
```

The `--period` value is in days. For most financial compliance scenarios, 2555 days (7 years) is common. For healthcare records under HIPAA, the retention period varies by record type.

## Step 3: Lock the Retention Policy

Here is an important distinction: when you first create a retention policy, it is in an unlocked state. An unlocked policy can be deleted or shortened. To make it truly compliant, you need to lock it.

Once locked, the policy cannot be deleted, and the retention period can only be extended, never shortened. This is irreversible.

```bash
# Get the current ETag of the policy (needed for locking)
ETAG=$(az storage container immutability-policy show \
  --account-name stcompliancedata2026 \
  --container-name compliance-records \
  --query "etag" -o tsv)

# Lock the policy (this is IRREVERSIBLE)
az storage container immutability-policy lock \
  --account-name stcompliancedata2026 \
  --container-name compliance-records \
  --if-match "$ETAG"
```

Think carefully before locking. Test your retention period in an unlocked state first. Once locked, even Azure support cannot remove it.

## Step 4: Configure Version-Level Retention Policies

For more granular control, you can set immutability policies on individual blob versions. This is useful when different documents in the same container have different retention requirements.

This Python snippet demonstrates how to upload a blob with a specific retention policy using the Azure SDK:

```python
from azure.storage.blob import BlobServiceClient, ImmutabilityPolicy
from datetime import datetime, timedelta

# Initialize the blob service client
connection_string = "your_connection_string_here"
blob_service = BlobServiceClient.from_connection_string(connection_string)

# Calculate expiration date (7 years from now)
expiry = datetime.utcnow() + timedelta(days=2555)

# Create an immutability policy for this specific blob
immutability = ImmutabilityPolicy(
    expiry_time=expiry,
    policy_mode="Unlocked"  # Start unlocked for testing
)

# Upload the blob with the retention policy
container_client = blob_service.get_container_client("compliance-records")
blob_client = container_client.get_blob_client("financial-report-2026-q1.pdf")

with open("financial-report-2026-q1.pdf", "rb") as data:
    blob_client.upload_blob(
        data,
        immutability_policy=immutability,
        overwrite=False  # Prevent overwrites for compliance
    )

print(f"Blob uploaded with retention until {expiry}")
```

## Step 5: Apply a Legal Hold

Legal holds are used when you have a pending legal matter and need to preserve data regardless of the retention policy. A blob under legal hold cannot be deleted even if the retention period has expired.

```bash
# Apply a legal hold tag to a container
az storage container legal-hold set \
  --account-name stcompliancedata2026 \
  --container-name compliance-records \
  --tags "case-2026-001" "investigation-q1"

# Verify the legal hold
az storage container legal-hold show \
  --account-name stcompliancedata2026 \
  --container-name compliance-records
```

Legal holds use tags to identify the reason for the hold. You can apply multiple tags and remove them individually. The hold is only fully released when all tags are cleared.

## Step 6: Monitor Policy Compliance

Once your policies are in place, you need to monitor them. Azure Policy can help you audit whether all storage accounts in your subscription have the proper retention policies configured.

The following policy definition ensures all blob containers have at least a 365-day retention policy:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.Storage/storageAccounts/blobServices/containers"
      },
      {
        "anyOf": [
          {
            "field": "Microsoft.Storage/storageAccounts/blobServices/containers/immutabilityPolicy.immutabilityPeriodSinceCreationInDays",
            "less": 365
          },
          {
            "field": "Microsoft.Storage/storageAccounts/blobServices/containers/immutabilityPolicy.immutabilityPeriodSinceCreationInDays",
            "exists": "false"
          }
        ]
      }
    ]
  },
  "then": {
    "effect": "audit"
  }
}
```

## Common Compliance Scenarios

Different regulations have different requirements. Here is a quick reference:

- **SEC 17a-4**: Requires WORM (Write Once Read Many) storage. Lock the retention policy and set the period to match the required duration (typically 6 years for most records).
- **GDPR**: Requires the ability to delete data upon request. Use unlocked policies with shorter retention, and pair them with lifecycle management to auto-delete after the period.
- **HIPAA**: Medical records typically require 6-10 year retention. Use locked time-based policies.
- **SOX**: Financial records need 7-year retention. Lock the policy with a 2555-day period.

## Troubleshooting Common Issues

One thing that trips people up: if you try to delete a blob that is under a retention policy, you will get a 409 Conflict error. This is by design. The error message will include the remaining retention time.

Another common issue is trying to enable immutability on a storage account with hierarchical namespace (Azure Data Lake Storage Gen2). As of early 2026, version-level immutability works with ADLS Gen2, but container-level policies may have limitations. Check the latest documentation if you are using Data Lake.

Finally, remember that retention policies apply to blob versions, not the blob name. If you overwrite a blob, the previous version retains its policy. The new version gets either the container default or whatever policy you explicitly set.

## Wrapping Up

Configuring retention policies in Azure Blob Storage is straightforward once you understand the distinction between time-based retention and legal holds, and between locked and unlocked policies. Start with unlocked policies during testing, verify your compliance requirements are met, and then lock the policies for production. Use Azure Policy to audit compliance across your entire organization, and always test your retention configuration in a non-production environment before deploying to production.

The combination of time-based retention, legal holds, and version-level immutability gives you the flexibility to meet virtually any regulatory requirement while keeping your data management practical and maintainable.
