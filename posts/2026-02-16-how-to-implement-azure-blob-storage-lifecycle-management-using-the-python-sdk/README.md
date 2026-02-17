# How to Implement Azure Blob Storage Lifecycle Management Using the Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Blob Storage, Python, Lifecycle Management, SDK, Cloud Storage, Cost Optimization, Automation

Description: Implement Azure Blob Storage lifecycle management policies using the Python SDK to automate tiering, archiving, and deletion of blobs.

---

Storage costs can sneak up on you. You upload files to Azure Blob Storage for hot access, but most of those files are only accessed frequently for the first few days or weeks. After that, they sit there in the Hot tier, costing more than they need to. Azure Blob Storage lifecycle management policies let you automatically move blobs between tiers (Hot, Cool, Cold, Archive) and delete them based on rules you define.

In this post, we will use the Azure Blob Storage Python SDK to programmatically create, update, and manage lifecycle management policies. We will also build custom logic for scenarios that go beyond what the built-in policies can do.

## Understanding Storage Tiers

Azure Blob Storage has four access tiers, each with different pricing:

- **Hot**: Highest storage cost, lowest access cost. For frequently accessed data.
- **Cool**: Lower storage cost, higher access cost. For data accessed infrequently (at least 30 days).
- **Cold**: Even lower storage cost. For data accessed rarely (at least 90 days).
- **Archive**: Lowest storage cost, highest access cost. For data that can tolerate hours of retrieval latency.

The pricing difference is significant. Archive storage costs roughly 90% less than Hot storage, but retrieving a blob from Archive can take hours and costs more per operation.

## Setup

```bash
# Install the Azure Storage and Management SDKs
pip install azure-storage-blob azure-mgmt-storage azure-identity
```

## Creating Lifecycle Policies with the Management SDK

The lifecycle management policy is set at the storage account level using the management SDK.

```python
# lifecycle_policy.py
# Create and manage lifecycle management policies for Azure Blob Storage
from azure.identity import DefaultAzureCredential
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.storage.models import (
    ManagementPolicy,
    ManagementPolicySchema,
    ManagementPolicyRule,
    ManagementPolicyDefinition,
    ManagementPolicyFilter,
    ManagementPolicyAction,
    ManagementPolicyBaseBlob,
    DateAfterModification,
    DateAfterCreation,
    ManagementPolicySnapShot,
)

# Authentication using DefaultAzureCredential
credential = DefaultAzureCredential()
subscription_id = "your-subscription-id"
resource_group = "storage-rg"
account_name = "mystorageaccount"

# Create the management client
storage_client = StorageManagementClient(credential, subscription_id)

def create_lifecycle_policy():
    """
    Create a lifecycle management policy with multiple rules.
    Each rule targets different blob prefixes and applies different actions.
    """
    rules = []

    # Rule 1: Move log files to Cool after 30 days, Archive after 90 days, delete after 365 days
    log_rule = ManagementPolicyRule(
        name="manage-log-files",
        enabled=True,
        type="Lifecycle",
        definition=ManagementPolicyDefinition(
            filters=ManagementPolicyFilter(
                blob_types=["blockBlob"],
                prefix_match=["logs/"],  # Only applies to blobs in the logs/ prefix
            ),
            actions=ManagementPolicyAction(
                base_blob=ManagementPolicyBaseBlob(
                    # Move to Cool tier 30 days after last modification
                    tier_to_cool=DateAfterModification(
                        days_after_modification_greater_than=30
                    ),
                    # Move to Archive tier 90 days after last modification
                    tier_to_archive=DateAfterModification(
                        days_after_modification_greater_than=90
                    ),
                    # Delete 365 days after last modification
                    delete=DateAfterModification(
                        days_after_modification_greater_than=365
                    ),
                ),
                # Also clean up snapshots
                snapshot=ManagementPolicySnapShot(
                    delete=DateAfterCreation(
                        days_after_creation_greater_than=90
                    ),
                ),
            ),
        ),
    )
    rules.append(log_rule)

    # Rule 2: Move uploaded media to Cool after 7 days, Archive after 60 days
    media_rule = ManagementPolicyRule(
        name="manage-media-files",
        enabled=True,
        type="Lifecycle",
        definition=ManagementPolicyDefinition(
            filters=ManagementPolicyFilter(
                blob_types=["blockBlob"],
                prefix_match=["media/", "uploads/"],
            ),
            actions=ManagementPolicyAction(
                base_blob=ManagementPolicyBaseBlob(
                    tier_to_cool=DateAfterModification(
                        days_after_modification_greater_than=7
                    ),
                    tier_to_archive=DateAfterModification(
                        days_after_modification_greater_than=60
                    ),
                ),
            ),
        ),
    )
    rules.append(media_rule)

    # Rule 3: Delete temporary files after 1 day
    temp_rule = ManagementPolicyRule(
        name="cleanup-temp-files",
        enabled=True,
        type="Lifecycle",
        definition=ManagementPolicyDefinition(
            filters=ManagementPolicyFilter(
                blob_types=["blockBlob"],
                prefix_match=["temp/", "tmp/"],
            ),
            actions=ManagementPolicyAction(
                base_blob=ManagementPolicyBaseBlob(
                    delete=DateAfterModification(
                        days_after_modification_greater_than=1
                    ),
                ),
            ),
        ),
    )
    rules.append(temp_rule)

    # Create the policy with all rules
    policy = ManagementPolicy(
        policy=ManagementPolicySchema(rules=rules)
    )

    # Apply the policy to the storage account
    result = storage_client.management_policies.create_or_update(
        resource_group_name=resource_group,
        account_name=account_name,
        management_policy_name="default",  # Must be "default"
        properties=policy,
    )

    print(f"Policy created with {len(result.policy.rules)} rules")
    return result
```

## Reading Existing Policies

```python
def get_current_policy():
    """Retrieve and display the current lifecycle management policy."""
    try:
        policy = storage_client.management_policies.get(
            resource_group_name=resource_group,
            account_name=account_name,
            management_policy_name="default",
        )

        print(f"Found {len(policy.policy.rules)} rules:")
        for rule in policy.policy.rules:
            print(f"\n  Rule: {rule.name}")
            print(f"  Enabled: {rule.enabled}")
            print(f"  Filters: {rule.definition.filters.prefix_match}")

            actions = rule.definition.actions.base_blob
            if actions.tier_to_cool:
                print(f"  Tier to Cool after: {actions.tier_to_cool.days_after_modification_greater_than} days")
            if actions.tier_to_archive:
                print(f"  Tier to Archive after: {actions.tier_to_archive.days_after_modification_greater_than} days")
            if actions.delete:
                print(f"  Delete after: {actions.delete.days_after_modification_greater_than} days")

        return policy
    except Exception as e:
        print(f"No policy found or error: {e}")
        return None
```

## Custom Lifecycle Logic with the Blob SDK

The built-in lifecycle policies are based on time since last modification. If you need more complex logic - like moving blobs based on access patterns, size, or custom metadata - you need to implement it yourself using the Blob SDK.

```python
# custom_lifecycle.py
# Custom lifecycle management logic using the Blob Storage SDK
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    account_url="https://mystorageaccount.blob.core.windows.net",
    credential=credential,
)

def tier_blobs_by_access_pattern(container_name, days_threshold=30):
    """
    Move blobs to Cool tier if they have not been accessed recently.
    Uses the last access time property (requires access time tracking to be enabled).
    """
    container = blob_service.get_container_client(container_name)
    moved_count = 0
    threshold_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)

    # List all blobs in the container
    for blob in container.list_blobs(include=["metadata"]):
        # Check the last access time
        last_access = blob.last_accessed_on

        if last_access and last_access < threshold_date:
            # Only move if currently in Hot tier
            if blob.blob_tier == "Hot":
                blob_client = container.get_blob_client(blob.name)
                blob_client.set_standard_blob_tier("Cool")
                moved_count += 1
                logger.info(f"Moved to Cool: {blob.name} (last accessed: {last_access})")

    logger.info(f"Moved {moved_count} blobs to Cool tier in {container_name}")
    return moved_count

def cleanup_by_size(container_name, max_total_gb=100):
    """
    If total container size exceeds a threshold,
    archive the oldest blobs until we are under the limit.
    """
    container = blob_service.get_container_client(container_name)

    # Collect all blob metadata
    blobs = []
    total_size = 0
    for blob in container.list_blobs():
        blobs.append({
            "name": blob.name,
            "size": blob.size,
            "last_modified": blob.last_modified,
            "tier": blob.blob_tier,
        })
        total_size += blob.size

    total_gb = total_size / (1024 ** 3)
    logger.info(f"Container {container_name}: {total_gb:.2f} GB total")

    if total_gb <= max_total_gb:
        logger.info("Under threshold, no action needed")
        return 0

    # Sort by last modified (oldest first) and archive until under limit
    blobs.sort(key=lambda b: b["last_modified"])
    archived_count = 0

    for blob in blobs:
        if total_gb <= max_total_gb:
            break

        if blob["tier"] not in ("Archive",):
            blob_client = container.get_blob_client(blob["name"])
            blob_client.set_standard_blob_tier("Archive")
            total_gb -= blob["size"] / (1024 ** 3)
            archived_count += 1
            logger.info(f"Archived: {blob['name']} ({blob['size'] / (1024**2):.1f} MB)")

    logger.info(f"Archived {archived_count} blobs")
    return archived_count

def cleanup_by_metadata(container_name, metadata_key, metadata_value):
    """
    Delete blobs that match specific metadata criteria.
    Useful for cleaning up processed or temporary data.
    """
    container = blob_service.get_container_client(container_name)
    deleted_count = 0

    for blob in container.list_blobs(include=["metadata"]):
        metadata = blob.metadata or {}
        if metadata.get(metadata_key) == metadata_value:
            container.delete_blob(blob.name)
            deleted_count += 1
            logger.info(f"Deleted: {blob.name}")

    logger.info(f"Deleted {deleted_count} blobs matching {metadata_key}={metadata_value}")
    return deleted_count
```

## Running as an Azure Function

Schedule the custom lifecycle logic to run periodically using a timer-triggered Azure Function.

```python
# Timer-triggered function for custom lifecycle management
import azure.functions as func
from custom_lifecycle import tier_blobs_by_access_pattern, cleanup_by_size

app = func.FunctionApp()

@app.timer_trigger(
    schedule="0 0 2 * * *",  # Run daily at 2 AM UTC
    arg_name="timer",
)
def lifecycle_manager(timer: func.TimerRequest):
    """
    Daily lifecycle management job.
    Runs custom tiering and cleanup logic.
    """
    if timer.past_due:
        logging.warning("Timer is past due, running anyway")

    # Tier blobs not accessed in 30 days
    tier_blobs_by_access_pattern("data-lake", days_threshold=30)

    # Keep container under 500 GB by archiving old blobs
    cleanup_by_size("backups", max_total_gb=500)

    # Clean up processed files
    cleanup_by_metadata("processing", "status", "completed")
```

## Monitoring Cost Savings

Track the cost impact of your lifecycle policies by monitoring the blob count and size per tier.

```python
def get_tier_statistics(container_name):
    """Get blob count and total size per storage tier."""
    container = blob_service.get_container_client(container_name)
    stats = {}

    for blob in container.list_blobs():
        tier = blob.blob_tier or "Unknown"
        if tier not in stats:
            stats[tier] = {"count": 0, "size_gb": 0}
        stats[tier]["count"] += 1
        stats[tier]["size_gb"] += blob.size / (1024 ** 3)

    for tier, data in stats.items():
        print(f"  {tier}: {data['count']} blobs, {data['size_gb']:.2f} GB")

    return stats
```

## Summary

Lifecycle management is essential for controlling Azure Blob Storage costs. The built-in policies handle time-based tiering and deletion well, and you can configure them programmatically through the management SDK. For more complex scenarios - access pattern-based tiering, size-based cleanup, or metadata-driven deletion - build custom logic with the Blob SDK and run it on a schedule with Azure Functions. The combination gives you full control over your storage lifecycle while keeping costs in check.
