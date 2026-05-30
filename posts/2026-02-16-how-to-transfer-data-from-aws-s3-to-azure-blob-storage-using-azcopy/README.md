# How to Transfer Data from AWS S3 to Azure Blob Storage Using AzCopy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AWS S3, AzCopy, Data Migration, Blob Storage, Cloud Migration, Cross-Cloud

Description: A practical guide to using AzCopy for transferring data from AWS S3 buckets to Azure Blob Storage with authentication and performance optimization.

---

Moving data between cloud providers is a common reality. Whether you are migrating workloads from AWS to Azure, setting up a multi-cloud architecture, or consolidating data for analytics, you often need to transfer data from S3 to Azure Blob Storage. AzCopy is Microsoft's command-line tool for high-performance data transfers, and it supports S3-to-Blob transfers natively without needing an intermediate storage step.

This guide covers how to set up authentication on both sides, run the transfer, optimize performance, and handle common issues.

## How AzCopy S3-to-Blob Transfer Works

When AzCopy copies from S3 to Azure Blob Storage, it uses Azure Storage service-to-service copy with pre-signed S3 URLs. The data is copied directly between AWS S3 and Azure Storage servers, so the transfer does not use the network bandwidth of the machine running AzCopy.

For large transfers, run AzCopy from a stable machine or VM that can keep the job running and store AzCopy's log and plan files. The machine is still responsible for enumeration, job tracking, and retry orchestration.

## Prerequisites

You will need:

- AzCopy v10.x installed (download from Microsoft's website)
- AWS IAM credentials (Access Key ID and Secret Access Key) with read access to the source bucket
- An Azure Storage account with appropriate access (SAS token or Microsoft Entra ID; a storage account key can be used to generate the SAS)
- A stable machine to run AzCopy and store its log and plan files

## Step 1: Install AzCopy

Download and install AzCopy on the machine that will run the transfer:

```bash
# On Linux

wget https://aka.ms/downloadazcopy-v10-linux -O azcopy.tar.gz
tar -xzf azcopy.tar.gz
sudo mv azcopy_linux_amd64_*/azcopy /usr/local/bin/
azcopy --version

# On macOS
brew install azcopy

# On Windows (PowerShell)
# Download from https://aka.ms/downloadazcopy-v10-windows
# Extract and add to PATH
```

## Step 2: Configure AWS Credentials

AzCopy reads AWS credentials from environment variables. Set them before running the copy:

```bash
# Set AWS credentials as environment variables
# These must have at least s3:GetObject and s3:ListBucket permissions
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# For buckets outside us-east-1, use a region-specific S3 endpoint in the AzCopy URL
```

For production use, create a dedicated IAM user with minimal permissions. Here is the IAM policy you need:

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

## Step 3: Generate an Azure SAS Token

Create a SAS token for the destination storage account with write permissions:

```bash
# Generate a SAS token valid for 7 days with write permissions
# Adjust expiry based on expected transfer duration
# GNU date (Linux)
EXPIRY=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ')

# macOS
# EXPIRY=$(date -u -v+7d '+%Y-%m-%dT%H:%MZ')

SAS_TOKEN=$(az storage account generate-sas \
  --account-name stdestination2026 \
  --permissions rwdlac \
  --resource-types sco \
  --services b \
  --expiry "$EXPIRY" \
  --output tsv)

echo "SAS Token: $SAS_TOKEN"
```

Alternatively, log in with Azure AD for the destination:

```bash
# Login to Azure AD (opens a browser for authentication)
azcopy login --tenant-id "<your-tenant-id>"
```

## Step 4: Run the Transfer

Now copy data from S3 to Azure Blob Storage. The basic syntax is:

```bash
# Copy an entire S3 bucket to an Azure container
azcopy copy \
  "https://s3.amazonaws.com/source-bucket-name" \
  "https://stdestination2026.blob.core.windows.net/migrated-data?${SAS_TOKEN}" \
  --recursive
```

For buckets in specific regions, use the regional endpoint:

```bash
# Copy from an S3 bucket in us-west-2
azcopy copy \
  "https://s3.us-west-2.amazonaws.com/source-bucket-name/data/" \
  "https://stdestination2026.blob.core.windows.net/migrated-data/data/?${SAS_TOKEN}" \
  --recursive
```

## Step 5: Copy Specific Prefixes or Patterns

You do not have to copy the entire bucket. Use prefixes and wildcards to filter:

```bash
# Copy only files under a specific prefix
azcopy copy \
  "https://s3.amazonaws.com/source-bucket/logs/2026/02/" \
  "https://stdestination2026.blob.core.windows.net/logs/2026/02/?${SAS_TOKEN}" \
  --recursive

# Copy only CSV files from the bucket
azcopy copy \
  "https://s3.amazonaws.com/source-bucket/data/" \
  "https://stdestination2026.blob.core.windows.net/data/?${SAS_TOKEN}" \
  --recursive \
  --include-pattern "*.csv"

# Exclude certain file patterns
azcopy copy \
  "https://s3.amazonaws.com/source-bucket/" \
  "https://stdestination2026.blob.core.windows.net/full-backup/?${SAS_TOKEN}" \
  --recursive \
  --exclude-pattern "*.tmp;*.log"
```

## Step 6: Optimize Transfer Performance

AzCopy has several settings that affect performance. Tuning these can make a big difference on large transfers.

```bash
# Increase concurrent connections (default is based on CPU cores)
# More connections = more parallel transfers
export AZCOPY_CONCURRENCY_VALUE=128

# Set the log level to WARNING to reduce I/O overhead
export AZCOPY_LOG_LOCATION="/tmp/azcopy-logs"
azcopy copy \
  "https://s3.amazonaws.com/source-bucket/" \
  "https://stdestination2026.blob.core.windows.net/migrated/?${SAS_TOKEN}" \
  --recursive \
  --log-level WARNING \
  --cap-mbps 0
```

The `--cap-mbps 0` means no bandwidth cap. Set this to a specific value if you need to throttle to avoid impacting other workloads.

**VM sizing for large transfers**: For multi-terabyte transfers, use a machine or VM with:
- Enough CPU to manage enumeration and concurrent copy requests
- Enough disk space for AzCopy log and plan files
- A reliable network connection for control-plane requests
- Long enough runtime for the full transfer and any retries

## Step 7: Monitor Transfer Progress

AzCopy provides a `jobs` command to monitor running and completed transfers:

```bash
# List all AzCopy jobs
azcopy jobs list

# Show status of a specific job
azcopy jobs show <job-id>

# Show detailed status with transfer-level information
azcopy jobs show <job-id> --with-status=Failed
```

For long-running transfers, AzCopy also creates a log file. The default location varies by OS:
- Linux: `~/.azcopy/`
- macOS: `~/Library/Caches/azcopy/`
- Windows: `%USERPROFILE%\.azcopy\`

## Step 8: Resume Failed Transfers

If a transfer fails partway through (network issue, timeout, etc.), AzCopy can resume it:

```bash
# Resume the most recent failed job
azcopy jobs resume <job-id>

# Resume with a different SAS token (if the original expired)
azcopy jobs resume <job-id> \
  --destination-sas "${NEW_SAS_TOKEN}"
```

AzCopy tracks completed files in its journal, so it only retransfers files that were not successfully copied.

## Step 9: Verify the Transfer

After the transfer completes, verify that all data was copied correctly:

```bash
# Compare source and destination counts
# List S3 objects count
aws s3 ls s3://source-bucket/ --recursive --summarize | tail -2

# List Azure blob count
az storage blob list \
  --account-name stdestination2026 \
  --container-name migrated-data \
  --query "length(@)" \
  --output tsv
```

For a more thorough verification, compare file sizes or independently generated checksums. Do not rely on S3 ETags as MD5 checksums for multipart-uploaded or SSE-KMS-encrypted objects.

## Handling Common Issues

**S3 bucket with requester-pays enabled**: Requester Pays access requires `x-amz-request-payer=requester` in S3 requests or pre-signed URLs. AzCopy's documented S3-to-Blob flow does not expose a requester-pays flag, so use bucket-owner credentials or a different migration workflow that can add that request parameter.

**Large files (over 5 GB)**: AzCopy automatically splits large service-to-service copies into blocks when writing to Azure Blob Storage. No special configuration needed.

**S3 bucket with SSE-KMS encryption**: AzCopy can read SSE-S3 and SSE-KMS encrypted objects as long as the IAM credentials and KMS key policy allow the required S3 read and KMS decrypt operations.

**Throttling from S3**: If you hit S3 request rate limits (at least 5,500 GET/HEAD requests per second per prefix), reduce concurrency:

```bash
export AZCOPY_CONCURRENCY_VALUE=32
```

**Connection timeouts**: For transient failures, AzCopy retries automatically. For slow individual requests, you can increase the per-request timeout:

```bash
# Increase request timeout to 120 minutes
export AZCOPY_REQUEST_TRY_TIMEOUT=120
```

## Cost Considerations

The main costs to consider:

- **S3 egress**: AWS charges for data leaving S3. As of early 2026, this is around $0.09/GB for the first 10 TB per month in many regions when data is transferred to the internet or another cloud. Running AzCopy on an AWS EC2 instance does not avoid this cross-cloud egress charge because the data still leaves AWS for Azure Storage.
- **Azure ingress**: Azure does not charge for inbound data transfers.
- **Compute**: If you use a VM to run AzCopy, factor in the VM cost for the duration of the transfer.

For very large transfers (100+ TB), consider using AWS DataSync to S3, then AzCopy to Azure, or even physical devices like Azure Data Box combined with AWS Snowball.

## Wrapping Up

AzCopy makes S3-to-Azure transfers straightforward and reliable. Set up your AWS credentials, generate an Azure SAS token, and run the copy command. For large transfers, optimize by running on a stable machine, increasing concurrency when appropriate, and monitoring the job status. Always verify the transfer afterward and clean up temporary credentials when you are done.
