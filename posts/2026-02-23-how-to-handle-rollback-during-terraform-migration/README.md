# How to Handle Rollback During Terraform Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Rollback, Migration, State Management, Disaster Recovery

Description: Learn rollback strategies for Terraform migrations including state restoration, configuration rollback, and recovery procedures for failed migration steps.

---

Even well-planned Terraform migrations can encounter unexpected issues that require rolling back changes. Having a solid rollback strategy means the difference between a minor setback and a major incident. This guide covers rollback techniques for various types of Terraform migrations, from state operations to configuration changes.

## Why Rollback Planning Matters

Terraform state is the source of truth for your infrastructure. A corrupted or incorrect state can cause Terraform to destroy resources or create duplicates. Rollback planning ensures you can always return to a known-good state, minimizing the blast radius of any migration issue.

## Pre-Migration Backup Strategy

Before any migration operation, create comprehensive backups:

```bash
#!/bin/bash
# pre-migration-backup.sh
# Create a complete backup before migration

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Back up state
terraform state pull > "$BACKUP_DIR/terraform.tfstate"
echo "State backed up to $BACKUP_DIR/terraform.tfstate"

# Back up configuration
cp -r *.tf "$BACKUP_DIR/"
echo "Configuration backed up to $BACKUP_DIR/"

# Back up lock file
cp .terraform.lock.hcl "$BACKUP_DIR/" 2>/dev/null
echo "Lock file backed up"

# Record current git commit
git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
echo "Git commit recorded: $(cat $BACKUP_DIR/git-commit.txt)"

# Record provider versions
terraform version -json > "$BACKUP_DIR/versions.json"
echo "Versions recorded"

echo ""
echo "Backup complete at: $BACKUP_DIR"
echo "To restore: terraform state push $BACKUP_DIR/terraform.tfstate"
```

## Rolling Back State Operations

### Restoring from a Local Backup

```bash
# Restore state from a backup file
terraform state push backups/20260223-143000/terraform.tfstate

# Verify the restored state
terraform state list
terraform plan
```

### Restoring from a Versioned S3 Backend

```bash
# List available state versions
aws s3api list-object-versions \
  --bucket terraform-state \
  --prefix prod/terraform.tfstate \
  --query 'Versions[*].[VersionId,LastModified,Size]' \
  --output table

# Restore a specific version
aws s3api get-object \
  --bucket terraform-state \
  --key prod/terraform.tfstate \
  --version-id "abc123-version-id" \
  restored-state.json

# Push the restored state
terraform state push restored-state.json
```

### Restoring from Azure Blob Versioning

```bash
# List blob snapshots
az storage blob list \
  --container-name tfstate \
  --account-name mystorageaccount \
  --query '[].{Name:name,Snapshot:snapshot,Modified:properties.lastModified}'

# Restore from a snapshot
az storage blob copy start \
  --destination-container tfstate \
  --destination-blob prod.terraform.tfstate \
  --source-account-name mystorageaccount \
  --source-container tfstate \
  --source-blob prod.terraform.tfstate \
  --source-snapshot "2026-02-23T14:30:00.0000000Z"
```

## Rolling Back Configuration Changes

### Using Git

```bash
# Revert to the pre-migration commit
git log --oneline -5  # Find the pre-migration commit
git checkout pre-migration-commit -- *.tf

# Or revert the migration commit
git revert migration-commit-hash

# Re-initialize and verify
terraform init
terraform plan
```

### Using Stash

```bash
# If you stashed the original configuration
git stash pop

# Re-initialize
terraform init
terraform plan
```

## Rolling Back State Moves

If you moved resources to wrong addresses:

```bash
# Move them back
terraform state mv module.new.aws_instance.web aws_instance.web

# Or if you have a backup, restore it
terraform state push pre-migration-state.json
```

## Rolling Back Import Operations

If imports brought in wrong resources:

```bash
# Remove incorrectly imported resources from state
terraform state rm aws_instance.wrong_import

# The real resource is not affected - only the state entry is removed
# Re-import with the correct resource if needed
terraform import aws_instance.correct_name i-correct-id
```

## Rolling Back Backend Migrations

If a backend migration went wrong:

```bash
# Option 1: Reconfigure back to the old backend
# Update backend configuration to point to the old backend
terraform init -reconfigure

# Option 2: If state was lost, push the backup
terraform state push pre-migration-state.json
```

## Automated Rollback Script

```bash
#!/bin/bash
# rollback.sh
# Automated rollback for Terraform migration

set -e

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: ./rollback.sh <backup-directory>"
  echo ""
  echo "Available backups:"
  ls -la backups/
  exit 1
fi

echo "Rolling back to: $BACKUP_DIR"

# Verify backup exists
if [ ! -f "$BACKUP_DIR/terraform.tfstate" ]; then
  echo "ERROR: State backup not found at $BACKUP_DIR/terraform.tfstate"
  exit 1
fi

# Restore configuration from git
if [ -f "$BACKUP_DIR/git-commit.txt" ]; then
  COMMIT=$(cat "$BACKUP_DIR/git-commit.txt")
  echo "Restoring configuration from git commit: $COMMIT"
  git checkout "$COMMIT" -- *.tf
fi

# Restore state
echo "Restoring state..."
terraform state push "$BACKUP_DIR/terraform.tfstate"

# Initialize
echo "Reinitializing..."
terraform init

# Verify
echo "Verifying rollback..."
PLAN_EXIT=0
terraform plan -detailed-exitcode || PLAN_EXIT=$?

case $PLAN_EXIT in
  0)
    echo "SUCCESS: Rollback complete. No changes detected."
    ;;
  2)
    echo "WARNING: Rollback complete but changes detected."
    echo "Review the plan output above."
    ;;
  *)
    echo "ERROR: Rollback may have failed. Review errors above."
    exit 1
    ;;
esac
```

## Rollback Decision Framework

When to roll back versus push forward:

```text
Roll Back If:
  - Resources would be destroyed unintentionally
  - State is corrupted or inconsistent
  - Multiple resources show unexpected changes
  - Production systems are impacted
  - The migration step cannot be completed

Push Forward If:
  - Only minor configuration adjustments are needed
  - Plan shows only expected non-destructive changes
  - The issue is with one resource out of many
  - Rolling back would cause more disruption
```

## Partial Rollback

Sometimes you need to roll back only part of a migration:

```bash
# Roll back specific resources while keeping others
# Example: Wave 3 failed but Waves 1 and 2 succeeded

# Only restore state for Wave 3 resources
terraform state rm module.compute.aws_instance.web  # Remove failed migration
terraform state push --partial wave3-backup.json     # Restore original entries

# Or manually move resources back
terraform state mv module.compute.aws_instance.web aws_instance.web
terraform state mv module.compute.aws_instance.api aws_instance.api
```

## Preventing the Need for Rollback

```bash
# Use import blocks instead of CLI imports (can be removed without state changes)
# Use moved blocks instead of state mv (can be verified with plan first)
# Use -out flag to save plans before applying

# Always preview before applying
terraform plan -out=migration.tfplan

# Review the plan file
terraform show migration.tfplan

# Only apply after thorough review
terraform apply migration.tfplan
```

## Best Practices

Create backups before every migration step, not just at the beginning. Test rollback procedures in non-production environments. Automate backup and rollback scripts to reduce human error. Keep rollback procedures documented and accessible. Practice rollbacks during migration testing. Define clear rollback triggers and criteria. Time-box migration steps so you know when to trigger a rollback rather than continuing to troubleshoot.

## Conclusion

Effective rollback strategies are as important as the migration itself. By maintaining comprehensive backups, automating rollback procedures, and defining clear criteria for when to roll back, you can execute Terraform migrations with confidence. The key is preparation: backups taken before every step, tested rollback scripts, and clear decision frameworks. With these in place, even a failed migration is just a temporary setback rather than an incident.

For related guides, see [How to Test Migrations Before Applying in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-test-migrations-before-applying-in-terraform/view) and [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view).
