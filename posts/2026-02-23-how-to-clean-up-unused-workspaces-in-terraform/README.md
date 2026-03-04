# How to Clean Up Unused Workspaces in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Cleanup, Cost Optimization, DevOps, Maintenance

Description: Learn how to identify and safely remove unused Terraform workspaces along with their resources to reduce costs and state file clutter.

---

Terraform workspaces accumulate over time. Feature branches get merged, demos end, test environments are forgotten. Each abandoned workspace potentially has cloud resources still running and costing money. Regular cleanup of unused workspaces is essential for keeping your infrastructure manageable and your cloud bills reasonable.

## Identifying Unused Workspaces

The first step is figuring out which workspaces are actually unused. There are several signals to look for.

### List All Workspaces

```bash
# Get a list of all workspaces
terraform workspace list

# Count them
terraform workspace list | wc -l

# If you have many workspaces, pipe through grep to find patterns
terraform workspace list | grep "test-"
terraform workspace list | grep "demo-"
```

### Check When Each Workspace Was Last Modified

```bash
#!/bin/bash
# workspace-ages.sh
# Shows the last modification time for each workspace's state

ORIGINAL_WS=$(terraform workspace show)

echo "Workspace State Ages"
echo "===================="
printf "%-40s %-10s %-20s\n" "Workspace" "Resources" "Last Modified"
echo "---------------------------------------------------------------------"

terraform workspace list | tr -d ' *' | while read -r ws; do
  [ -z "$ws" ] && continue

  terraform workspace select "$ws" > /dev/null 2>&1

  # Pull the state and check the serial and version
  state=$(terraform state pull 2>/dev/null)

  if [ -z "$state" ] || [ "$state" = "{}" ]; then
    printf "%-40s %-10s %-20s\n" "$ws" "0" "empty state"
    continue
  fi

  resource_count=$(echo "$state" | jq '.resources | length' 2>/dev/null || echo "0")
  serial=$(echo "$state" | jq '.serial' 2>/dev/null || echo "0")

  printf "%-40s %-10s serial: %-10s\n" "$ws" "$resource_count" "$serial"
done

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1
```

### Check S3 Directly for State File Ages

If your backend is S3, you can check modification times without switching workspaces:

```bash
#!/bin/bash
# s3-state-ages.sh
# Checks state file ages directly in S3

BUCKET="company-terraform-state"
PREFIX="env:"
KEY_SUFFIX="services/webapp/terraform.tfstate"

echo "State File Ages in S3"
echo "====================="

# List all workspace state files
aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --prefix "$PREFIX" \
  --query 'Contents[?contains(Key, `terraform.tfstate`)].[Key, LastModified, Size]' \
  --output table

# Find states not modified in the last 30 days
echo ""
echo "States not modified in 30+ days:"
THIRTY_DAYS_AGO=$(date -v-30d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -d "30 days ago" +%Y-%m-%dT%H:%M:%S)

aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --prefix "$PREFIX" \
  --query "Contents[?LastModified<='$THIRTY_DAYS_AGO' && contains(Key, 'terraform.tfstate')].[Key, LastModified]" \
  --output table
```

## Safely Removing Workspaces

Once you have identified workspaces to clean up, follow this process.

### Step 1: Check for Active Resources

Never delete a workspace without first checking if it has resources:

```bash
#!/bin/bash
# check-before-delete.sh
# Checks a workspace before attempting deletion

WS_NAME=$1

if [ -z "$WS_NAME" ]; then
  echo "Usage: $0 <workspace-name>"
  exit 1
fi

# Never clean up permanent environments
if [[ "$WS_NAME" == "prod" || "$WS_NAME" == "staging" || "$WS_NAME" == "dev" ]]; then
  echo "ERROR: Cannot clean up permanent environment: $WS_NAME"
  exit 1
fi

ORIGINAL_WS=$(terraform workspace show)
terraform workspace select "$WS_NAME" > /dev/null 2>&1

# Check for resources
resources=$(terraform state list 2>/dev/null)
count=$(echo "$resources" | grep -c "." 2>/dev/null || echo "0")

if [ "$count" -gt 0 ]; then
  echo "WARNING: Workspace $WS_NAME has $count resources:"
  echo "$resources" | head -20
  if [ "$count" -gt 20 ]; then
    echo "... and $((count - 20)) more"
  fi
  echo ""
  echo "You must destroy these resources before deleting the workspace."
  echo "Run: terraform destroy"
else
  echo "Workspace $WS_NAME is empty - safe to delete."
fi

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1
```

### Step 2: Destroy Resources

```bash
# Switch to the workspace
terraform workspace select test-old-feature

# Review what will be destroyed
terraform plan -destroy

# Destroy all resources
terraform destroy -auto-approve
```

### Step 3: Delete the Workspace

```bash
# Switch to a different workspace first
terraform workspace select dev

# Delete the empty workspace
terraform workspace delete test-old-feature

# If the workspace still has state (e.g., data sources), force delete
terraform workspace delete -force test-old-feature
```

## Automated Cleanup Script

Here is a comprehensive cleanup script that handles the full workflow:

```bash
#!/bin/bash
# cleanup-workspaces.sh
# Automatically identifies and cleans up stale workspaces

set -e

# Configuration
MAX_AGE_DAYS=30
DRY_RUN=${DRY_RUN:-true}
PROTECTED_WORKSPACES="default dev staging prod"
TEMP_PREFIXES="test- demo- experiment- load- feature-"

ORIGINAL_WS=$(terraform workspace show)

echo "Workspace Cleanup"
echo "================="
echo "Max age: $MAX_AGE_DAYS days"
echo "Dry run: $DRY_RUN"
echo ""

# Track what we find
CLEANUP_COUNT=0
ACTIVE_COUNT=0

terraform workspace list | tr -d ' *' | while read -r ws; do
  [ -z "$ws" ] && continue

  # Skip protected workspaces
  is_protected=false
  for protected in $PROTECTED_WORKSPACES; do
    if [ "$ws" = "$protected" ]; then
      is_protected=true
      break
    fi
  done

  if [ "$is_protected" = true ]; then
    echo "PROTECTED: $ws (skipping)"
    continue
  fi

  # Check if it matches a temporary prefix
  is_temporary=false
  for prefix in $TEMP_PREFIXES; do
    if [[ "$ws" == ${prefix}* ]]; then
      is_temporary=true
      break
    fi
  done

  if [ "$is_temporary" = false ]; then
    echo "PERMANENT: $ws (skipping - not a temporary workspace)"
    continue
  fi

  # Check the workspace state
  terraform workspace select "$ws" > /dev/null 2>&1
  resource_count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')

  # Check if workspace name contains a date
  if [[ "$ws" =~ [0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
    ws_date="${BASH_REMATCH[0]}"
    current_epoch=$(date +%s)
    ws_epoch=$(date -j -f "%Y-%m-%d" "$ws_date" +%s 2>/dev/null || \
               date -d "$ws_date" +%s 2>/dev/null || echo "0")

    if [ "$ws_epoch" != "0" ]; then
      age_days=$(( (current_epoch - ws_epoch) / 86400 ))

      if [ "$age_days" -gt "$MAX_AGE_DAYS" ]; then
        echo "STALE: $ws ($age_days days old, $resource_count resources)"

        if [ "$DRY_RUN" = false ]; then
          if [ "$resource_count" -gt 0 ]; then
            echo "  Destroying resources..."
            terraform destroy -auto-approve
          fi
          terraform workspace select "$ORIGINAL_WS"
          terraform workspace delete -force "$ws"
          echo "  Deleted."
        else
          echo "  (dry run - would delete)"
        fi

        CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
        continue
      fi
    fi
  fi

  # If no date in name, check if workspace is empty
  if [ "$resource_count" -eq 0 ]; then
    echo "EMPTY: $ws (no resources)"

    if [ "$DRY_RUN" = false ]; then
      terraform workspace select "$ORIGINAL_WS"
      terraform workspace delete "$ws"
      echo "  Deleted."
    else
      echo "  (dry run - would delete)"
    fi

    CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
  else
    echo "ACTIVE: $ws ($resource_count resources)"
    ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
  fi
done

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1

echo ""
echo "Summary:"
echo "  Workspaces to clean up: $CLEANUP_COUNT"
echo "  Active temporary workspaces: $ACTIVE_COUNT"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "This was a dry run. To actually clean up, run:"
  echo "  DRY_RUN=false $0"
fi
```

## Scheduling Cleanup in CI/CD

Set up automated cleanup on a schedule:

```yaml
# .github/workflows/workspace-cleanup.yml
name: Workspace Cleanup

on:
  schedule:
    # Run every Sunday at 2am
    - cron: '0 2 * * 0'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run mode'
        required: true
        default: 'true'
        type: choice
        options:
          - 'true'
          - 'false'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Run Cleanup
        run: |
          DRY_RUN=${{ inputs.dry_run || 'true' }} \
          bash scripts/cleanup-workspaces.sh 2>&1 | tee cleanup-report.txt

      - name: Post Results to Slack
        if: always()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-type: application/json' \
            -d "{\"text\": \"Workspace Cleanup Report:\n\$(cat cleanup-report.txt | tail -10)\"}"

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: cleanup-report
          path: cleanup-report.txt
```

## Cleaning Up Backend State Files

After deleting workspaces, the state files may still exist in your backend. Clean those up too:

```bash
#!/bin/bash
# cleanup-s3-state.sh
# Removes orphaned state files from S3

BUCKET="company-terraform-state"

# Get list of current workspaces
CURRENT_WS=$(terraform workspace list | tr -d ' *' | sort)

# Get list of state files in S3
echo "Checking for orphaned state files..."

aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --prefix "env:" \
  --query 'Contents[].Key' \
  --output text | tr '\t' '\n' | while read -r key; do

  # Extract workspace name from the key
  # Format: env:/workspace-name/path/to/terraform.tfstate
  ws_name=$(echo "$key" | cut -d'/' -f2)

  if echo "$CURRENT_WS" | grep -q "^${ws_name}$"; then
    echo "ACTIVE: $key"
  else
    echo "ORPHANED: $key"
    # Uncomment to delete:
    # aws s3 rm "s3://${BUCKET}/${key}"
  fi
done
```

## Preventing Workspace Sprawl

Prevention is better than cleanup. Here are strategies to keep workspaces under control:

1. Include dates in temporary workspace names so staleness is obvious
2. Set up automated alerts when new workspaces are created
3. Require workspace creators to specify an expiry date
4. Run the cleanup script weekly
5. Track workspace counts as a metric in your monitoring system

```hcl
# Add an expiry mechanism to your configuration
variable "workspace_expires" {
  description = "When this workspace should be cleaned up (ISO 8601 date)"
  type        = string
  default     = ""

  validation {
    condition     = var.workspace_expires == "" || can(timeadd(var.workspace_expires, "0s"))
    error_message = "workspace_expires must be a valid ISO 8601 timestamp or empty string."
  }
}
```

## Summary

Unused Terraform workspaces are a source of wasted money and operational confusion. Regular cleanup using automated scripts, combined with naming conventions that make staleness obvious, keeps your workspace list manageable. The key principle is simple: always check for resources before deleting a workspace, always back up state before destructive operations, and automate the process so it actually happens. For more on workspace management, see our guide on [listing resources across workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-list-resources-across-all-workspaces-in-terraform/view).
