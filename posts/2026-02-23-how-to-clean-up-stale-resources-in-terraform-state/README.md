# How to Clean Up Stale Resources in Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Cleanup, Infrastructure as Code, DevOps, Resource Management

Description: Learn how to identify and clean up stale resources in Terraform state, including orphaned entries, deleted cloud resources, and leftover references from refactored configurations.

---

Stale resources in Terraform state are entries that no longer correspond to real cloud resources or no longer match your configuration. They accumulate over time from manual cloud console changes, failed destroys, refactored modules, and resources that were deleted outside of Terraform. If left unchecked, stale entries bloat your state file, slow down operations, and cause confusing errors.

This guide shows you how to find stale resources, understand why they exist, and clean them up safely.

## What Makes a Resource Stale

A resource in Terraform state becomes stale when:

- **The cloud resource was deleted manually** through the console, CLI, or another tool. The state still has an entry, but the resource no longer exists.
- **A failed destroy** left the state entry intact while the actual resource was partially or fully deleted.
- **Configuration was removed** but `terraform apply` was not run, so the resource was never destroyed.
- **Module refactoring** changed resource addresses without using `moved` blocks or `terraform state mv`.
- **Import errors** created duplicate or incorrect state entries.

## Identifying Stale Resources

### Using terraform plan

The simplest way to find stale resources is to run `terraform plan`:

```bash
terraform plan
```

Look for these patterns in the output:

```text
# Resource in state but not in config - will be destroyed
- aws_instance.old_server will be destroyed
  (because aws_instance.old_server is not in configuration)

# Resource in state but deleted from cloud - will error or recreate
+ aws_s3_bucket.data will be created
  (because the existing resource was not found)
```

### Using terraform refresh

The `terraform plan -refresh-only` command updates state to match reality without changing any configuration:

```bash
# See what has drifted without making changes
terraform plan -refresh-only

# The output shows resources that exist in state
# but no longer exist in the cloud
```

### Scripted Detection

For large state files, automate the detection:

```bash
#!/bin/bash
# find-stale-resources.sh - Identify resources that need cleanup

set -euo pipefail

echo "Checking for stale resources..."

# Get all resources from state
terraform state list > /tmp/state-resources.txt
TOTAL=$(wc -l < /tmp/state-resources.txt)
echo "Total resources in state: $TOTAL"

# Run a refresh to detect deleted resources
terraform plan -refresh-only -no-color 2>&1 | tee /tmp/refresh-output.txt

# Look for resources that will be removed from state
STALE=$(grep -c "has been deleted" /tmp/refresh-output.txt 2>/dev/null || echo "0")
echo "Stale resources detected: $STALE"

# Look for resources in state but not in config
terraform plan -no-color 2>&1 | \
  grep "will be destroyed" | \
  grep "not in configuration" > /tmp/orphaned-resources.txt 2>/dev/null || true

ORPHANED=$(wc -l < /tmp/orphaned-resources.txt)
echo "Orphaned resources (in state, not in config): $ORPHANED"
```

## Cleaning Up Deleted Cloud Resources

When a resource was deleted outside of Terraform, the state entry is stale. Terraform will try to recreate it on the next apply.

```bash
# Option 1: Remove the stale entry from state
# This tells Terraform to forget about the resource
terraform state rm aws_instance.deleted_server

# Option 2: Apply a refresh to update state automatically
terraform apply -refresh-only

# This removes state entries for resources that no longer exist
# and is generally safer than manual state rm
```

Use `terraform apply -refresh-only` when you have many stale resources. It handles them all in one pass:

```bash
# Preview what will be cleaned up
terraform plan -refresh-only

# Apply the cleanup
terraform apply -refresh-only -auto-approve
```

## Cleaning Up Orphaned Configuration Resources

When configuration is removed but `terraform apply` has not run, the resources still exist in both the cloud and state. Terraform will want to destroy them:

```bash
# See what Terraform wants to destroy
terraform plan

# If you want to destroy the resources (clean deletion)
terraform apply

# If you want to keep the resources but stop managing them
terraform state rm aws_instance.old_server
terraform state rm aws_s3_bucket.legacy_data
```

## Cleaning Up After Module Refactoring

Module refactoring often creates stale references because resource addresses change:

```bash
# Before refactoring: aws_instance.web
# After refactoring: module.web.aws_instance.this

# Terraform sees the old address as "destroy" and the new as "create"
# Fix by moving the state entry to the new address
terraform state mv aws_instance.web module.web.aws_instance.this

# Or use moved blocks (Terraform 1.1+)
```

```hcl
# moved.tf - Declare the address change
moved {
  from = aws_instance.web
  to   = module.web.aws_instance.this
}
```

## Bulk Cleanup Script

For major cleanups, script the process:

```bash
#!/bin/bash
# cleanup-stale-state.sh - Remove stale resources from state

set -euo pipefail

# Back up state first
echo "Backing up state..."
terraform state pull > state-backup-$(date +%Y%m%d_%H%M%S).json

# Get the list of resources to clean up
# This file should be manually reviewed before running
CLEANUP_FILE=${1:-"cleanup-list.txt"}

if [ ! -f "$CLEANUP_FILE" ]; then
  echo "Creating cleanup list..."
  echo "# Add resource addresses to remove, one per line" > "$CLEANUP_FILE"
  echo "# Review this file before running cleanup" >> "$CLEANUP_FILE"

  # Find resources that were deleted from cloud
  terraform plan -refresh-only -no-color 2>&1 | \
    grep -B1 "has been deleted" | \
    grep "# " | \
    sed 's/.*# //' | \
    sed 's/ .*//' >> "$CLEANUP_FILE"

  echo "Review $CLEANUP_FILE and re-run this script"
  exit 0
fi

# Process the cleanup list
while IFS= read -r resource; do
  # Skip comments and empty lines
  [[ "$resource" =~ ^#.*$ ]] && continue
  [[ -z "$resource" ]] && continue

  echo "Removing: $resource"
  terraform state rm "$resource" || echo "  WARNING: Failed to remove $resource"
done < "$CLEANUP_FILE"

echo "Cleanup complete. Running plan to verify..."
terraform plan
```

## Handling Data Source Stale Entries

Data sources can also have stale entries if the referenced resource was deleted:

```bash
# Data source errors show up during plan
# Error: Reference to undiscoverable resource

# Data sources are automatically refreshed, so stale entries
# usually manifest as errors rather than stale state

# Fix by updating the configuration to reference an existing resource
# or by removing the data source if it is no longer needed
```

## Preventing Stale Resources

Prevention is better than cleanup. Here are strategies to minimize stale resources:

```hcl
# 1. Use lifecycle rules to prevent accidental deletion
resource "aws_s3_bucket" "important_data" {
  bucket = "important-data"

  lifecycle {
    prevent_destroy = true
  }
}
```

```bash
# 2. Run regular drift detection
# Schedule this in CI/CD to catch out-of-band changes early
terraform plan -detailed-exitcode
# Exit code 0 = no changes
# Exit code 2 = changes detected
```

```hcl
# 3. Use check blocks for health monitoring (Terraform 1.5+)
check "bucket_exists" {
  data "aws_s3_bucket" "check" {
    bucket = aws_s3_bucket.data.id
  }

  assert {
    condition     = data.aws_s3_bucket.check.id != ""
    error_message = "The data bucket has been deleted outside of Terraform"
  }
}
```

## Scheduled Cleanup Pipeline

Set up a regular cleanup job to catch stale resources before they accumulate:

```yaml
# .github/workflows/state-cleanup.yml
name: Terraform State Cleanup

on:
  schedule:
    - cron: '0 3 * * 0'  # Weekly on Sunday at 3 AM

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Detect Stale Resources
        id: detect
        run: |
          OUTPUT=$(terraform plan -refresh-only -no-color 2>&1)
          if echo "$OUTPUT" | grep -q "has been deleted"; then
            echo "stale_found=true" >> $GITHUB_OUTPUT
            echo "$OUTPUT" > stale-report.txt
          else
            echo "stale_found=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Cleanup Issue
        if: steps.detect.outputs.stale_found == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('stale-report.txt', 'utf8');
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Stale Terraform resources detected',
              body: `Stale resources were found during the weekly cleanup scan.\n\n\`\`\`\n${report}\n\`\`\``,
              labels: ['terraform', 'cleanup']
            });
```

## Best Practices

1. **Run `terraform plan -refresh-only` regularly** to detect drift and stale entries.
2. **Always back up state** before any cleanup operation.
3. **Review before removing.** Use a cleanup list file that requires manual review.
4. **Use `moved` blocks** instead of manual state manipulation when refactoring.
5. **Enable drift detection in CI/CD** to catch out-of-band changes early.
6. **Use `prevent_destroy`** on critical resources to avoid accidental deletion.
7. **Schedule weekly cleanup scans** to prevent stale resource accumulation.
8. **Document all out-of-band changes.** If someone modifies infrastructure outside Terraform, record it so the state can be updated.

Stale resources are an inevitable part of managing infrastructure with Terraform. Regular cleanup keeps your state file accurate and your operations running smoothly.
