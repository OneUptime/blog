# How to Migrate Azure Blob Storage to Google Cloud Storage Using gsutil

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, Azure Blob Storage, gsutil, Data Migration, Cloud Migration

Description: A practical walkthrough for migrating data from Azure Blob Storage to Google Cloud Storage using gsutil, including authentication setup, large-scale transfers, and validation.

---

Moving data between Azure Blob Storage and Google Cloud Storage is one of the most common tasks in a cloud migration. Google provides several tools for this, but gsutil is often the most practical choice for hands-on migrations where you want direct control over what gets transferred and when.

This guide covers using gsutil for the migration, along with the Storage Transfer Service for larger datasets.

## Tool Options

You have several choices for the transfer:

| Tool | Best For |
|------|----------|
| gsutil cp/rsync | Interactive migration, smaller datasets, fine-grained control |
| Storage Transfer Service | Large datasets (TB+), scheduled recurring transfers |
| Transfer Appliance | Massive datasets (petabytes), limited network bandwidth |
| gcloud storage | Newer CLI tool, gsutil replacement with similar commands |

For most migrations under a few TB, gsutil works well and gives you the most control.

## Step 1: Set Up Authentication

gsutil needs access to both Azure Blob Storage and Google Cloud Storage.

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project my-gcp-project

# For Azure Blob Storage, you will need a SAS token or connection string
# Generate a SAS token with read and list permissions
az storage container generate-sas \
  --account-name mystorageaccount \
  --name my-container \
  --permissions rl \
  --expiry 2026-03-17 \
  --output tsv
```

Configure your .boto file to include Azure credentials:

```bash
# Create or edit the gsutil configuration
# Add Azure credentials for cross-cloud transfer
gsutil config
```

However, gsutil does not natively support Azure as a source. The recommended approach is to use AzCopy to download to local/intermediate storage, or use the Storage Transfer Service. For direct transfers with gsutil, you can mount Azure Blob Storage using blobfuse and then copy from the mount point.

The most practical approach for gsutil specifically is a two-step process:

## Step 2: Download from Azure Blob Storage

Use AzCopy or the Azure CLI to download data locally or to an intermediate machine.

```bash
# Install AzCopy if not already available
# Download from Azure Blob Storage
azcopy copy \
  "https://mystorageaccount.blob.core.windows.net/my-container/*?sv=2021-06-08&ss=b&srt=co&sp=rl&se=2026-03-17&sig=YOUR_SAS_TOKEN" \
  "/data/migration/" \
  --recursive

# Or use Azure CLI
az storage blob download-batch \
  --account-name mystorageaccount \
  --source my-container \
  --destination /data/migration/ \
  --pattern '*'
```

For large transfers, use a high-bandwidth VM in the same region as your Azure storage to minimize egress time.

## Step 3: Upload to Google Cloud Storage with gsutil

Now use gsutil to upload the data to GCS.

```bash
# Create the destination GCS bucket
gsutil mb -l us-central1 -c standard gs://my-gcs-bucket

# Upload data using gsutil with parallel composite uploads for large files
gsutil -m cp -r /data/migration/* gs://my-gcs-bucket/

# For better performance with large files, enable parallel composite uploads
gsutil -o "GSUtil:parallel_composite_upload_threshold=150M" \
  -m cp -r /data/migration/* gs://my-gcs-bucket/
```

Key gsutil flags for migration:

```bash
# -m: Enable multi-threaded/multi-processing transfers
# -r: Recursive copy
# -n: No-clobber (skip files that already exist at destination)
# -c: Continue on errors

# Full migration command with all useful flags
gsutil -m cp -r -n -c /data/migration/* gs://my-gcs-bucket/
```

## Step 4: Use gsutil rsync for Incremental Transfers

For ongoing synchronization during the migration period, use gsutil rsync.

```bash
# Sync local directory to GCS (only transfers changed files)
gsutil -m rsync -r -d /data/migration/ gs://my-gcs-bucket/

# Flags:
# -r: Recursive
# -d: Delete files at destination that do not exist at source
# -n: Dry run (preview what would be transferred)
# -c: Compare using checksums instead of mtime/size

# Do a dry run first to see what will be transferred
gsutil -m rsync -r -d -n /data/migration/ gs://my-gcs-bucket/
```

## Step 5: Use Storage Transfer Service for Large Datasets

For datasets over a few TB, or when you want to avoid an intermediate download step, use the Storage Transfer Service which can pull directly from Azure.

```bash
# Create a transfer job from Azure Blob Storage to GCS
gcloud transfer jobs create \
  "https://mystorageaccount.blob.core.windows.net/my-container" \
  gs://my-gcs-bucket \
  --source-creds-file=azure-creds.json \
  --description="Azure to GCS migration"
```

The azure-creds.json file should contain:

```json
{
  "azureCredentials": {
    "sasToken": "your-sas-token-here",
    "storageAccount": "mystorageaccount"
  }
}
```

Monitor the transfer:

```bash
# List transfer jobs
gcloud transfer jobs list

# Monitor a specific job
gcloud transfer jobs monitor JOB_ID
```

## Step 6: Map Storage Tiers

Azure Blob Storage tiers should be mapped to equivalent GCS storage classes:

| Azure Tier | GCS Storage Class |
|-----------|------------------|
| Hot | Standard |
| Cool | Nearline |
| Cold | Coldline |
| Archive | Archive |

Set the storage class during upload or configure lifecycle rules:

```bash
# Upload directly to a specific storage class
gsutil -m cp -r -s nearline /data/migration/archive/* gs://my-gcs-bucket/archive/

# Set a lifecycle policy to automatically transition objects
gsutil lifecycle set lifecycle.json gs://my-gcs-bucket
```

Create a lifecycle configuration:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesStorageClass": ["STANDARD"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90,
          "matchesStorageClass": ["NEARLINE"]
        }
      }
    ]
  }
}
```

## Step 7: Preserve Metadata

Azure Blob Storage metadata should be preserved during transfer. gsutil handles Content-Type automatically, but custom metadata needs explicit handling.

```bash
# Check metadata on Azure blobs
az storage blob metadata show \
  --account-name mystorageaccount \
  --container-name my-container \
  --name my-file.pdf

# gsutil preserves Content-Type, Content-Encoding, and other standard headers
# For custom metadata, you may need to set it after upload
gsutil setmeta -h "x-goog-meta-original-source:azure" gs://my-gcs-bucket/my-file.pdf
```

For bulk metadata transfer, write a script:

```python
from azure.storage.blob import BlobServiceClient
from google.cloud import storage

# Transfer metadata from Azure to GCS
azure_client = BlobServiceClient.from_connection_string(azure_conn_str)
gcs_client = storage.Client()

container = azure_client.get_container_client('my-container')
bucket = gcs_client.bucket('my-gcs-bucket')

for blob in container.list_blobs():
    # Get Azure blob metadata
    blob_client = container.get_blob_client(blob.name)
    properties = blob_client.get_blob_properties()
    metadata = properties.metadata

    if metadata:
        # Apply metadata to GCS object
        gcs_blob = bucket.blob(blob.name)
        gcs_blob.metadata = metadata
        gcs_blob.patch()
        print(f"Updated metadata for: {blob.name}")
```

## Step 8: Validate the Migration

Verify data integrity after the transfer.

```bash
# Compare object counts
echo "Azure object count:"
az storage blob list \
  --account-name mystorageaccount \
  --container-name my-container \
  --query 'length(@)'

echo "GCS object count:"
gsutil ls -r gs://my-gcs-bucket/** | wc -l

# Verify total size
gsutil du -s gs://my-gcs-bucket/

# Check checksums for a sample of files
gsutil hash gs://my-gcs-bucket/sample-file.zip
```

For comprehensive validation:

```bash
# Use gsutil rsync in dry-run mode to find differences
# This will show files that differ between source and destination
gsutil -m rsync -r -d -n /data/migration/ gs://my-gcs-bucket/ 2>&1 | head -50
```

## Performance Tuning

Optimize gsutil for faster transfers:

```bash
# Increase parallelism in .boto configuration
# Or set via command-line options
gsutil -o "GSUtil:parallel_thread_count=24" \
  -o "GSUtil:parallel_process_count=12" \
  -o "GSUtil:parallel_composite_upload_threshold=150M" \
  -m cp -r /data/migration/* gs://my-gcs-bucket/
```

For network-limited transfers, consider running the migration from a VM close to the data source and using a high-bandwidth machine type.

## Summary

For Azure Blob Storage to GCS migrations, the approach depends on your data volume. For datasets up to a few TB, the AzCopy download followed by gsutil upload workflow gives you the most control. For larger datasets, the Storage Transfer Service can pull directly from Azure without an intermediate step. Use gsutil rsync for incremental synchronization during the migration window. Always validate object counts and checksums after the transfer, and map your Azure storage tiers to equivalent GCS storage classes to maintain your cost optimization strategy.
