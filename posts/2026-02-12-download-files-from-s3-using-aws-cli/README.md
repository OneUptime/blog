# How to Download Files from S3 Using the AWS CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CLI

Description: A practical guide to downloading files and directories from Amazon S3 using the AWS CLI, with tips for filtering, performance, and automation.

---

Downloading files from S3 is something you'll do constantly - pulling backups, fetching build artifacts, syncing datasets, or grabbing logs for analysis. The AWS CLI makes this straightforward, but there are plenty of useful options beyond the basic `aws s3 cp` that can save you time and bandwidth.

Let's go through everything from downloading a single file to efficiently pulling down terabytes of data.

## Downloading a Single File

The basics. Copy a file from S3 to your local machine.

Download a single file from S3:

```bash
# Download a file to the current directory
aws s3 cp s3://my-bucket/data/report.csv .

# Download to a specific local path
aws s3 cp s3://my-bucket/data/report.csv /tmp/reports/report.csv

# Download and rename the file
aws s3 cp s3://my-bucket/data/report-2026-02.csv ./latest-report.csv
```

## Downloading an Entire Directory

Use the `--recursive` flag to download everything under a prefix.

Download all files from an S3 prefix:

```bash
# Download all files in a prefix
aws s3 cp s3://my-bucket/logs/2026/02/ ./local-logs/ --recursive

# Preview what would be downloaded with dry run
aws s3 cp s3://my-bucket/logs/2026/02/ ./local-logs/ --recursive --dryrun

# Download only specific file types
aws s3 cp s3://my-bucket/assets/ ./assets/ --recursive \
    --exclude "*" --include "*.jpg" --include "*.png"

# Download everything except certain patterns
aws s3 cp s3://my-bucket/project/ ./project/ --recursive \
    --exclude "*.tmp" --exclude "*.log"
```

The `--exclude` and `--include` filters are processed in order, so put `--exclude "*"` first, then `--include` the patterns you want. This is a common gotcha - if you put `--include` before `--exclude`, the exclude will override it.

## Using sync for Smarter Downloads

The `sync` command only downloads files that are new or changed, which is much more efficient for repeated downloads.

Sync S3 data to a local directory:

```bash
# Only download new or modified files
aws s3 sync s3://my-bucket/data/ ./local-data/

# Sync with deletion - remove local files not in S3
aws s3 sync s3://my-bucket/data/ ./local-data/ --delete

# Sync only recent files (by size, not date)
aws s3 sync s3://my-bucket/data/ ./local-data/ --size-only
```

By default, sync compares file size and last modified timestamps. The `--size-only` flag compares only sizes, which is faster but less precise. See our full guide on [syncing directories with S3](https://oneuptime.com/blog/post/sync-local-directory-with-s3-bucket/view) for more details.

## Downloading to stdout

Sometimes you don't want to save a file to disk. You can stream S3 objects directly to stdout and pipe them to other commands.

Stream S3 objects to stdout for processing:

```bash
# View a file without downloading
aws s3 cp s3://my-bucket/config/settings.json -

# Pipe to jq for JSON processing
aws s3 cp s3://my-bucket/data/users.json - | jq '.users[] | .email'

# Decompress on the fly
aws s3 cp s3://my-bucket/backups/db-dump.sql.gz - | gunzip | psql mydb

# Count lines in a remote file without downloading
aws s3 cp s3://my-bucket/logs/access.log - | wc -l

# Search through a remote file
aws s3 cp s3://my-bucket/logs/app.log - | grep "ERROR"
```

The `-` as the destination tells the CLI to write to stdout instead of a file.

## Listing Before Downloading

Before downloading a large directory, it's smart to check what's there and how big it is.

List and check sizes before downloading:

```bash
# List objects in a prefix
aws s3 ls s3://my-bucket/data/ --recursive

# Get total size of a prefix
aws s3 ls s3://my-bucket/data/ --recursive --summarize --human-readable

# List only the top-level prefixes (like directories)
aws s3 ls s3://my-bucket/data/

# Count files in a prefix
aws s3 ls s3://my-bucket/logs/2026/ --recursive | wc -l
```

The `--summarize --human-readable` flags give you a total file count and size at the bottom of the listing. Very useful before committing to a large download.

## Performance Optimization

For large downloads, tune the CLI for maximum throughput.

Configure the CLI for faster downloads:

```bash
# Increase concurrent download threads
aws configure set default.s3.max_concurrent_requests 20

# Adjust multipart download settings
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB

# Limit bandwidth if needed (useful on shared connections)
aws configure set default.s3.max_bandwidth 100MB/s
```

You can also use the `--no-sign-request` flag for public buckets to skip the authentication overhead:

```bash
# Download from a public bucket (no credentials needed)
aws s3 cp s3://public-dataset-bucket/data.csv . --no-sign-request
```

## Downloading Specific Object Versions

If the bucket has versioning enabled, you can download a specific version of an object.

Download a specific version of an object:

```bash
# List all versions of an object
aws s3api list-object-versions \
    --bucket my-bucket \
    --prefix data/config.json \
    --query "Versions[*].[VersionId,LastModified,Size]" \
    --output table

# Download a specific version
aws s3api get-object \
    --bucket my-bucket \
    --key data/config.json \
    --version-id "abc123def456" \
    ./config-old-version.json
```

This is invaluable when you need to recover a previous version of a file. For more on versioning, check our guide on [recovering deleted objects from versioned buckets](https://oneuptime.com/blog/post/recover-deleted-objects-versioned-s3-bucket/view).

## Downloading with Presigned URLs

Sometimes you need to give someone temporary download access without sharing your AWS credentials.

Generate a presigned URL for temporary access:

```bash
# Generate a presigned URL valid for 1 hour (3600 seconds)
aws s3 presign s3://my-bucket/reports/quarterly.pdf --expires-in 3600

# The output is a URL anyone can use to download the file
# https://my-bucket.s3.amazonaws.com/reports/quarterly.pdf?X-Amz-Algorithm=...

# Download using the presigned URL (no AWS credentials needed)
curl -o quarterly.pdf "https://my-bucket.s3.amazonaws.com/reports/quarterly.pdf?X-Amz-Algorithm=..."

# You can also use wget
wget -O quarterly.pdf "https://my-bucket.s3.amazonaws.com/reports/quarterly.pdf?X-Amz-Algorithm=..."
```

## Scripting Downloads

Here's a practical script for downloading files with progress tracking and error handling.

A download script with error handling:

```bash
#!/bin/bash
# download-from-s3.sh - Download files from S3 with verification

BUCKET="my-bucket"
S3_PREFIX="$1"
LOCAL_DIR="$2"

if [ -z "$S3_PREFIX" ] || [ -z "$LOCAL_DIR" ]; then
    echo "Usage: $0 <s3-prefix> <local-directory>"
    echo "Example: $0 data/2026/ /tmp/data/"
    exit 1
fi

# Create local directory
mkdir -p "$LOCAL_DIR"

# Count files to download
FILE_COUNT=$(aws s3 ls "s3://$BUCKET/$S3_PREFIX" --recursive | wc -l)
echo "Files to download: $FILE_COUNT"

# Get total size
aws s3 ls "s3://$BUCKET/$S3_PREFIX" --recursive --summarize --human-readable | tail -2

echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Download with sync (skip existing files)
    aws s3 sync "s3://$BUCKET/$S3_PREFIX" "$LOCAL_DIR" 2>&1

    if [ $? -eq 0 ]; then
        echo "Download complete!"
        echo "Local files:"
        du -sh "$LOCAL_DIR"
    else
        echo "Download had errors. Check above for details."
        exit 1
    fi
fi
```

## Common Issues

**Slow downloads** - Increase concurrent requests. Also make sure you're downloading from the same region as your bucket. Cross-region downloads are significantly slower.

**"Access Denied"** - You need `s3:GetObject` permission. Check your IAM policy, bucket policy, and any VPC endpoint policies that might be blocking access.

**Out of disk space** - Always check the total download size with `--summarize` first. For very large datasets, consider using `--exclude` to download only what you need.

**Interrupted downloads** - Use `sync` instead of `cp` for large directories. If a sync is interrupted, just run it again and it'll pick up where it left off.

The AWS CLI's S3 download capabilities cover everything from quick one-off file grabs to large-scale data transfers. For most workflows, `aws s3 sync` is your best friend since it's smart about what needs downloading and resilient to interruptions.
