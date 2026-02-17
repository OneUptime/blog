# How to Transfer Data from AWS S3 to Azure Blob Storage Using AzCopy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AWS S3, AzCopy, Data Migration, Blob Storage, Cloud Migration, Cross-Cloud

Description: A practical guide to using AzCopy for transferring data from AWS S3 buckets to Azure Blob Storage with authentication and performance optimization.

---

Moving data between cloud providers is a common reality. Whether you are migrating workloads from AWS to Azure, setting up a multi-cloud architecture, or consolidating data for analytics, you often need to transfer data from S3 to Azure Blob Storage. AzCopy is Microsoft's command-line tool for high-performance data transfers, and it supports S3-to-Blob transfers natively without needing an intermediate storage step.

This guide covers how to set up authentication on both sides, run the transfer, optimize performance, and handle common issues.

## How AzCopy S3-to-Blob Transfer Works

When AzCopy copies from S3 to Azure Blob Storage, the data flows from S3 through the machine running AzCopy and then up to Azure. AzCopy does not use server-to-server copy for cross-cloud transfers - it acts as a proxy. This means the bandwidth of the machine running AzCopy is a bottleneck.

For large transfers, run AzCopy on an Azure VM in the same region as the destination storage account to minimize egress costs and maximize upload bandwidth.

## Prerequisites

You will need:

- AzCopy v10.x installed (download from Microsoft's website)
- AWS IAM credentials (Access Key ID and Secret Access Key) with read access to the source bucket
- An Azure Storage account with appropriate access (SAS token, Azure AD, or storage account key)
- Sufficient bandwidth on the machine running AzCopy

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

# If your S3 bucket is in a non-default region, set it
export AWS_DEFAULT_REGION="us-west-2"
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
EXPIRY=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ')

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
  "https://s3-us-west-2.amazonaws.com/source-bucket-name/data/" \
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

# Set the buffer size for each transfer
# Larger buffers reduce overhead for big files
export AZCOPY_BUFFER_GB=4

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

**VM sizing for large transfers**: For multi-terabyte transfers, use an Azure VM with:
- At least 8 cores (more cores = more concurrent connections)
- 32 GB RAM (for buffer space)
- Accelerated networking enabled
- In the same region as the destination storage account

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

For a more thorough verification, compare file sizes or checksums. AzCopy preserves the content-MD5 hash when available, which Azure stores as a blob property.

## Handling Common Issues

**S3 bucket with requester-pays enabled**: Add the `--s2s-preserve-access-tier=false` flag and ensure your AWS credentials have the `s3:GetBucketRequestPayment` permission.

**Large files (over 5 GB)**: AzCopy automatically handles multipart downloads from S3 and uploads to Azure. No special configuration needed.

**S3 bucket with SSE-KMS encryption**: AzCopy can read SSE-S3 and SSE-KMS encrypted objects as long as the IAM credentials have `kms:Decrypt` permission for the relevant KMS key.

**Throttling from S3**: If you hit S3 request rate limits (3,500 GET requests per second per prefix), reduce concurrency:

```bash
export AZCOPY_CONCURRENCY_VALUE=32
```

**Connection timeouts**: For unstable networks, AzCopy retries automatically. You can adjust retry behavior:

```bash
# Increase retry wait time for flaky connections
export AZCOPY_RETRY_DELAY=120
```

## Cost Considerations

The main costs to consider:

- **S3 egress**: AWS charges for data leaving S3. As of early 2026, this is around $0.09/GB for data transferred to the internet. Running AzCopy on an AWS EC2 instance in the same region can avoid this cost (data stays within AWS until the final transfer to Azure).
- **Azure ingress**: Azure does not charge for inbound data transfers.
- **Compute**: If you use a VM to run AzCopy, factor in the VM cost for the duration of the transfer.

For very large transfers (100+ TB), consider using AWS DataSync to S3, then AzCopy to Azure, or even physical devices like Azure Data Box combined with AWS Snowball.

## Wrapping Up

AzCopy makes S3-to-Azure transfers straightforward and reliable. Set up your AWS credentials, generate an Azure SAS token, and run the copy command. For large transfers, optimize by running on a properly sized Azure VM in the same region as the destination, increasing concurrency, and monitoring the job status. Always verify the transfer afterward and clean up temporary credentials when you are done.
