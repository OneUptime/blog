# How to Use State File Versioning for Rollback

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Versioning, Rollback, DevOps

Description: Learn how to use state file versioning in S3, GCS, and Azure backends to roll back Terraform state to a previous version when things go wrong.

---

Terraform state files change every time you apply. If an apply goes sideways and corrupts your state or puts it in an inconsistent condition, you need a way to get back to a known good version. That's where state file versioning comes in.

Most cloud storage backends support object versioning, which keeps a history of every version of your state file. Combined with proper backup practices, this gives you a reliable rollback mechanism.

## How State Versioning Works

When versioning is enabled on your storage backend, every write to the state file creates a new version rather than overwriting the previous one. The storage service keeps a complete history, and you can retrieve any past version at any time.

This happens automatically - Terraform doesn't need to know about it. From Terraform's perspective, it reads and writes a single file. The versioning happens at the storage layer.

## Enabling Versioning on S3

If you're using the S3 backend, enable versioning on the bucket:

```hcl
# Create the S3 bucket with versioning enabled
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

  # Prevent accidental deletion of the state bucket
  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning on the state bucket
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Set a lifecycle rule to clean up old versions after 90 days
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # Keep at least 10 versions regardless of age
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }
}
```

## Listing State File Versions on S3

Once versioning is enabled, you can list all versions of your state file:

```bash
# List all versions of the state file
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate \
  --query 'Versions[].{VersionId:VersionId,LastModified:LastModified,Size:Size}' \
  --output table
```

This gives you a table showing each version's ID, when it was last modified, and its size. You'll use the version ID to restore a specific version.

```bash
# Example output:
# ----------------------------------------------------------
# |               ListObjectVersions                       |
# +-------------------+---------------------------+--------+
# |   LastModified    |        VersionId          | Size   |
# +-------------------+---------------------------+--------+
# | 2026-02-23T14:30  | abc123def456ghi789        | 45230  |
# | 2026-02-23T12:15  | xyz987uvw654rst321        | 44890  |
# | 2026-02-22T16:45  | jkl456mno789pqr012        | 44120  |
# +-------------------+---------------------------+--------+
```

## Rolling Back on S3

To roll back to a previous version, download it and push it back as the current state:

```bash
# Download a specific version of the state file
aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --version-id xyz987uvw654rst321 \
  /tmp/terraform.tfstate.rollback

# Verify the downloaded state looks correct
python3 -m json.tool /tmp/terraform.tfstate.rollback > /dev/null
echo "JSON is valid"

# Check the serial number and resource count
jq '{serial: .serial, resource_count: (.resources | length)}' /tmp/terraform.tfstate.rollback

# Push the old version as the new current state
cd /path/to/terraform/config
terraform state push /tmp/terraform.tfstate.rollback
```

After pushing, run `terraform plan` to see what Terraform thinks needs to change. The plan will show you the difference between the rolled-back state and the actual infrastructure.

## Enabling Versioning on GCS

Google Cloud Storage also supports object versioning:

```hcl
# Create the GCS bucket with versioning enabled
resource "google_storage_bucket" "terraform_state" {
  name     = "my-terraform-state"
  location = "US"

  versioning {
    enabled = true
  }

  # Set a lifecycle rule to clean up old versions
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 10  # Keep 10 most recent versions
    }
  }
}
```

### Listing and Rolling Back on GCS

```bash
# List all versions of the state file
gsutil ls -la gs://my-terraform-state/prod/terraform.tfstate

# Download a specific version (identified by generation number)
gsutil cp "gs://my-terraform-state/prod/terraform.tfstate#1708700000000000" \
  /tmp/terraform.tfstate.rollback

# Push the old version back
terraform state push /tmp/terraform.tfstate.rollback
```

## Enabling Versioning on Azure Blob Storage

Azure Blob Storage supports versioning as well:

```hcl
# Create the storage account with versioning enabled
resource "azurerm_storage_account" "terraform_state" {
  name                     = "myterraformstate"
  resource_group_name      = azurerm_resource_group.state.name
  location                 = azurerm_resource_group.state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  blob_properties {
    versioning_enabled = true

    # Also enable soft delete for extra protection
    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }
}
```

### Listing and Rolling Back on Azure

```bash
# List all blob versions
az storage blob list \
  --account-name myterraformstate \
  --container-name tfstate \
  --prefix prod.terraform.tfstate \
  --include v \
  --output table

# Download a specific version
az storage blob download \
  --account-name myterraformstate \
  --container-name tfstate \
  --name prod.terraform.tfstate \
  --version-id "2026-02-23T12:15:00.0000000Z" \
  --file /tmp/terraform.tfstate.rollback

# Push it back
terraform state push /tmp/terraform.tfstate.rollback
```

## Building a Rollback Script

Here's a reusable script for S3-based rollbacks:

```bash
#!/bin/bash
# rollback-state.sh - Roll back Terraform state to a previous version
# Usage: ./rollback-state.sh <bucket> <key> [version-id]

set -euo pipefail

BUCKET="${1:?Usage: $0 <bucket> <key> [version-id]}"
KEY="${2:?Usage: $0 <bucket> <key> [version-id]}"
VERSION_ID="${3:-}"

# If no version ID specified, list available versions
if [ -z "$VERSION_ID" ]; then
  echo "Available versions:"
  aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --prefix "$KEY" \
    --query 'Versions[].{VersionId:VersionId,LastModified:LastModified,Size:Size}' \
    --output table
  echo ""
  read -p "Enter version ID to restore: " VERSION_ID
fi

ROLLBACK_FILE="/tmp/terraform.tfstate.rollback.$$"

echo "Downloading version $VERSION_ID..."
aws s3api get-object \
  --bucket "$BUCKET" \
  --key "$KEY" \
  --version-id "$VERSION_ID" \
  "$ROLLBACK_FILE"

echo "Validating JSON..."
python3 -m json.tool "$ROLLBACK_FILE" > /dev/null

echo "State file details:"
jq '{
  serial: .serial,
  terraform_version: .terraform_version,
  resource_count: (.resources | length),
  output_count: (.outputs | length)
}' "$ROLLBACK_FILE"

read -p "Proceed with rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled."
  rm "$ROLLBACK_FILE"
  exit 0
fi

echo "Pushing rolled-back state..."
terraform state push "$ROLLBACK_FILE"

echo "Rollback complete. Run 'terraform plan' to verify."
rm "$ROLLBACK_FILE"
```

## When to Roll Back vs. When to Fix Forward

Rolling back state is not always the right answer. Consider these scenarios:

**Roll back when:**
- A bad apply corrupted the state but didn't actually change infrastructure.
- You accidentally removed resources from state with `terraform state rm`.
- The state got into an inconsistent condition due to a partial apply failure.
- Someone pushed a manually edited state that broke things.

**Fix forward when:**
- The apply actually changed infrastructure (rolling back state won't undo real changes).
- You've made additional successful applies since the bad one (rolling back would lose those).
- The state drift is minor and can be fixed with `terraform import` or `terraform state mv`.

Rolling back state only restores Terraform's view of the world. It doesn't undo changes to actual infrastructure. After a rollback, run `terraform plan` carefully to understand the gap between the state and reality.

## Automating State Backups

Beyond versioning, consider creating explicit backups at key points in your workflow:

```bash
#!/bin/bash
# backup-state.sh - Create a timestamped backup before major changes

BACKUP_DIR="s3://my-terraform-state-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LABEL="${1:-manual}"

# Pull current state
terraform state pull > "/tmp/state-backup-${TIMESTAMP}.tfstate"

# Upload to backup bucket with metadata
aws s3 cp "/tmp/state-backup-${TIMESTAMP}.tfstate" \
  "${BACKUP_DIR}/${LABEL}/terraform-${TIMESTAMP}.tfstate" \
  --metadata "created-by=$(whoami),label=${LABEL}"

echo "Backup saved to ${BACKUP_DIR}/${LABEL}/terraform-${TIMESTAMP}.tfstate"

# Clean up local file
rm "/tmp/state-backup-${TIMESTAMP}.tfstate"
```

## Integrating with CI/CD

Add state backup steps to your CI/CD pipeline:

```yaml
# .github/workflows/terraform.yml
jobs:
  terraform-apply:
    steps:
      - name: Backup state before apply
        run: |
          terraform state pull > state-backup.tfstate
          aws s3 cp state-backup.tfstate \
            s3://my-backups/pre-apply-$(date +%s).tfstate

      - name: Terraform Apply
        run: terraform apply -auto-approve

      - name: Backup state after apply
        if: success()
        run: |
          terraform state pull > state-after.tfstate
          aws s3 cp state-after.tfstate \
            s3://my-backups/post-apply-$(date +%s).tfstate
```

## Wrapping Up

State file versioning is cheap insurance. Enable it on whatever backend you're using, and you'll always have the option to roll back when something goes wrong. Combine it with explicit backups at key points in your workflow for maximum coverage.

Remember that rolling back state doesn't roll back infrastructure. Always run `terraform plan` after a rollback to understand what Terraform wants to do next.

For more on Terraform state operations, see our guides on [backing up state before major changes](https://oneuptime.com/blog/post/2026-02-23-back-up-terraform-state-before-major-changes/view) and [safely editing state files manually](https://oneuptime.com/blog/post/2026-02-23-safely-edit-terraform-state-files-manually/view).
