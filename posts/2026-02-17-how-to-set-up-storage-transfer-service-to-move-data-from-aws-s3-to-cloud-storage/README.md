# How to Set Up Storage Transfer Service to Move Data from AWS S3 to Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Storage Transfer Service, AWS S3, Cloud Storage, Data Migration

Description: A practical guide to using GCP Storage Transfer Service to move data from AWS S3 buckets to Google Cloud Storage, including one-time transfers and ongoing synchronization.

---

Moving data between cloud providers is one of the most common migration tasks. Whether you are migrating away from AWS, setting up a multi-cloud architecture, or just need to get data into GCP for processing, Storage Transfer Service (STS) is the purpose-built tool for moving data from S3 to Cloud Storage.

STS handles the complexities you would rather not deal with: parallel transfers, retry logic, bandwidth throttling, checksum verification, and scheduling. You point it at a source bucket, tell it where to put the data, and it takes care of the rest. In this post, I will cover setting up both one-time and recurring transfers from S3 to Cloud Storage.

## How Storage Transfer Service Works

STS runs as a managed service on GCP's infrastructure. It pulls data from the source (S3) and writes it to the destination (Cloud Storage). The transfer happens over Google's network backbone, which is typically faster than transferring through a client machine.

```mermaid
flowchart LR
    A[AWS S3 Bucket] -->|Pull data| B[Storage Transfer Service]
    B -->|Write data| C[Cloud Storage Bucket]
    B -->|Logs| D[Cloud Logging]

    style B fill:#4285f4,stroke:#333,color:#fff
```

Key features:

- Parallel transfer for high throughput
- Automatic retries for failed objects
- Checksum verification to ensure data integrity
- Filtering by prefix, modification time, or file size
- Scheduling for recurring transfers
- Bandwidth limiting to avoid impacting production traffic

## Prerequisites

- Storage Transfer Service API enabled
- An AWS IAM user or role with read access to the S3 bucket
- A Cloud Storage destination bucket
- Storage Transfer Admin role on the GCP project

```bash
# Enable the Storage Transfer API
gcloud services enable storagetransfer.googleapis.com --project=PROJECT_ID
```

## Step 1: Prepare AWS Credentials

Create an IAM user in AWS with the minimum required permissions for S3 read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::source-bucket-name",
        "arn:aws:s3:::source-bucket-name/*"
      ]
    }
  ]
}
```

Generate an access key and secret key for this user. You will need both for the transfer configuration.

## Step 2: Create the Destination Bucket

```bash
# Create a Cloud Storage bucket for the transferred data
gsutil mb -p PROJECT_ID -l us-central1 -c standard gs://my-destination-bucket/

# If you want to match the S3 bucket's region for latency
# us-east-1 in AWS roughly maps to us-east1 or us-east4 in GCP
```

## Step 3: Create a One-Time Transfer Job

For a simple one-time transfer using gcloud:

```bash
# Create a one-time transfer from S3 to Cloud Storage
gcloud transfer jobs create \
  s3://source-bucket-name \
  gs://my-destination-bucket \
  --source-creds-file=aws-creds.json \
  --project=PROJECT_ID \
  --name="s3-to-gcs-migration" \
  --description="One-time migration from AWS S3"
```

The `aws-creds.json` file should contain:

```json
{
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

## Step 4: Create a Transfer with Filtering

You often do not want to transfer everything. Use filters to select specific objects:

```bash
# Transfer only objects under a specific prefix, modified in the last 7 days
gcloud transfer jobs create \
  s3://source-bucket-name/data/2024/ \
  gs://my-destination-bucket/imported/2024/ \
  --source-creds-file=aws-creds.json \
  --project=PROJECT_ID \
  --name="filtered-transfer" \
  --include-prefixes="logs/,events/" \
  --exclude-prefixes="temp/,staging/" \
  --include-modified-after-relative=7d
```

## Step 5: Create a Scheduled Recurring Transfer

For ongoing synchronization, set up a recurring transfer:

```bash
# Create a daily recurring transfer that syncs new/changed objects
gcloud transfer jobs create \
  s3://source-bucket-name \
  gs://my-destination-bucket \
  --source-creds-file=aws-creds.json \
  --project=PROJECT_ID \
  --name="daily-s3-sync" \
  --description="Daily sync from S3 to GCS" \
  --schedule-starts="2026-02-17T02:00:00Z" \
  --schedule-repeats-every=P1D \
  --overwrite-when=DIFFERENT \
  --delete-from=DESTINATION_IF_UNIQUE
```

Key scheduling options:

- `--schedule-repeats-every=P1D`: Run daily (P1D = period of 1 day)
- `--overwrite-when=DIFFERENT`: Only overwrite if the object has changed
- `--delete-from=DESTINATION_IF_UNIQUE`: Delete objects in the destination that no longer exist in the source (mirror mode)

## Step 6: Using the Python API for Complex Transfers

For more control, use the Storage Transfer API directly:

```python
from google.cloud import storage_transfer_v1
from datetime import datetime, timedelta

def create_s3_transfer_job(project_id, source_bucket, dest_bucket,
                            aws_access_key, aws_secret_key):
    """Create a Storage Transfer job from S3 to Cloud Storage."""

    client = storage_transfer_v1.StorageTransferServiceClient()

    # Configure the transfer
    transfer_job = storage_transfer_v1.TransferJob(
        project_id=project_id,
        description="S3 to GCS migration",
        status=storage_transfer_v1.TransferJob.Status.ENABLED,
        transfer_spec=storage_transfer_v1.TransferSpec(
            # Source: AWS S3
            aws_s3_data_source=storage_transfer_v1.AwsS3Data(
                bucket_name=source_bucket,
                aws_access_key=storage_transfer_v1.AwsAccessKey(
                    access_key_id=aws_access_key,
                    secret_access_key=aws_secret_key,
                ),
            ),
            # Destination: Cloud Storage
            gcs_data_sink=storage_transfer_v1.GcsData(
                bucket_name=dest_bucket,
                path="imported/",
            ),
            # Transfer options
            transfer_options=storage_transfer_v1.TransferOptions(
                overwrite_objects_already_existing_in_sink=False,
                delete_objects_from_source_after_transfer=False,
                overwrite_when="DIFFERENT",
            ),
            # Object conditions - only transfer objects matching criteria
            object_conditions=storage_transfer_v1.ObjectConditions(
                min_time_elapsed_since_last_modification=timedelta(seconds=0),
                max_time_elapsed_since_last_modification=timedelta(days=30),
                include_prefixes=["data/", "logs/"],
                exclude_prefixes=["temp/", "cache/"],
            ),
        ),
        # Schedule: run once, starting now
        schedule=storage_transfer_v1.Schedule(
            schedule_start_date={
                "year": datetime.now().year,
                "month": datetime.now().month,
                "day": datetime.now().day,
            },
            schedule_end_date={
                "year": datetime.now().year,
                "month": datetime.now().month,
                "day": datetime.now().day,
            },
        ),
    )

    result = client.create_transfer_job(
        request={"transfer_job": transfer_job}
    )

    print(f"Transfer job created: {result.name}")

    # Run the job immediately
    client.run_transfer_job(
        request={
            "job_name": result.name,
            "project_id": project_id,
        }
    )

    print("Transfer job started")
    return result

create_s3_transfer_job(
    project_id="my-project",
    source_bucket="source-bucket-name",
    dest_bucket="my-destination-bucket",
    aws_access_key="AKIAIOSFODNN7EXAMPLE",
    aws_secret_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
)
```

## Step 7: Monitor Transfer Progress

```bash
# List all transfer jobs
gcloud transfer jobs list --project=PROJECT_ID

# Check a specific job's status
gcloud transfer jobs describe s3-to-gcs-migration --project=PROJECT_ID

# List transfer operations (individual runs)
gcloud transfer operations list --job-names=s3-to-gcs-migration --project=PROJECT_ID

# Monitor a running operation
gcloud transfer operations describe OPERATION_NAME --project=PROJECT_ID
```

Check detailed progress:

```bash
# Get transfer counters (bytes transferred, objects copied, etc.)
gcloud transfer operations describe OPERATION_NAME \
  --format="yaml(metadata.counters)" \
  --project=PROJECT_ID
```

## Step 8: Verify the Transfer

After the transfer completes, verify data integrity:

```bash
# Compare object counts between source and destination
# On the source (using AWS CLI)
aws s3 ls s3://source-bucket-name --recursive --summarize | tail -2

# On the destination
gsutil ls -r gs://my-destination-bucket/** | wc -l

# Check the total size
gsutil du -s gs://my-destination-bucket/
```

STS performs checksum verification automatically, but you can also spot-check specific objects:

```bash
# Check a specific object's checksum
gsutil stat gs://my-destination-bucket/path/to/object.dat
```

## Managing Transfer Costs

Data transfer costs are an important consideration:

- **S3 egress charges**: AWS charges for data leaving S3. This is typically the largest cost component. As of this writing, it is around $0.09/GB for the first 10 TB.
- **Cloud Storage ingress**: GCP does not charge for data coming into Cloud Storage.
- **STS service**: The Storage Transfer Service itself is free.

For very large transfers (petabytes), consider using Transfer Appliance instead, which is a physical device you load with data and ship to Google.

To estimate costs:

```python
# Quick cost estimate for S3 egress
data_size_gb = 1000  # 1 TB
s3_egress_per_gb = 0.09  # First 10 TB tier
estimated_cost = data_size_gb * s3_egress_per_gb
print(f"Estimated S3 egress cost: ${estimated_cost:.2f}")
```

## Bandwidth Throttling

If the S3 bucket serves production traffic, throttle the transfer to avoid impacting your users:

```python
# Set bandwidth limit on the transfer
transfer_spec = storage_transfer_v1.TransferSpec(
    # ... source and destination config ...
    transfer_options=storage_transfer_v1.TransferOptions(
        # Limit bandwidth to 50 MB/s
        metadata_options=storage_transfer_v1.MetadataOptions(
            # Available in newer API versions
        ),
    ),
)
```

You can also schedule transfers during off-peak hours using the scheduling configuration.

## Tips for Large Migrations

**Start with a test transfer.** Transfer a small subset first to verify the configuration works and estimate the full transfer time.

**Use prefix filters for parallel jobs.** If you have a huge bucket, create multiple transfer jobs with different prefix filters to parallelize the work.

**Monitor for errors.** Some objects may fail to transfer (permissions, name encoding issues). Check the transfer operation logs for errors and handle them separately.

**Plan for the egress bill.** S3 egress charges add up quickly for large transfers. Budget for this and consider negotiating with AWS for reduced egress rates if you are moving a large volume.

## Summary

Storage Transfer Service provides a reliable, managed way to move data from S3 to Cloud Storage. Set up AWS credentials with minimal required permissions, create transfer jobs with appropriate filtering, and use scheduling for ongoing synchronization. The service handles parallelism, retries, and verification automatically. For large migrations, plan around S3 egress costs and consider running parallel jobs with prefix filters for faster throughput.
