# How to Create and Configure Google Cloud Storage Buckets Using the gcloud CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, gcloud CLI, Cloud Storage Buckets, DevOps

Description: Learn how to create, configure, and manage Google Cloud Storage buckets using the gcloud command-line interface with practical examples and best practices.

---

Google Cloud Storage is one of those services you interact with constantly when working on GCP. Whether you are storing application assets, backups, logs, or data for analytics pipelines, buckets are at the center of it all. While the Console UI is fine for quick tasks, the gcloud CLI is where you get real productivity - especially when you need to script, automate, or repeat operations across environments.

This guide walks through the essential gcloud commands for creating and configuring Cloud Storage buckets, with real examples you can adapt for your own projects.

## Prerequisites

Before you begin, make sure you have:

- A GCP project with billing enabled
- The Google Cloud SDK installed and authenticated
- The `storage` component available (included by default in recent SDK versions)

Run this to confirm your setup is ready:

```bash
# Check your active project and authenticated account
gcloud config list
```

If you need to set a default project:

```bash
# Set the project that gcloud commands will target
gcloud config set project my-project-id
```

## Creating a Basic Bucket

The simplest way to create a bucket uses `gcloud storage buckets create`. Bucket names must be globally unique across all of GCP, so pick something distinctive.

```bash
# Create a bucket in the US multi-region with default settings
gcloud storage buckets create gs://my-app-data-bucket-2026 \
  --location=US
```

That gives you a Standard-class bucket in the US multi-region. For most use cases, this is a solid starting point.

## Choosing a Location

Location matters for latency and cost. You have three types of locations to choose from:

- **Multi-region**: `US`, `EU`, `ASIA` - highest availability, geo-redundant
- **Dual-region**: Like `NAM4` (Iowa + South Carolina) - balance of redundancy and performance
- **Region**: Like `us-central1` - lowest latency for a specific area, lowest cost

```bash
# Create a bucket in a specific region for lower latency
gcloud storage buckets create gs://my-regional-bucket \
  --location=us-central1

# Create a dual-region bucket for better redundancy
gcloud storage buckets create gs://my-dual-region-bucket \
  --location=nam4
```

Pick a region close to your compute resources. If your Cloud Run services run in `us-central1`, put your bucket there too.

## Setting the Storage Class

Storage classes control how much you pay for storage versus access. You can set this at bucket creation time:

```bash
# Create a bucket with Nearline storage class for infrequently accessed data
gcloud storage buckets create gs://my-nearline-bucket \
  --location=us-central1 \
  --default-storage-class=NEARLINE
```

The available classes are:
- `STANDARD` - frequent access, no minimum storage duration
- `NEARLINE` - accessed less than once a month, 30-day minimum
- `COLDLINE` - accessed less than once a quarter, 90-day minimum
- `ARCHIVE` - accessed less than once a year, 365-day minimum

## Enabling Uniform Bucket-Level Access

By default, GCP lets you control access at both the bucket level and individual object level using ACLs. Uniform bucket-level access simplifies this by using only IAM policies. For most teams, this is the right choice.

```bash
# Create a bucket with uniform bucket-level access enabled
gcloud storage buckets create gs://my-secure-bucket \
  --location=us-central1 \
  --uniform-bucket-level-access
```

If your bucket already exists, you can update it:

```bash
# Enable uniform bucket-level access on an existing bucket
gcloud storage buckets update gs://my-existing-bucket \
  --uniform-bucket-level-access
```

## Adding Labels

Labels help you organize buckets and track costs across teams or environments.

```bash
# Create a bucket with labels for cost tracking and organization
gcloud storage buckets create gs://my-labeled-bucket \
  --location=us-central1 \
  --labels=environment=production,team=backend,cost-center=eng
```

You can update labels later:

```bash
# Add or update labels on an existing bucket
gcloud storage buckets update gs://my-labeled-bucket \
  --update-labels=environment=staging
```

## Configuring Versioning

Object versioning keeps previous versions of objects when they get overwritten or deleted. This is useful for protecting against accidental data loss.

```bash
# Enable versioning on a bucket
gcloud storage buckets update gs://my-app-data-bucket-2026 \
  --versioning
```

To disable it:

```bash
# Disable versioning (existing versions are preserved)
gcloud storage buckets update gs://my-app-data-bucket-2026 \
  --no-versioning
```

## Setting Lifecycle Rules

Lifecycle rules let you automatically transition objects to cheaper storage classes or delete them after a certain period. You define these rules in a JSON file.

Create a lifecycle configuration file:

```json
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 365}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"isLive": false, "numNewerVersions": 3}
    }
  ]
}
```

Apply it to your bucket:

```bash
# Apply lifecycle rules from a JSON configuration file
gcloud storage buckets update gs://my-app-data-bucket-2026 \
  --lifecycle-file=lifecycle.json
```

## Setting a Default Encryption Key

If you need to use Customer-Managed Encryption Keys (CMEK) instead of Google-managed keys:

```bash
# Set a Cloud KMS key as the default encryption key for the bucket
gcloud storage buckets update gs://my-secure-bucket \
  --default-encryption-key=projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key
```

## Viewing Bucket Configuration

To inspect a bucket's full configuration:

```bash
# Display all metadata and configuration for a bucket
gcloud storage buckets describe gs://my-app-data-bucket-2026
```

This outputs everything - location, storage class, versioning status, lifecycle rules, labels, encryption settings, and more.

## Listing Buckets

```bash
# List all buckets in the current project
gcloud storage buckets list

# List buckets with a specific label filter
gcloud storage buckets list --filter="labels.environment=production"
```

## Putting It All Together

Here is a complete example that creates a production-ready bucket with several best practices applied:

```bash
# Create a production bucket with all recommended settings
gcloud storage buckets create gs://myapp-prod-assets-2026 \
  --location=us-central1 \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access \
  --labels=environment=production,team=platform,managed-by=gcloud \
  --versioning

# Apply lifecycle rules to manage costs automatically
gcloud storage buckets update gs://myapp-prod-assets-2026 \
  --lifecycle-file=lifecycle.json

# Verify the configuration
gcloud storage buckets describe gs://myapp-prod-assets-2026
```

## Scripting Bucket Creation

For teams managing multiple environments, you can script bucket creation:

```bash
#!/bin/bash
# Script to create buckets for multiple environments with consistent settings

PROJECT="my-project-id"
REGION="us-central1"
ENVIRONMENTS=("dev" "staging" "production")

for ENV in "${ENVIRONMENTS[@]}"; do
  BUCKET_NAME="gs://${PROJECT}-${ENV}-data"

  echo "Creating bucket: ${BUCKET_NAME}"

  # Create bucket with environment-specific labels
  gcloud storage buckets create "${BUCKET_NAME}" \
    --location="${REGION}" \
    --default-storage-class=STANDARD \
    --uniform-bucket-level-access \
    --labels=environment="${ENV}",managed-by=automation \
    --project="${PROJECT}"

  # Enable versioning for production only
  if [ "${ENV}" = "production" ]; then
    gcloud storage buckets update "${BUCKET_NAME}" --versioning
  fi
done
```

## Deleting a Bucket

When you need to clean up, remember that a bucket must be empty before deletion:

```bash
# Remove all objects from a bucket (careful with this)
gcloud storage rm gs://my-test-bucket/**

# Delete the empty bucket
gcloud storage buckets delete gs://my-test-bucket
```

## Common Pitfalls

A few things that trip people up:

1. **Bucket names are global** - if someone else has the name, you cannot use it. Prefix with your project ID or organization name.
2. **Location cannot be changed** after creation. If you picked the wrong region, you need to create a new bucket and move data.
3. **Uniform bucket-level access is one-way** - once you enable it and the 90-day lock-in period passes, you cannot go back to fine-grained ACLs.
4. **Lifecycle rules are evaluated daily**, not in real-time. Do not expect immediate transitions.

The gcloud CLI gives you everything you need to manage Cloud Storage buckets efficiently. Combine it with shell scripts or tools like Terraform for more complex infrastructure, but for day-to-day operations and quick setups, these commands will cover most of what you need.
