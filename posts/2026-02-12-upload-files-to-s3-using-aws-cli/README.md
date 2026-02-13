# How to Upload Files to S3 Using the AWS CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CLI

Description: A complete guide to uploading files to Amazon S3 using the AWS CLI, covering single files, directories, content types, and performance optimization.

---

The AWS CLI is the fastest way to move files to S3 once you get past the console's drag-and-drop interface. Whether you're uploading a single configuration file or syncing gigabytes of assets, the CLI gives you speed, scriptability, and control that the console simply can't match.

Let's cover everything from basic uploads to advanced techniques.

## Prerequisites

First, make sure the AWS CLI is installed and configured.

Install and configure the AWS CLI:

```bash
# Check if AWS CLI is installed
aws --version

# If not installed, install it
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# Enter your Access Key ID, Secret Access Key, region, and output format

# Verify access to S3
aws s3 ls
```

## Uploading a Single File

The simplest operation - upload one file to a bucket.

Upload a single file to S3:

```bash
# Basic upload
aws s3 cp myfile.txt s3://my-bucket/

# Upload to a specific path/prefix
aws s3 cp myfile.txt s3://my-bucket/data/2026/myfile.txt

# Upload with a different name in S3
aws s3 cp local-report.csv s3://my-bucket/reports/quarterly-report.csv
```

The `cp` command works just like the Unix `cp` command. The source is local, the destination is S3 (or vice versa).

## Setting Content Type and Metadata

S3 usually guesses the content type from the file extension, but sometimes it gets it wrong. You can set it explicitly.

Upload with specific content type and custom metadata:

```bash
# Set content type explicitly (important for web-served files)
aws s3 cp index.html s3://my-bucket/website/index.html \
    --content-type "text/html"

# Upload a JSON file with correct content type
aws s3 cp data.json s3://my-bucket/api/data.json \
    --content-type "application/json"

# Add custom metadata
aws s3 cp report.pdf s3://my-bucket/reports/report.pdf \
    --metadata '{"author":"john","version":"2.1"}'

# Set cache control headers (useful for static assets)
aws s3 cp styles.css s3://my-bucket/assets/styles.css \
    --content-type "text/css" \
    --cache-control "max-age=31536000"
```

## Uploading an Entire Directory

To upload a directory and all its contents, use the `--recursive` flag.

Upload a directory recursively:

```bash
# Upload all files in a directory
aws s3 cp ./build/ s3://my-bucket/website/ --recursive

# Upload with a dry run first to see what would happen
aws s3 cp ./build/ s3://my-bucket/website/ --recursive --dryrun

# Upload only specific file types
aws s3 cp ./images/ s3://my-bucket/images/ --recursive \
    --exclude "*" --include "*.jpg" --include "*.png"

# Exclude certain files
aws s3 cp ./project/ s3://my-bucket/backup/ --recursive \
    --exclude "*.log" --exclude "node_modules/*" --exclude ".git/*"
```

The `--dryrun` flag is incredibly useful. Always run it first when uploading to a bucket that already has data, especially in production.

## Using s3 sync Instead of cp

The `sync` command is smarter than `cp` for directories. It only uploads files that are new or changed.

Sync a local directory to S3:

```bash
# Sync only uploads new or changed files
aws s3 sync ./website/ s3://my-bucket/website/

# Sync and delete files from S3 that don't exist locally
aws s3 sync ./website/ s3://my-bucket/website/ --delete

# Sync with exclusions
aws s3 sync ./project/ s3://my-bucket/project/ \
    --exclude ".git/*" \
    --exclude "*.tmp"
```

We have a dedicated guide on [syncing local directories with S3](https://oneuptime.com/blog/post/2026-02-12-sync-local-directory-with-s3-bucket/view) that covers sync in much more depth.

## Performance Optimization

For large uploads, the default settings might not give you the best speed. Here's how to tune things.

Configure the CLI for faster uploads:

```bash
# Increase the number of concurrent upload threads
aws configure set default.s3.max_concurrent_requests 20

# Increase the multipart upload threshold (default is 8MB)
aws configure set default.s3.multipart_threshold 64MB

# Increase the multipart chunk size
aws configure set default.s3.multipart_chunksize 16MB

# View your current S3 configuration
aws configure get default.s3.max_concurrent_requests
```

You can also set these per-command using a config file:

```bash
# Create or edit ~/.aws/config
# Add under [default] or a named profile:
#
# [default]
# s3 =
#   max_concurrent_requests = 20
#   multipart_threshold = 64MB
#   multipart_chunksize = 16MB
#   max_bandwidth = 50MB/s
```

The `max_bandwidth` setting is useful if you don't want S3 uploads to saturate your network connection.

## Uploading with Server-Side Encryption

If your bucket requires specific encryption, you can specify it during upload.

Upload with different encryption options:

```bash
# Upload with SSE-S3 encryption (default for most buckets)
aws s3 cp myfile.txt s3://my-bucket/myfile.txt \
    --sse AES256

# Upload with SSE-KMS encryption
aws s3 cp myfile.txt s3://my-bucket/myfile.txt \
    --sse aws:kms \
    --sse-kms-key-id arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# Upload with customer-provided encryption key (SSE-C)
aws s3 cp myfile.txt s3://my-bucket/myfile.txt \
    --sse-c AES256 \
    --sse-c-key fileb://my-encryption-key.bin
```

## Uploading with Storage Class

You can upload directly to a cheaper storage class if you know the file won't be accessed frequently.

Upload to specific storage classes:

```bash
# Upload to Standard-IA (Infrequent Access) - cheaper storage, pay per access
aws s3 cp backup.tar.gz s3://my-bucket/backups/backup.tar.gz \
    --storage-class STANDARD_IA

# Upload to Glacier Instant Retrieval
aws s3 cp archive.zip s3://my-bucket/archives/archive.zip \
    --storage-class GLACIER_IR

# Upload to S3 Intelligent-Tiering (auto-optimizes based on access patterns)
aws s3 cp data.parquet s3://my-bucket/data/data.parquet \
    --storage-class INTELLIGENT_TIERING
```

## Uploading from stdin

You can pipe data directly to S3 without creating a temporary file.

Upload data from a pipe:

```bash
# Pipe database dump directly to S3
pg_dump mydb | gzip | aws s3 cp - s3://my-bucket/backups/mydb-$(date +%Y%m%d).sql.gz

# Pipe command output to S3
kubectl get pods -A -o json | aws s3 cp - s3://my-bucket/k8s/pods-snapshot.json

# Tar and upload a directory in one step
tar czf - /var/log/app/ | aws s3 cp - s3://my-bucket/logs/app-logs-$(date +%Y%m%d).tar.gz
```

The `-` as the source tells the CLI to read from stdin. This is great for backups because you never need to store the intermediate file locally.

## Handling Large Files

For files larger than about 100 MB, you'll want multipart upload for reliability. The CLI handles this automatically based on the threshold setting, but you might want to adjust the parameters.

Upload large files efficiently:

```bash
# Upload a large file with explicit multipart settings
aws s3 cp large-dataset.tar.gz s3://my-bucket/data/ \
    --expected-size 5368709120

# If an upload fails partway through, the CLI will retry
# For very large files (100GB+), use multipart upload directly
# See our guide on multipart uploads for more control
```

For files over a few gigabytes, check out our guide on [multipart uploads](https://oneuptime.com/blog/post/2026-02-12-upload-large-files-to-s3-multipart-upload/view) for more control over the process.

## Scripting Uploads

Here's a practical script that uploads files and verifies the upload.

A robust upload script with verification:

```bash
#!/bin/bash
# upload-and-verify.sh - Upload file to S3 and verify integrity

BUCKET="my-bucket"
LOCAL_FILE="$1"
S3_KEY="$2"

if [ -z "$LOCAL_FILE" ] || [ -z "$S3_KEY" ]; then
    echo "Usage: $0 <local-file> <s3-key>"
    exit 1
fi

# Calculate local MD5
LOCAL_MD5=$(md5sum "$LOCAL_FILE" | awk '{print $1}')
echo "Local MD5: $LOCAL_MD5"

# Upload the file
echo "Uploading $LOCAL_FILE to s3://$BUCKET/$S3_KEY..."
aws s3 cp "$LOCAL_FILE" "s3://$BUCKET/$S3_KEY" \
    --metadata "local-md5=$LOCAL_MD5"

if [ $? -eq 0 ]; then
    # Verify the upload by checking the ETag
    S3_ETAG=$(aws s3api head-object \
        --bucket "$BUCKET" \
        --key "$S3_KEY" \
        --query "ETag" --output text | tr -d '"')

    echo "S3 ETag: $S3_ETAG"
    echo "Upload complete: s3://$BUCKET/$S3_KEY"
else
    echo "Upload failed!"
    exit 1
fi
```

## Common Issues and Solutions

A few things that commonly go wrong:

**"Access Denied"** - Check your IAM permissions. You need `s3:PutObject` at minimum. Also check bucket policies and ACLs.

**Slow uploads** - Increase concurrent requests and adjust multipart settings as shown above. If you're uploading to a distant region, consider [S3 Transfer Acceleration](https://oneuptime.com/blog/post/2026-02-12-enable-s3-transfer-acceleration-faster-uploads/view).

**"Connection reset"** - Usually a network issue. The CLI will retry automatically, but you can increase retries with `aws configure set default.retry_mode adaptive`.

**Wrong content type** - S3 guesses based on file extension. Override with `--content-type` when it guesses wrong.

The AWS CLI is the workhorse for S3 uploads. Once you've got the basics down, you can script anything - automated backups, CI/CD deployments, log rotation, you name it. Start simple, then add complexity as you need it.
