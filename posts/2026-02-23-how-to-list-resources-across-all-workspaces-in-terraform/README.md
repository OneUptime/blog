# How to List Resources Across All Workspaces in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, State Management, Resource Inventory, DevOps

Description: Learn how to inventory and list all Terraform-managed resources across every workspace for auditing, compliance, and cost management.

---

Once you have multiple Terraform workspaces managing different environments, a common need is to get a complete picture of all resources across every workspace. Terraform does not have a built-in command for this, but you can script it. This is useful for auditing, cost analysis, compliance checks, and just keeping track of what you have deployed.

## The Problem

When you run `terraform state list`, you only see resources in the current workspace. There is no `terraform state list --all-workspaces` flag. You need to iterate through each workspace and collect the resource lists.

```bash
# This only shows resources in the current workspace
terraform state list

# There is no built-in way to do this:
# terraform state list --all-workspaces  (does not exist)
```

## Basic Script: List Resources Across All Workspaces

Here is a simple script that switches through each workspace and lists its resources:

```bash
#!/bin/bash
# list-all-resources.sh
# Lists all resources across all Terraform workspaces

set -e

# Save the current workspace so we can switch back
ORIGINAL_WS=$(terraform workspace show)

echo "Listing resources across all workspaces"
echo "========================================"
echo ""

# Track totals
TOTAL_RESOURCES=0
TOTAL_WORKSPACES=0

# Iterate through all workspaces
terraform workspace list | tr -d ' *' | while read -r ws; do
  if [ -z "$ws" ]; then
    continue
  fi

  terraform workspace select "$ws" > /dev/null 2>&1

  # Get the resource list for this workspace
  resources=$(terraform state list 2>/dev/null || echo "")
  count=$(echo "$resources" | grep -c "." 2>/dev/null || echo "0")

  echo "Workspace: $ws ($count resources)"

  if [ "$count" -gt 0 ]; then
    echo "$resources" | sed 's/^/  /'
  fi

  echo ""
done

# Switch back to the original workspace
terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1

echo "Done."
```

## Detailed Inventory With Resource Types

For a more useful report, group resources by type:

```bash
#!/bin/bash
# resource-inventory.sh
# Creates a detailed inventory grouped by resource type

set -e

ORIGINAL_WS=$(terraform workspace show)
OUTPUT_FILE="resource-inventory-$(date +%Y%m%d).txt"

echo "Terraform Resource Inventory - $(date)" > "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

# Collect all resources
declare -A TYPE_COUNTS

terraform workspace list | tr -d ' *' | while read -r ws; do
  [ -z "$ws" ] && continue

  terraform workspace select "$ws" > /dev/null 2>&1

  echo "" >> "$OUTPUT_FILE"
  echo "## Workspace: $ws" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"

  # Get resources and group by type
  terraform state list 2>/dev/null | sort | while read -r resource; do
    # Extract the resource type (everything before the first dot)
    resource_type=$(echo "$resource" | cut -d'.' -f1)
    echo "  [$resource_type] $resource" >> "$OUTPUT_FILE"
  done

done

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1

echo ""
echo "Inventory saved to $OUTPUT_FILE"
```

## JSON Output for Programmatic Use

If you need to process the resource list in another tool, JSON output is more practical:

```bash
#!/bin/bash
# list-resources-json.sh
# Outputs all resources across workspaces as JSON

set -e

ORIGINAL_WS=$(terraform workspace show)

# Start building the JSON
echo "{"
echo '  "generated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",'
echo '  "workspaces": ['

FIRST_WS=true

terraform workspace list | tr -d ' *' | while read -r ws; do
  [ -z "$ws" ] && continue

  terraform workspace select "$ws" > /dev/null 2>&1

  if [ "$FIRST_WS" = true ]; then
    FIRST_WS=false
  else
    echo ","
  fi

  # Get resources as JSON array
  resources=$(terraform state list 2>/dev/null | jq -R . | jq -s .)

  echo "    {"
  echo "      \"name\": \"$ws\","
  echo "      \"resource_count\": $(echo "$resources" | jq 'length'),"
  echo "      \"resources\": $resources"
  echo -n "    }"
done

echo ""
echo "  ]"
echo "}"

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1
```

Usage:

```bash
# Generate JSON and save to file
./list-resources-json.sh > all-resources.json

# Query the JSON with jq
# Find all workspaces with more than 10 resources
jq '.workspaces[] | select(.resource_count > 10) | .name' all-resources.json

# List all unique resource types
jq '.workspaces[].resources[]' all-resources.json | \
  jq -r 'split(".")[0]' | sort -u
```

## Getting Resource Details Across Workspaces

Sometimes you need more than just resource names. Here is how to pull detailed attributes:

```bash
#!/bin/bash
# detailed-resources.sh
# Gets detailed info for specific resource types across all workspaces

set -e

RESOURCE_TYPE=${1:-"aws_instance"}
ORIGINAL_WS=$(terraform workspace show)

echo "Detailed listing for resource type: $RESOURCE_TYPE"
echo "=================================================="

terraform workspace list | tr -d ' *' | while read -r ws; do
  [ -z "$ws" ] && continue

  terraform workspace select "$ws" > /dev/null 2>&1

  # Find all resources of the specified type
  matching=$(terraform state list 2>/dev/null | grep "^${RESOURCE_TYPE}\." || true)

  if [ -n "$matching" ]; then
    echo ""
    echo "Workspace: $ws"
    echo "---"

    echo "$matching" | while read -r resource; do
      echo "  Resource: $resource"
      # Pull specific attributes
      terraform state show "$resource" 2>/dev/null | \
        grep -E "^\s+(id|arn|name|instance_type|tags)" | \
        sed 's/^/    /'
      echo ""
    done
  fi
done

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1
```

```bash
# List all EC2 instances across workspaces
./detailed-resources.sh aws_instance

# List all RDS instances
./detailed-resources.sh aws_db_instance

# List all S3 buckets
./detailed-resources.sh aws_s3_bucket
```

## Using Python for More Complex Queries

For more sophisticated analysis, Python gives you better data manipulation:

```python
#!/usr/bin/env python3
"""
list_all_resources.py
Lists and analyzes Terraform resources across all workspaces.
"""

import subprocess
import json
from collections import defaultdict

def run_terraform(args):
    """Run a terraform command and return stdout."""
    result = subprocess.run(
        ["terraform"] + args,
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def get_workspaces():
    """Get list of all workspace names."""
    output = run_terraform(["workspace", "list"])
    workspaces = []
    for line in output.split("\n"):
        # Remove the * marker and whitespace
        ws = line.strip().lstrip("* ").strip()
        if ws:
            workspaces.append(ws)
    return workspaces

def get_resources(workspace):
    """Get all resources in a workspace."""
    run_terraform(["workspace", "select", workspace])
    output = run_terraform(["state", "list"])
    if not output:
        return []
    return output.split("\n")

def main():
    # Save current workspace
    original_ws = run_terraform(["workspace", "show"])

    inventory = {}
    type_summary = defaultdict(int)

    workspaces = get_workspaces()
    print(f"Found {len(workspaces)} workspaces\n")

    for ws in workspaces:
        resources = get_resources(ws)
        inventory[ws] = resources

        print(f"Workspace: {ws} - {len(resources)} resources")

        # Count by resource type
        for resource in resources:
            if resource:
                resource_type = resource.split(".")[0]
                type_summary[resource_type] += 1

    # Restore original workspace
    run_terraform(["workspace", "select", original_ws])

    # Print summary
    print("\n" + "=" * 50)
    print("Resource Type Summary (across all workspaces):")
    print("=" * 50)

    for rtype, count in sorted(type_summary.items(), key=lambda x: -x[1]):
        print(f"  {rtype}: {count}")

    total = sum(type_summary.values())
    print(f"\nTotal resources: {total}")

    # Save to JSON
    output = {
        "workspaces": inventory,
        "type_summary": dict(type_summary),
        "total_resources": total
    }

    with open("resource-inventory.json", "w") as f:
        json.dump(output, f, indent=2)

    print("\nFull inventory saved to resource-inventory.json")

if __name__ == "__main__":
    main()
```

## Cross-Workspace Resource Comparison

Compare resources between workspaces to find drift or missing resources:

```bash
#!/bin/bash
# compare-workspaces.sh
# Compares resource types between two workspaces
# Usage: ./compare-workspaces.sh dev prod

set -e

WS1=$1
WS2=$2
ORIGINAL_WS=$(terraform workspace show)

if [ -z "$WS1" ] || [ -z "$WS2" ]; then
  echo "Usage: $0 <workspace1> <workspace2>"
  exit 1
fi

# Get resource types for each workspace
terraform workspace select "$WS1" > /dev/null 2>&1
WS1_TYPES=$(terraform state list 2>/dev/null | cut -d'.' -f1 | sort -u)

terraform workspace select "$WS2" > /dev/null 2>&1
WS2_TYPES=$(terraform state list 2>/dev/null | cut -d'.' -f1 | sort -u)

echo "Resource Type Comparison: $WS1 vs $WS2"
echo "========================================="
echo ""

# Resources in WS1 but not in WS2
echo "In $WS1 only:"
comm -23 <(echo "$WS1_TYPES") <(echo "$WS2_TYPES") | sed 's/^/  /'

echo ""
echo "In $WS2 only:"
comm -13 <(echo "$WS1_TYPES") <(echo "$WS2_TYPES") | sed 's/^/  /'

echo ""
echo "In both:"
comm -12 <(echo "$WS1_TYPES") <(echo "$WS2_TYPES") | sed 's/^/  /'

terraform workspace select "$ORIGINAL_WS" > /dev/null 2>&1
```

## Scheduling Regular Audits

Set up a CI job to generate resource reports on a schedule:

```yaml
# .github/workflows/resource-audit.yml
name: Resource Audit

on:
  schedule:
    # Run every Monday at 9am
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Generate Inventory
        run: |
          chmod +x scripts/list-resources-json.sh
          ./scripts/list-resources-json.sh > inventory.json

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: resource-inventory
          path: inventory.json
```

## Performance Considerations

Switching workspaces and pulling state takes time, especially with remote backends. For large deployments:

- Cache the state locally when possible
- Run the inventory script during off-peak hours
- Consider using Terraform Cloud's API instead of CLI for faster access
- Parallelize workspace queries if your backend supports concurrent reads

## Summary

Listing resources across all Terraform workspaces requires iterating through each workspace and collecting state data. Whether you use a simple bash script for quick checks or a Python script for detailed analysis, the pattern is the same: save the current workspace, iterate through all workspaces, collect resource data, and restore the original workspace. Make this part of your regular operations to maintain visibility into your infrastructure. For more on workspace management, check out our post on [cleaning up unused workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-clean-up-unused-workspaces-in-terraform/view).
