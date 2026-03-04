# How to Migrate Resources Between Workspaces in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, State Migration, Infrastructure as Code, DevOps

Description: Step-by-step guide to safely migrating Terraform-managed resources from one workspace to another without destroying and recreating them.

---

Moving resources between Terraform workspaces is one of those tasks that sounds simple but requires careful execution. The goal is to transfer ownership of existing infrastructure from one workspace's state to another without actually destroying or recreating any resources. This post walks through the process, the tools available, and the gotchas to watch out for.

## Why Migrate Between Workspaces?

There are several common scenarios where you need to move resources:

- You started building in the default workspace and now want to organize into named workspaces
- A resource was accidentally created in the wrong environment
- You are reorganizing your workspace structure
- You are splitting a monolithic workspace into smaller, focused ones

The important thing is that the actual cloud resources should not be affected. You are only changing which state file tracks them.

## The Two-Step Approach: Remove and Import

Terraform does not have a `terraform state mv` command that works across workspaces. The standard approach is:

1. Remove the resource from the source workspace's state (without destroying it)
2. Import the resource into the destination workspace's state

```bash
# Step 1: Record the resource ID from the source workspace
terraform workspace select source-workspace
terraform state show aws_instance.app
# Note the id: i-0abc123def456

# Step 2: Remove from source state (does NOT destroy the resource)
terraform state rm aws_instance.app

# Step 3: Import into destination workspace
terraform workspace select destination-workspace
terraform import aws_instance.app i-0abc123def456

# Step 4: Verify with a plan
terraform plan
# Should show no changes if the configuration matches
```

## Detailed Migration Walkthrough

Let us walk through a real example: migrating a VPC and its associated resources from the "default" workspace to a "prod" workspace.

### Preparation

```bash
#!/bin/bash
# prepare-migration.sh
# Documents all resources and their IDs before migration

set -e

SOURCE_WS="default"
DEST_WS="prod"

terraform workspace select "$SOURCE_WS"

echo "Resources to migrate from $SOURCE_WS to $DEST_WS:"
echo "==================================================="

# List all resources and capture their IDs
terraform state list | while read -r resource; do
  # Get the resource ID
  id=$(terraform state show "$resource" 2>/dev/null | grep "^\s*id\s*=" | head -1 | awk -F'"' '{print $2}')

  if [ -z "$id" ]; then
    # Try without quotes (some resources use = without quotes)
    id=$(terraform state show "$resource" 2>/dev/null | grep "^\s*id\s*=" | head -1 | awk -F'= ' '{print $2}' | tr -d ' ')
  fi

  echo "$resource -> $id"
done | tee migration-manifest.txt

echo ""
echo "Migration manifest saved to migration-manifest.txt"
echo "Review this file carefully before proceeding."
```

### Create a Backup

Always back up both workspaces' state before making changes:

```bash
#!/bin/bash
# backup-states.sh

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Backup source workspace state
terraform workspace select default
terraform state pull > "backup-default-${TIMESTAMP}.json"
echo "Backed up default workspace state"

# Backup destination workspace state (if it exists)
terraform workspace select prod 2>/dev/null || terraform workspace new prod
terraform state pull > "backup-prod-${TIMESTAMP}.json"
echo "Backed up prod workspace state"

echo "Backups saved with timestamp: $TIMESTAMP"
```

### Execute the Migration

```bash
#!/bin/bash
# migrate-resources.sh
# Migrates resources from one workspace to another

set -e

SOURCE_WS="default"
DEST_WS="prod"
MANIFEST="migration-manifest.txt"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: Migration manifest not found. Run prepare-migration.sh first."
  exit 1
fi

echo "Starting migration from $SOURCE_WS to $DEST_WS"
echo ""

# Process each resource in the manifest
while IFS=' -> ' read -r resource id; do
  # Skip empty lines and comments
  [ -z "$resource" ] && continue
  [[ "$resource" == \#* ]] && continue

  echo "Migrating: $resource (ID: $id)"

  # Remove from source workspace
  terraform workspace select "$SOURCE_WS" > /dev/null 2>&1
  if terraform state rm "$resource" 2>/dev/null; then
    echo "  Removed from $SOURCE_WS state"
  else
    echo "  WARNING: Could not remove from $SOURCE_WS - may already be removed"
  fi

  # Import into destination workspace
  terraform workspace select "$DEST_WS" > /dev/null 2>&1
  if terraform import "$resource" "$id" 2>/dev/null; then
    echo "  Imported into $DEST_WS state"
  else
    echo "  ERROR: Failed to import into $DEST_WS"
    echo "  Manual intervention required for: $resource"
  fi

  echo ""
done < "$MANIFEST"

echo "Migration complete. Running validation..."
```

### Validate the Migration

```bash
#!/bin/bash
# validate-migration.sh

set -e

echo "Validating migration..."
echo ""

# Check source workspace - should have no resources
terraform workspace select default
remaining=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
echo "Source workspace (default): $remaining resources remaining"

if [ "$remaining" -gt 0 ]; then
  echo "WARNING: Some resources were not migrated:"
  terraform state list
fi

# Check destination workspace - should have all resources
terraform workspace select prod
migrated=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
echo "Destination workspace (prod): $migrated resources"

# Run a plan to check for drift
echo ""
echo "Running terraform plan to check for differences..."
terraform plan -detailed-exitcode 2>&1 || {
  exit_code=$?
  if [ "$exit_code" -eq 2 ]; then
    echo ""
    echo "WARNING: Plan shows changes. This may indicate:"
    echo "  - Resource attributes differ from configuration"
    echo "  - Some resources were not imported correctly"
    echo "Review the plan output above."
  fi
}
```

## Handling Complex Resources

Some resources are trickier to migrate than others.

### Resources With Sub-Resources

Resources like `aws_security_group` may have inline rules that are also tracked as separate resources:

```bash
# Migrate the security group and its rules together
terraform workspace select default

# List all related resources
terraform state list | grep "aws_security_group"
# aws_security_group.web
# aws_security_group_rule.web_http
# aws_security_group_rule.web_https

# Get all IDs
SG_ID=$(terraform state show aws_security_group.web | grep '^\s*id' | head -1 | awk -F'"' '{print $2}')
HTTP_RULE_ID=$(terraform state show aws_security_group_rule.web_http | grep '^\s*id' | head -1 | awk -F'"' '{print $2}')
HTTPS_RULE_ID=$(terraform state show aws_security_group_rule.web_https | grep '^\s*id' | head -1 | awk -F'"' '{print $2}')

# Remove all from source
terraform state rm aws_security_group_rule.web_http
terraform state rm aws_security_group_rule.web_https
terraform state rm aws_security_group.web

# Import all into destination
terraform workspace select prod
terraform import aws_security_group.web "$SG_ID"
terraform import aws_security_group_rule.web_http "$HTTP_RULE_ID"
terraform import aws_security_group_rule.web_https "$HTTPS_RULE_ID"
```

### Resources With count or for_each

Resources created with `count` or `for_each` need special attention:

```bash
# For count-based resources, include the index
terraform state show 'aws_subnet.private[0]'
terraform state show 'aws_subnet.private[1]'

# Remove with indices
terraform state rm 'aws_subnet.private[0]'
terraform state rm 'aws_subnet.private[1]'

# Import with indices
terraform workspace select prod
terraform import 'aws_subnet.private[0]' subnet-abc123
terraform import 'aws_subnet.private[1]' subnet-def456

# For for_each resources, use the key
terraform state rm 'aws_route53_record.records["www"]'
terraform import 'aws_route53_record.records["www"]' "ZONE_ID_www.example.com_A"
```

### Resources Within Modules

Module resources have a module path prefix:

```bash
# List resources in a module
terraform state list | grep "module.networking"
# module.networking.aws_vpc.main
# module.networking.aws_subnet.public[0]

# Remove module resources
terraform state rm 'module.networking.aws_vpc.main'

# Import into the destination - same module path
terraform workspace select prod
terraform import 'module.networking.aws_vpc.main' vpc-abc123
```

## Using terraform state mv With a Single Backend

If both workspaces use the same state file structure and you have direct access to the state files, you can use a more advanced technique:

```bash
# Pull both states to local files
terraform workspace select default
terraform state pull > source-state.json

terraform workspace select prod
terraform state pull > dest-state.json

# Use terraform state mv with local state files
# This requires temporarily switching to local backend
# WARNING: This is advanced - back up everything first

# A safer alternative: use the moved block in Terraform 1.1+
```

## Using moved Blocks for Planned Migrations

Terraform 1.1 introduced `moved` blocks, which handle state moves as part of `terraform apply`. While they work within a single workspace, you can use them in combination with workspace switches:

```hcl
# If you are renaming resources during migration
moved {
  from = aws_instance.web
  to   = aws_instance.app
}
```

## Rollback Plan

If something goes wrong, you need to be able to roll back:

```bash
#!/bin/bash
# rollback-migration.sh
# Restores state from backup files

set -e

TIMESTAMP=$1

if [ -z "$TIMESTAMP" ]; then
  echo "Usage: $0 <backup-timestamp>"
  echo "Available backups:"
  ls backup-*.json 2>/dev/null
  exit 1
fi

echo "Rolling back to backups from $TIMESTAMP"

# Restore source workspace
terraform workspace select default
terraform state push "backup-default-${TIMESTAMP}.json"
echo "Restored default workspace"

# Restore destination workspace
terraform workspace select prod
terraform state push "backup-prod-${TIMESTAMP}.json"
echo "Restored prod workspace"

echo "Rollback complete. Verify with terraform state list in each workspace."
```

## Summary

Migrating resources between Terraform workspaces follows a predictable pattern: document what needs to move, back up everything, remove from source state, import into destination state, and validate. The process does not touch actual infrastructure - it only changes which state file tracks each resource. Take your time, keep backups, and verify after each step. For related topics, see our guide on [listing resources across workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-list-resources-across-all-workspaces-in-terraform/view).
