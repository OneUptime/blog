# How to Use AWS Snowball Edge for Large Data Transfers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Snowball Edge, Data Transfer, Migration

Description: Guide to using AWS Snowball Edge for transferring petabyte-scale data to AWS when network transfer is too slow, covering device ordering, data loading, and job management.

---

When you need to move tens or hundreds of terabytes to AWS, doing it over the network can take weeks or even months. A 100 TB dataset over a 1 Gbps connection would take about 12 days of continuous transfer - assuming you can dedicate the entire link. In reality, it often takes much longer.

AWS Snowball Edge is a physical appliance that AWS ships to your data center. You load your data onto it, ship it back, and AWS imports it into S3. It sounds old school, but as the saying goes: never underestimate the bandwidth of a truck full of hard drives.

As of November 7, 2025, AWS Snowball Edge is no longer available to new customers. Existing customers can continue using it, but new customers should evaluate AWS DataSync, AWS Data Transfer Terminal, or AWS Partner solutions for new migration projects.

## Snowball Edge Device Options

For existing customers, AWS offers two Snowball Edge variants:

- **Snowball Edge Storage Optimized 210 TB**: 210 TB usable NVMe storage, 104 vCPUs, 416 GB RAM. Best for pure data transfer.
- **Snowball Edge Compute Optimized**: up to 104 vCPUs, 416 GB RAM, and 28 TB of dedicated NVMe SSD for compute instances. Best when you need to process data at the edge before shipping.

```mermaid
graph LR
    A[Order Device] --> B[Receive Device]
    B --> C[Connect & Load Data]
    C --> D[Ship to AWS]
    D --> E[AWS Imports to S3]
    E --> F[Device Wiped & Recycled]
```

## Step 1: Create a Snowball Edge Job

Start by creating a job in the AWS Snow Family console or CLI:

```bash
# Create an import job

aws snowball create-job \
  --job-type IMPORT \
  --resources '{
    "S3Resources": [{
      "BucketArn": "arn:aws:s3:::my-migration-bucket",
      "KeyRange": {}
    }]
  }' \
  --description "Data center migration - Phase 1" \
  --address-id "ADID-12345678-1234-1234-1234-123456789012" \
  --role-arn "arn:aws:iam::123456789012:role/SnowballImportRole" \
  --snowball-type "V3_5S" \
  --shipping-option "SECOND_DAY" \
  --snowball-capacity-preference "T240"
```

Before creating the job, you need to set up a shipping address and an IAM role:

```bash
# Create a shipping address
aws snowball create-address \
  --address '{
    "Name": "Data Center Shipping",
    "Company": "Acme Corp",
    "Street1": "123 Tech Park Drive",
    "City": "San Francisco",
    "StateOrProvince": "CA",
    "PostalCode": "94105",
    "Country": "US",
    "PhoneNumber": "415-555-0100"
  }'

# Create the IAM role for Snowball to write to S3
aws iam create-role \
  --role-name SnowballImportRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "importexport.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy \
  --role-name SnowballImportRole \
  --policy-name S3Import \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicy",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::my-migration-bucket",
        "arn:aws:s3:::my-migration-bucket/*"
      ]
    }]
  }'
```

## Step 2: Receive and Set Up the Device

Once AWS prepares and ships the Snowball Edge device, unbox it and connect it to your network. You'll need:

- A 10GbE, 25GbE, or 100GbE network connection (use the RJ45, SFP28, or QSFP28 port)
- Power (standard 110/220V outlet)
- The unlock code and manifest file from the AWS console

```bash
# Download the Snowball Edge client
# Available at: https://aws.amazon.com/snowball/resources/

# Get the credentials for your job
aws snowball get-job-unlock-code \
  --job-id JID-12345678-1234-1234-1234-123456789012 \
  --query UnlockCode \
  --output text

MANIFEST_URL=$(aws snowball get-job-manifest \
  --job-id JID-12345678-1234-1234-1234-123456789012 \
  --query ManifestURI \
  --output text)
curl -o manifest.bin "$MANIFEST_URL"

# Unlock the device
snowballEdge unlock-device \
  --manifest-file manifest.bin \
  --unlock-code "12345-abcde-12345-abcde-12345" \
  --endpoint https://192.168.1.200
```

## Step 3: Configure the Network Interface

After unlocking, configure the device's network:

```bash
# List available network interfaces
snowballEdge describe-device \
  --endpoint https://192.168.1.200 \
  --manifest-file manifest.bin \
  --unlock-code "12345-abcde-12345-abcde-12345"

# Get the S3 endpoint on the device
snowballEdge list-access-keys \
  --endpoint https://192.168.1.200 \
  --manifest-file manifest.bin \
  --unlock-code "12345-abcde-12345-abcde-12345"

# Get the S3 credentials
snowballEdge get-secret-access-key \
  --access-key-id AKIA... \
  --endpoint https://192.168.1.200 \
  --manifest-file manifest.bin \
  --unlock-code "12345-abcde-12345-abcde-12345"
```

## Step 4: Load Data onto the Device

For data transfer jobs, the Snowball Edge exposes a local Amazon S3 adapter endpoint. You use the AWS CLI supported by the S3 adapter to copy data:

```bash
# Configure a profile for the Snowball Edge
aws configure set profile.snowball.aws_access_key_id AKIA...
aws configure set profile.snowball.aws_secret_access_key SECRET...
aws configure set profile.snowball.region snow

# Copy data to the bucket you specified in the job
aws s3 cp /data/migration/ s3://my-migration-bucket/ \
  --recursive \
  --profile snowball \
  --endpoint-url https://192.168.1.200:8443
```

For faster transfers, use multiple parallel copy operations:

```bash
# Use S3 sync with increased concurrency
aws configure set profile.snowball.s3.max_concurrent_requests 128
aws configure set profile.snowball.s3.multipart_chunksize 64MB

# Sync large directory trees
aws s3 sync /data/databases/ s3://my-migration-bucket/databases/ \
  --profile snowball \
  --endpoint-url https://192.168.1.200:8443

aws s3 sync /data/media/ s3://my-migration-bucket/media/ \
  --profile snowball \
  --endpoint-url https://192.168.1.200:8443
```

Running multiple sync commands in parallel from different terminals can significantly speed things up, as each command can saturate its own set of connections.

## Step 5: Verify Data on the Device

Before shipping, verify that everything transferred correctly:

```bash
# List the contents on the device
aws s3 ls s3://my-migration-bucket/ \
  --recursive \
  --summarize \
  --profile snowball \
  --endpoint-url https://192.168.1.200:8443

# Compare file counts
LOCAL_COUNT=$(find /data/migration -type f | wc -l)
SNOW_COUNT=$(aws s3 ls s3://my-migration-bucket/ --recursive \
  --profile snowball \
  --endpoint-url https://192.168.1.200:8443 | wc -l)

echo "Local files: $LOCAL_COUNT, Snowball files: $SNOW_COUNT"
```

## Step 6: Ship the Device Back

Once you've loaded and verified your data:

```bash
# Stop writes, wait for any copy commands to finish, then power off the device
```

The device has an E Ink shipping label that automatically displays the return address when you power it off. Just hand it to the carrier (UPS in the US).

## Step 7: Monitor the Import

Track your job's progress:

```bash
# Check job status
aws snowball describe-job \
  --job-id JID-12345678-1234-1234-1234-123456789012 \
  --query '{
    Status: JobMetadata.JobState,
    BytesTransferred: JobMetadata.DataTransferProgress.BytesTransferred,
    ObjectsTransferred: JobMetadata.DataTransferProgress.ObjectsTransferred,
    TotalBytes: JobMetadata.DataTransferProgress.TotalBytes,
    TotalObjects: JobMetadata.DataTransferProgress.TotalObjects
  }'

# After import completes, download the job report and success/failure logs
# from the AWS Snow Family console.
```

After AWS receives the device, monitor the job until it reaches `Complete`. You'll get an SNS notification when it's complete if you configured notifications on the job.

## Ordering Multiple Devices

For petabyte-scale migrations, you'll need multiple Snowball Edge devices. Create separate import jobs for each device; Snowball Edge clusters are for local use jobs, not S3 import jobs:

```bash
# Create another import job for the next device
aws snowball create-job \
  --job-type IMPORT \
  --resources '{
    "S3Resources": [{
      "BucketArn": "arn:aws:s3:::my-migration-bucket"
    }]
  }' \
  --description "PB-scale migration - device 2" \
  --address-id "ADID-12345678-1234-1234-1234-123456789012" \
  --role-arn "arn:aws:iam::123456789012:role/SnowballImportRole" \
  --snowball-type "V3_5S" \
  --shipping-option "SECOND_DAY" \
  --snowball-capacity-preference "T240"
```

## Cost Breakdown

Snowball Edge pricing includes a service fee per job plus daily charges after the included onsite usage period. For example, in US Regions, AWS lists Storage Optimized 210 TB on-demand job fees by data size, includes 15 onsite days, and charges additional per-day fees after that; shipping is charged separately. Compare this with data transfer costs over the network, and for anything over 10 TB, Snowball Edge often wins on both time and cost for existing customers.

The break-even point depends on your available bandwidth, but a good rule of thumb is: if the network transfer would take more than a week, Snowball Edge is likely the better option.
