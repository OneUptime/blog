# How to Use gsutil to Manage Google Cloud Storage Buckets and Objects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, gsutil, CLI Tools, Cloud Operations

Description: A comprehensive guide to using gsutil for managing Google Cloud Storage buckets and objects with practical command examples and productivity tips.

---

gsutil has been the go-to command-line tool for Google Cloud Storage for years. While Google has been moving functionality into `gcloud storage` commands, gsutil is still widely used and supported. If you work with GCS regularly, knowing gsutil well makes you significantly more productive. Many operations that take multiple clicks in the Console take a single gsutil command.

This guide covers the essential gsutil commands with practical examples for daily operations.

## gsutil vs gcloud storage

Quick note before we dive in: Google Cloud SDK now includes `gcloud storage` commands as the next-generation replacement for gsutil. Both work, but `gcloud storage` is generally faster for large operations because it uses the JSON API and parallel processing by default. gsutil uses the XML API.

That said, gsutil is battle-tested, well-documented, and still the tool most tutorials and scripts reference. The commands are also more concise.

## Setup

gsutil comes bundled with the Google Cloud SDK. If you have gcloud installed, you already have gsutil.

```bash
# Verify gsutil is available
gsutil version

# Authenticate if you have not already
gcloud auth login
```

## Bucket Operations

### Creating a Bucket

```bash
# Create a bucket in a specific region
gsutil mb -l us-central1 gs://my-new-bucket

# Create a bucket with a specific storage class
gsutil mb -c nearline -l us-central1 gs://my-nearline-bucket

# Create a bucket with uniform bucket-level access
gsutil mb -b on -l us-central1 gs://my-uniform-bucket
```

### Listing Buckets

```bash
# List all buckets in the current project
gsutil ls

# List buckets with detailed info
gsutil ls -L gs://my-bucket
```

### Getting Bucket Info

```bash
# View detailed bucket metadata
gsutil ls -L -b gs://my-bucket

# View just the storage class and location
gsutil ls -L -b gs://my-bucket | grep -E "Location|Storage"
```

### Deleting a Bucket

```bash
# Delete an empty bucket
gsutil rb gs://my-old-bucket

# Delete a bucket and all its contents (be very careful)
gsutil rm -r gs://my-old-bucket
```

## Object Operations

### Uploading Files

```bash
# Upload a single file
gsutil cp local-file.txt gs://my-bucket/path/to/file.txt

# Upload all files in a directory
gsutil cp -r ./local-dir gs://my-bucket/destination/

# Upload with a specific content type
gsutil -h "Content-Type:application/json" cp data.json gs://my-bucket/data/
```

### Downloading Files

```bash
# Download a single file
gsutil cp gs://my-bucket/data/report.csv ./report.csv

# Download all files with a prefix
gsutil cp -r gs://my-bucket/data/2026/ ./local-data/

# Download and decompress gzip files on the fly
gsutil cp -Z gs://my-bucket/data/compressed.csv.gz ./decompressed.csv
```

### Listing Objects

```bash
# List objects in a bucket
gsutil ls gs://my-bucket/

# List objects in a specific path
gsutil ls gs://my-bucket/data/2026/

# List objects recursively
gsutil ls -r gs://my-bucket/

# List objects with details (size, date, storage class)
gsutil ls -l gs://my-bucket/data/

# List objects with sizes in human-readable format
gsutil du -s gs://my-bucket/data/
```

### Moving and Renaming Objects

```bash
# Move (rename) an object within the same bucket
gsutil mv gs://my-bucket/old-name.txt gs://my-bucket/new-name.txt

# Move objects between buckets
gsutil mv gs://source-bucket/data/* gs://dest-bucket/data/

# Move a directory
gsutil mv gs://my-bucket/old-dir/ gs://my-bucket/new-dir/
```

### Deleting Objects

```bash
# Delete a single object
gsutil rm gs://my-bucket/temp/old-file.txt

# Delete all objects with a prefix
gsutil rm gs://my-bucket/temp/**

# Delete all objects matching a pattern
gsutil rm gs://my-bucket/logs/2025-*.log
```

## Parallel Operations with -m Flag

The `-m` flag enables parallel processing, dramatically speeding up operations with many files:

```bash
# Upload many files in parallel
gsutil -m cp -r ./large-directory/ gs://my-bucket/uploads/

# Download many files in parallel
gsutil -m cp -r gs://my-bucket/data/ ./local-data/

# Delete many files in parallel
gsutil -m rm gs://my-bucket/tmp/**

# Sync in parallel
gsutil -m rsync -r ./local-dir gs://my-bucket/synced-dir/
```

The `-m` flag can make operations 10x faster or more when working with thousands of files.

## Syncing with rsync

gsutil rsync is like the traditional rsync command but for Cloud Storage:

```bash
# Sync a local directory to a bucket (upload new/changed files)
gsutil rsync -r ./local-dir gs://my-bucket/backup/

# Sync with deletion (make destination match source exactly)
gsutil rsync -r -d ./local-dir gs://my-bucket/mirror/

# Sync between two buckets
gsutil rsync -r gs://source-bucket/data/ gs://dest-bucket/data/

# Dry run to see what would change
gsutil rsync -r -n ./local-dir gs://my-bucket/backup/

# Exclude certain file patterns
gsutil rsync -r -x ".*\.tmp$|.*\.log$" ./local-dir gs://my-bucket/backup/
```

The `-d` flag for delete is powerful but dangerous. Always do a dry run with `-n` first.

## Working with Metadata

### Viewing Object Metadata

```bash
# View all metadata for an object
gsutil stat gs://my-bucket/data/report.csv
```

### Setting Custom Metadata

```bash
# Set custom metadata on an object
gsutil setmeta -h "x-goog-meta-source:etl-pipeline" \
  -h "x-goog-meta-version:2" \
  gs://my-bucket/data/processed.csv

# Set the content type
gsutil setmeta -h "Content-Type:text/csv" gs://my-bucket/data/file.csv
```

## Access Control

### Setting ACLs

```bash
# Make an object publicly readable
gsutil acl ch -u AllUsers:R gs://my-bucket/public/image.png

# Grant a user read access to an object
gsutil acl ch -u alice@example.com:R gs://my-bucket/shared/report.pdf

# Set a predefined ACL
gsutil acl set public-read gs://my-bucket/public/index.html
```

### Working with IAM

```bash
# View IAM policy for a bucket
gsutil iam get gs://my-bucket

# Grant a role to a member
gsutil iam ch user:alice@example.com:objectViewer gs://my-bucket

# Remove a role from a member
gsutil iam ch -d user:alice@example.com:objectViewer gs://my-bucket
```

## Configuration

### Setting the Default Project

```bash
# Configure gsutil's default project
gsutil config -o "GSUtil:default_project_id=my-project"
```

### Parallel Upload Settings

For better performance with large files, configure parallel composite uploads in your `.boto` config:

```bash
# Check current configuration
gsutil version -l
```

Create or edit `~/.boto`:

```ini
[GSUtil]
# Enable parallel composite uploads for files over 150 MB
parallel_composite_upload_threshold = 150M

# Number of parallel processes
parallel_process_count = 8

# Number of parallel threads per process
parallel_thread_count = 4
```

## Useful gsutil Patterns

### Bulk Upload with Specific Content Types

```bash
# Upload all CSV files with the correct content type
gsutil -h "Content-Type:text/csv" -m cp ./data/*.csv gs://my-bucket/data/
```

### Counting Objects in a Bucket

```bash
# Count objects and total size under a prefix
gsutil du -s gs://my-bucket/data/
```

### Finding Large Files

```bash
# List objects sorted by size (largest first)
gsutil ls -l gs://my-bucket/ | sort -k1 -rn | head -20
```

### Generating a File Hash

```bash
# Get the MD5 and CRC32C hash of an object
gsutil hash gs://my-bucket/data/important-file.zip
```

### Composing Objects

```bash
# Combine multiple objects into one (useful after parallel uploads)
gsutil compose gs://my-bucket/parts/part-001 \
  gs://my-bucket/parts/part-002 \
  gs://my-bucket/parts/part-003 \
  gs://my-bucket/combined/full-file
```

## Migrating to gcloud storage

If you want to start using the newer `gcloud storage` commands, here is a quick mapping:

| gsutil command | gcloud storage equivalent |
|---|---|
| `gsutil mb` | `gcloud storage buckets create` |
| `gsutil rb` | `gcloud storage buckets delete` |
| `gsutil cp` | `gcloud storage cp` |
| `gsutil mv` | `gcloud storage mv` |
| `gsutil rm` | `gcloud storage rm` |
| `gsutil ls` | `gcloud storage ls` |
| `gsutil rsync` | `gcloud storage rsync` |
| `gsutil stat` | `gcloud storage objects describe` |

Both tools work well. Use whichever fits your workflow better. If you are writing new scripts, consider using `gcloud storage` for better long-term support. For interactive use, gsutil's shorter syntax is hard to beat.
