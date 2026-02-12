# How to Sync a Local Directory with an S3 Bucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CLI, DevOps

Description: Master the aws s3 sync command to keep local directories and S3 buckets in sync, including filters, delete behavior, and automation strategies.

---

The `aws s3 sync` command is one of the most useful tools in the AWS CLI. Unlike `aws s3 cp`, which blindly copies everything every time, sync is smart - it compares source and destination, and only transfers files that are new or changed. This makes it perfect for backups, deployments, data pipelines, and keeping directories mirrored.

Let's dig into how sync works and all the ways you can use it.

## Basic Sync: Local to S3

The most common use case is syncing a local directory up to S3.

Sync a local directory to S3:

```bash
# Sync local directory to S3
aws s3 sync ./my-website/ s3://my-bucket/website/

# What sync does:
# - Uploads files that exist locally but not in S3
# - Uploads files that are newer locally than in S3
# - Skips files that are identical (same size and timestamp)
# - Does NOT delete S3 files that don't exist locally (unless you add --delete)
```

## Basic Sync: S3 to Local

Pulling data down works the same way, just reverse the arguments.

Sync from S3 to a local directory:

```bash
# Sync S3 to local directory
aws s3 sync s3://my-bucket/data/ ./local-data/

# This downloads new/changed files from S3 to your local directory
```

## The --delete Flag

By default, sync never deletes anything at the destination. The `--delete` flag changes that.

Use delete to create an exact mirror:

```bash
# Sync and remove files from S3 that don't exist locally
aws s3 sync ./website/ s3://my-bucket/website/ --delete

# Sync and remove local files that don't exist in S3
aws s3 sync s3://my-bucket/data/ ./local-data/ --delete
```

Be very careful with `--delete`. Always do a dry run first:

```bash
# See what would be deleted without actually doing it
aws s3 sync ./website/ s3://my-bucket/website/ --delete --dryrun
```

The dry run output shows every action the sync would take - uploads, downloads, and deletions. Read it carefully before running the real command.

## Filtering with Include and Exclude

Sync supports powerful filtering to control which files get synced.

Filter files during sync:

```bash
# Sync only HTML and CSS files
aws s3 sync ./website/ s3://my-bucket/website/ \
    --exclude "*" \
    --include "*.html" \
    --include "*.css"

# Sync everything except log files and temp files
aws s3 sync ./project/ s3://my-bucket/project/ \
    --exclude "*.log" \
    --exclude "*.tmp" \
    --exclude ".git/*"

# Sync only files in a specific subdirectory pattern
aws s3 sync ./data/ s3://my-bucket/data/ \
    --exclude "*" \
    --include "2026/02/*"
```

The filter order matters. Filters are evaluated from left to right. Start with `--exclude "*"` to exclude everything, then use `--include` to add back what you want. This is the most predictable pattern.

## How Sync Decides What to Transfer

Understanding sync's comparison logic helps you avoid surprises.

By default, sync compares:
1. **File size** - Different size means the file changed
2. **Last modified timestamp** - Newer at source means upload it

You can change this behavior:

```bash
# Compare by size only (ignore timestamps)
aws s3 sync ./data/ s3://my-bucket/data/ --size-only

# Compare by exact timestamps (more precise, but slower)
aws s3 sync ./data/ s3://my-bucket/data/ --exact-timestamps
```

The `--size-only` flag is useful when timestamps are unreliable (like after extracting archives). The `--exact-timestamps` flag only matters for S3-to-local syncs, where S3 timestamps have second-level precision.

## Syncing Between Two S3 Locations

You can sync between S3 buckets too, which is great for cross-account or cross-region copies.

Sync between S3 buckets:

```bash
# Sync between buckets in the same account
aws s3 sync s3://source-bucket/data/ s3://destination-bucket/data/

# Sync between buckets in different regions
aws s3 sync s3://us-east-bucket/data/ s3://eu-west-bucket/data/ \
    --source-region us-east-1 \
    --region eu-west-1

# Cross-account sync (requires proper bucket policies)
aws s3 sync s3://account-a-bucket/shared/ s3://account-b-bucket/imported/ \
    --acl bucket-owner-full-control
```

For ongoing cross-region replication, you're better off using [S3 Replication](https://oneuptime.com/blog/post/set-up-s3-same-region-replication/view) instead of manual sync commands.

## Performance Tuning

For large syncs with thousands of files, tune the CLI for better performance.

Optimize sync performance:

```bash
# Increase parallel transfers
aws configure set default.s3.max_concurrent_requests 20

# Adjust multipart settings for large files
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB

# Limit bandwidth if needed
aws configure set default.s3.max_bandwidth 50MB/s
```

You can also pass these as environment variables for one-off commands:

```bash
# Set concurrency for a single command
AWS_MAX_CONCURRENT_REQUESTS=30 aws s3 sync ./data/ s3://my-bucket/data/
```

## Automating Sync with Cron

A common pattern is running sync on a schedule for backups or data pipelines.

Set up automated sync with cron:

```bash
# Create a sync script
cat > /opt/scripts/s3-sync.sh << 'SCRIPT'
#!/bin/bash
LOG_FILE="/var/log/s3-sync.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting S3 sync..." >> "$LOG_FILE"

aws s3 sync /var/data/ s3://my-bucket/backups/data/ \
    --exclude "*.tmp" \
    --delete \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$TIMESTAMP] Sync completed successfully" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] Sync failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi
SCRIPT

chmod +x /opt/scripts/s3-sync.sh

# Add to crontab - run every hour
(crontab -l 2>/dev/null; echo "0 * * * * /opt/scripts/s3-sync.sh") | crontab -
```

## Sync for Static Website Deployment

Here's a common real-world pattern: deploying a static website to S3.

Deploy a static website with proper content types and caching:

```bash
#!/bin/bash
# deploy-website.sh - Deploy static site to S3

BUCKET="my-website-bucket"
BUILD_DIR="./build"

echo "Building site..."
npm run build

echo "Syncing HTML files (short cache)..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET/" \
    --exclude "*" \
    --include "*.html" \
    --cache-control "max-age=300" \
    --content-type "text/html" \
    --delete

echo "Syncing assets (long cache, content-hashed filenames)..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET/" \
    --exclude "*.html" \
    --include "*.js" --include "*.css" \
    --include "*.jpg" --include "*.png" --include "*.svg" \
    --cache-control "max-age=31536000,immutable" \
    --delete

echo "Syncing everything else..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET/" \
    --exclude "*.html" --exclude "*.js" --exclude "*.css" \
    --exclude "*.jpg" --exclude "*.png" --exclude "*.svg"

echo "Deployment complete!"
```

This deploys HTML with a short cache (5 minutes) and static assets with a long cache (1 year). The separate sync commands let you set different cache headers for different file types.

## Sync with Encryption

Sync files with server-side encryption:

```bash
# Sync with SSE-S3 encryption
aws s3 sync ./data/ s3://my-bucket/data/ --sse AES256

# Sync with SSE-KMS encryption
aws s3 sync ./data/ s3://my-bucket/data/ \
    --sse aws:kms \
    --sse-kms-key-id alias/my-key
```

## Handling Symbolic Links

By default, sync follows symbolic links. If you don't want that:

```bash
# Sync without following symlinks
aws s3 sync ./project/ s3://my-bucket/project/ --no-follow-symlinks
```

## Common Pitfalls

**Forgetting --delete leaves orphan files.** If you rename or move files locally, the old versions stay in S3 unless you use `--delete`.

**Filter order confusion.** Remember: `--exclude "*" --include "*.txt"` works, but `--include "*.txt" --exclude "*"` excludes everything.

**Timestamps can be misleading.** Git clone, file extraction, and some editors change file timestamps. Use `--size-only` when timestamps aren't reliable.

**Large directories are slow to list.** Sync has to list all files at both source and destination before transferring anything. For buckets with millions of objects, this initial listing phase can take a while.

**No atomic sync.** Sync uploads files one at a time. If the process is interrupted, you'll have a partially synced state. For deployment scenarios where this matters, upload to a new prefix and switch references atomically.

The `aws s3 sync` command is deceptively simple but incredibly versatile. Once you get comfortable with the filter syntax and understand its comparison logic, it becomes the go-to tool for any kind of S3 file management.
