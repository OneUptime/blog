# How to Automate Terraform Migration with Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Automation, Migration, Scripting, Infrastructure as Code

Description: Learn how to write automation scripts for Terraform migrations including state operations, resource discovery, import generation, and verification workflows.

---

Manual Terraform migrations are slow, error-prone, and do not scale. Automating migration tasks with scripts reduces human error, speeds up execution, and makes the process repeatable. This guide covers practical automation scripts for common Terraform migration scenarios.

## Why Automate Migrations

A manual migration of 500 resources requires hundreds of individual commands, each with the potential for typos or incorrect resource IDs. Scripts eliminate these risks by generating commands programmatically, executing them consistently, and verifying results automatically. They also create an audit trail and can be tested before production execution.

## Script 1: Resource Discovery and Inventory

Discover all resources managed by Terraform and generate an inventory:

```bash
#!/bin/bash
# discover-resources.sh

# Generate a complete inventory of Terraform-managed resources

OUTPUT_FILE="inventory.csv"
echo "Address,Type,Module,Provider" > "$OUTPUT_FILE"

# Get all resources from state
terraform state list | while read -r address; do
  # Extract resource type
  TYPE=$(echo "$address" | sed 's/module\.[^.]*\.//g' | sed 's/\[.*//;s/\..*//')

  # Extract module path
  MODULE=$(echo "$address" | grep -o 'module\.[^.]*' | paste -sd'.' -)
  MODULE=${MODULE:-"root"}

  # Extract provider
  PROVIDER=$(echo "$TYPE" | cut -d'_' -f1)

  echo "$address,$TYPE,$MODULE,$PROVIDER" >> "$OUTPUT_FILE"
done

echo "Inventory saved to $OUTPUT_FILE"
echo "Total resources: $(($(wc -l < "$OUTPUT_FILE") - 1))"
echo ""
echo "Resources by type:"
tail -n +2 "$OUTPUT_FILE" | cut -d',' -f2 | sort | uniq -c | sort -rn | head -20
```

## Script 2: Generate Import Blocks from Cloud Resources

```python
#!/usr/bin/env python3
"""
generate_imports.py
Generate Terraform import blocks from cloud provider resources.
"""
import subprocess
import json
import re

def terraform_name(value, fallback):
    """Convert a cloud name into a valid, unique Terraform resource name."""
    name = re.sub(r"[^A-Za-z0-9_-]", "_", value or fallback).lower()
    if not name or name[0].isdigit():
        name = f"resource_{name}"
    return name

def unique_name(base, used_names):
    """Avoid generating duplicate Terraform resource addresses."""
    name = base
    counter = 2
    while name in used_names:
        name = f"{base}_{counter}"
        counter += 1
    used_names.add(name)
    return name

def get_aws_instances(region, used_names):
    """Discover EC2 instances and generate import blocks."""
    result = subprocess.run(
        ["aws", "ec2", "describe-instances",
         "--region", region,
         "--filters", "Name=instance-state-name,Values=running",
         "--query", "Reservations[].Instances[].[InstanceId,Tags[?Key=='Name'].Value|[0]]",
         "--output", "json"],
        capture_output=True, text=True, check=True
    )
    instances = json.loads(result.stdout)
    imports = []
    for instance_id, name in instances:
        safe_name = unique_name(terraform_name(name, f"unnamed_{instance_id}"), used_names)
        imports.append(f'''import {{
  to = aws_instance.{safe_name}
  id = "{instance_id}"
}}
''')
    return imports

def get_aws_s3_buckets(used_names):
    """Discover S3 buckets and generate import blocks."""
    result = subprocess.run(
        ["aws", "s3api", "list-buckets",
         "--query", "Buckets[].Name",
         "--output", "json"],
        capture_output=True, text=True, check=True
    )
    buckets = json.loads(result.stdout)
    imports = []
    for bucket in buckets:
        safe_name = unique_name(terraform_name(bucket, "bucket"), used_names)
        imports.append(f'''import {{
  to = aws_s3_bucket.{safe_name}
  id = "{bucket}"
}}
''')
    return imports

def main():
    all_imports = []
    all_imports.extend(get_aws_instances("us-east-1", set()))
    all_imports.extend(get_aws_s3_buckets(set()))

    with open("imports.tf", "w") as f:
        f.write("# Auto-generated import blocks\n\n")
        for imp in all_imports:
            f.write(imp + "\n")

    print(f"Generated {len(all_imports)} import blocks in imports.tf")

if __name__ == "__main__":
    main()
```

## Script 3: Batch State Moves

```bash
#!/bin/bash
# batch-state-moves.sh
# Execute batch state moves from a mapping file

set -e

MAPPING_FILE=$1
BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"

if [ -z "$MAPPING_FILE" ]; then
  echo "Usage: $0 <mapping-file>"
  echo "Mapping file format: source_address,target_address"
  exit 1
fi

# Create backup
mkdir -p "$BACKUP_DIR"
terraform state pull > "$BACKUP_DIR/pre-migration.json"
echo "State backed up to $BACKUP_DIR/pre-migration.json"

# Count total moves
TOTAL=$(wc -l < "$MAPPING_FILE")
CURRENT=0
FAILED=0

# Execute moves
while IFS=',' read -r source target; do
  CURRENT=$((CURRENT + 1))
  echo "[$CURRENT/$TOTAL] Moving: $source -> $target"

  if terraform state mv "$source" "$target" 2>&1; then
    echo "  Success"
  else
    echo "  FAILED"
    FAILED=$((FAILED + 1))
  fi
done < "$MAPPING_FILE"

echo ""
echo "=== Summary ==="
echo "Total: $TOTAL"
echo "Succeeded: $((TOTAL - FAILED))"
echo "Failed: $FAILED"

# Verify
echo ""
echo "Running terraform plan to verify..."
terraform plan -detailed-exitcode
```

## Script 4: Migration Verification

```bash
#!/bin/bash
# verify-migration.sh
# Comprehensive verification after migration

set -e

echo "=== Terraform Migration Verification ==="
echo ""

# Step 1: Check state health
echo "Step 1: Checking state health..."
RESOURCE_COUNT=$(terraform state list | wc -l)
echo "  Resources in state: $RESOURCE_COUNT"

# Step 2: Run plan
echo ""
echo "Step 2: Running terraform plan..."
PLAN_OUTPUT=$(terraform plan -detailed-exitcode -no-color 2>&1) || PLAN_EXIT=$?
PLAN_EXIT=${PLAN_EXIT:-0}

case $PLAN_EXIT in
  0)
    echo "  PASS: No changes detected"
    ;;
  1)
    echo "  ERROR: Plan failed"
    echo "$PLAN_OUTPUT"
    exit 1
    ;;
  2)
    echo "  WARNING: Changes detected"
    # Analyze the changes
    CREATES=$(echo "$PLAN_OUTPUT" | grep -c "will be created" || true)
    UPDATES=$(echo "$PLAN_OUTPUT" | grep -c "will be updated" || true)
    DESTROYS=$(echo "$PLAN_OUTPUT" | grep -c "will be destroyed" || true)
    REPLACES=$(echo "$PLAN_OUTPUT" | grep -c "must be replaced" || true)

    echo "  Creates: $CREATES"
    echo "  Updates: $UPDATES"
    echo "  Destroys: $DESTROYS"
    echo "  Replaces: $REPLACES"

    if [ "$DESTROYS" -gt 0 ] || [ "$REPLACES" -gt 0 ]; then
      echo ""
      echo "  CRITICAL: Destructive changes detected!"
      echo "$PLAN_OUTPUT" | grep -B5 "will be destroyed\|must be replaced"
      exit 1
    fi
    ;;
esac

# Step 3: Validate configuration
echo ""
echo "Step 3: Validating configuration..."
if terraform validate; then
  echo "  PASS: Configuration is valid"
else
  echo "  FAIL: Validation errors found"
  exit 1
fi

# Step 4: Check for orphaned resources
echo ""
echo "Step 4: Checking for orphaned resources..."
ORPHANS=$(terraform plan -no-color 2>&1 | grep "will be created" | wc -l || true)
if [ "$ORPHANS" -gt 0 ]; then
  echo "  WARNING: $ORPHANS resources would be created (possible orphans)"
else
  echo "  PASS: No orphaned resources"
fi

echo ""
echo "=== Verification Complete ==="
```

## Script 5: Automated Rollback

```bash
#!/bin/bash
# auto-rollback.sh
# Automatically roll back if migration verification fails

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <state-backup-file>"
  exit 1
fi

echo "Running migration verification..."
if ./verify-migration.sh; then
  echo "Migration verified successfully. No rollback needed."
  exit 0
fi

echo ""
echo "Verification failed. Starting automatic rollback..."
echo "Restoring state from: $BACKUP_FILE"

# Restore state
terraform state push "$BACKUP_FILE"

# Revert configuration
git checkout -- *.tf

# Re-initialize
terraform init

# Verify rollback
echo ""
echo "Verifying rollback..."
if terraform plan -detailed-exitcode; then
  echo "Rollback successful. State restored to pre-migration condition."
else
  echo "WARNING: Rollback completed but changes detected. Manual review required."
fi
```

## Script 6: Multi-Configuration Migration

```bash
#!/bin/bash
# multi-config-migrate.sh
# Migrate multiple Terraform configurations in sequence

set -e

CONFIGS=(
  "environments/production/networking"
  "environments/production/compute"
  "environments/production/databases"
  "environments/production/monitoring"
)

RESULTS_FILE="migration-results.log"
ROOT_DIR=$(pwd)
echo "Migration Results - $(date)" > "$ROOT_DIR/$RESULTS_FILE"

for config in "${CONFIGS[@]}"; do
  echo ""
  echo "============================================"
  echo "Migrating: $config"
  echo "============================================"

  cd "$ROOT_DIR/$config"

  # Back up
  terraform state pull > "/tmp/backup-$(basename "$config").json"

  # Initialize
  terraform init > /dev/null 2>&1

  # Plan
  set +e
  terraform plan -detailed-exitcode > /dev/null 2>&1
  PLAN_EXIT=$?
  set -e

  case $PLAN_EXIT in
    0) RESULT="PASS" ;;
    1) RESULT="ERROR" ;;
    2) RESULT="CHANGES_DETECTED" ;;
  esac

  echo "$config: $RESULT" >> "$ROOT_DIR/$RESULTS_FILE"
  echo "Result: $RESULT"

  cd "$ROOT_DIR"
done

echo ""
echo "=== All Results ==="
cat "$ROOT_DIR/$RESULTS_FILE"
```

## Best Practices for Migration Scripts

Always include state backups before any state-modifying operation. Add error handling with set -e and explicit error checks. Include dry-run modes that show what would happen without making changes. Log all operations for audit and debugging. Make scripts idempotent so they can be safely re-run. Include verification steps that halt on failure. Test scripts in non-production environments first. Use version control for all migration scripts.

## Conclusion

Automating Terraform migrations with scripts transforms a risky manual process into a reliable, repeatable operation. From resource discovery to batch state moves to automated verification and rollback, each script addresses a specific migration challenge. Invest time in building these scripts, and they will pay for themselves through reduced errors, faster execution, and better auditability.

For related guides, see [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view) and [How to Test Migrations Before Applying in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-test-migrations-before-applying-in-terraform/view).
