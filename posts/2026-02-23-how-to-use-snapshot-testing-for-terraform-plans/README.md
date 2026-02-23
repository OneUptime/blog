# How to Use Snapshot Testing for Terraform Plans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Snapshot Testing, Plan, Infrastructure as Code

Description: Learn how to use snapshot testing with Terraform plans to detect unintended infrastructure changes and review plan differences over time.

---

Snapshot testing is a technique borrowed from software development where you capture the expected output of an operation, save it, and compare future runs against that saved snapshot. When applied to Terraform plans, snapshot testing catches unintended changes to your infrastructure before they happen. If a code change causes different resources to be created, modified, or destroyed, the snapshot test fails and forces you to review the difference.

## Why Snapshot Testing for Terraform?

Standard Terraform tests check specific conditions - "this output should equal X" or "this resource should have tag Y." Snapshot tests take a broader approach. They capture the entire plan and compare it against a known-good baseline. This catches changes you did not think to write specific tests for.

Common scenarios where snapshot tests catch problems:

- A provider upgrade changes default values
- A module update adds unexpected resources
- A variable change has wider impact than expected
- Terraform version differences alter plan behavior

## The Basic Approach

The workflow for snapshot testing is:

1. Generate a Terraform plan in JSON format
2. Save the relevant parts as a snapshot file
3. On subsequent runs, generate a new plan and compare it to the snapshot
4. If they differ, either update the snapshot (intentional change) or fix the code (unintentional change)

```bash
# Generate a plan and convert to JSON
terraform plan -out=tfplan
terraform show -json tfplan > plan.json
```

The JSON plan output contains everything: resource changes, output changes, configuration details. For snapshot testing, you typically want to focus on the resource changes.

## Building a Snapshot Testing Script

Here is a practical script that implements snapshot testing for Terraform plans:

```bash
#!/bin/bash
# scripts/snapshot-test.sh
# Compare current Terraform plan against a saved snapshot

set -e

SNAPSHOT_DIR="tests/snapshots"
MODULE_DIR="${1:-.}"
SNAPSHOT_FILE="${SNAPSHOT_DIR}/$(basename $MODULE_DIR)-plan.snapshot.json"

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Generate the current plan
cd "$MODULE_DIR"
terraform init -backend=false > /dev/null 2>&1
terraform plan -out=tfplan -input=false > /dev/null 2>&1
terraform show -json tfplan > /tmp/current-plan.json

# Extract just the resource changes (ignore timestamps and IDs)
# This makes snapshots stable across runs
jq '{
  resource_changes: [
    .resource_changes[] | {
      address: .address,
      type: .type,
      change: {
        actions: .change.actions,
        before: (.change.before // {} | del(.id, .arn, .tags_all)),
        after: (.change.after // {} | del(.id, .arn, .tags_all))
      }
    }
  ],
  output_changes: .output_changes
}' /tmp/current-plan.json > /tmp/current-snapshot.json

if [ ! -f "$SNAPSHOT_FILE" ]; then
    # No snapshot exists - create one
    echo "Creating initial snapshot: $SNAPSHOT_FILE"
    cp /tmp/current-snapshot.json "$SNAPSHOT_FILE"
    echo "Snapshot created. Review it and commit to version control."
    exit 0
fi

# Compare current plan with snapshot
if diff -q "$SNAPSHOT_FILE" /tmp/current-snapshot.json > /dev/null 2>&1; then
    echo "Snapshot test passed - plan matches snapshot."
else
    echo "SNAPSHOT MISMATCH - Plan differs from snapshot!"
    echo ""
    echo "Differences:"
    diff --color "$SNAPSHOT_FILE" /tmp/current-snapshot.json || true
    echo ""
    echo "If this change is intentional, update the snapshot:"
    echo "  cp /tmp/current-snapshot.json $SNAPSHOT_FILE"
    exit 1
fi

# Clean up
rm -f tfplan /tmp/current-plan.json /tmp/current-snapshot.json
```

## Snapshot Testing with Terratest

Terratest provides a more structured approach to snapshot testing in Go.

```go
// test/snapshot_test.go
package test

import (
    "encoding/json"
    "os"
    "path/filepath"
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// PlanSnapshot represents the relevant parts of a Terraform plan
type PlanSnapshot struct {
    ResourceChanges []ResourceChange `json:"resource_changes"`
    OutputChanges   map[string]interface{} `json:"output_changes"`
}

// ResourceChange represents a single resource change
type ResourceChange struct {
    Address string   `json:"address"`
    Type    string   `json:"type"`
    Actions []string `json:"actions"`
}

func TestPlanSnapshot(t *testing.T) {
    t.Parallel()

    snapshotFile := "snapshots/networking-plan.json"
    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "environment":        "dev",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    }

    // Generate plan JSON
    planJSON := terraform.InitAndPlanAndShow(t, opts)

    // Parse the plan into our snapshot structure
    var fullPlan map[string]interface{}
    require.NoError(t, json.Unmarshal([]byte(planJSON), &fullPlan))

    currentSnapshot := extractSnapshot(fullPlan)
    currentJSON, err := json.MarshalIndent(currentSnapshot, "", "  ")
    require.NoError(t, err)

    // Check if snapshot file exists
    if _, err := os.Stat(snapshotFile); os.IsNotExist(err) {
        // Create initial snapshot
        os.MkdirAll(filepath.Dir(snapshotFile), 0755)
        os.WriteFile(snapshotFile, currentJSON, 0644)
        t.Log("Created initial snapshot. Review and commit it.")
        return
    }

    // Read existing snapshot
    savedSnapshot, err := os.ReadFile(snapshotFile)
    require.NoError(t, err)

    // Compare snapshots
    assert.JSONEq(t, string(savedSnapshot), string(currentJSON),
        "Plan snapshot mismatch. If intentional, update snapshot file.")
}

// extractSnapshot pulls out the stable parts of a plan
func extractSnapshot(plan map[string]interface{}) PlanSnapshot {
    snapshot := PlanSnapshot{}

    if changes, ok := plan["resource_changes"].([]interface{}); ok {
        for _, c := range changes {
            change := c.(map[string]interface{})
            rc := ResourceChange{
                Address: change["address"].(string),
                Type:    change["type"].(string),
            }
            if ch, ok := change["change"].(map[string]interface{}); ok {
                if actions, ok := ch["actions"].([]interface{}); ok {
                    for _, a := range actions {
                        rc.Actions = append(rc.Actions, a.(string))
                    }
                }
            }
            snapshot.ResourceChanges = append(snapshot.ResourceChanges, rc)
        }
    }

    return snapshot
}
```

## Using the Native Test Framework for Snapshot-Like Tests

While Terraform's native test framework does not have built-in snapshot support, you can approximate it by asserting on the number and types of resources in a plan.

```hcl
# tests/snapshot.tftest.hcl

variables {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

# Verify the plan creates the expected number of resources
run "resource_count_check" {
  command = plan

  # If someone adds or removes resources, this fails
  # Acts as a lightweight snapshot - you know the resource footprint
  assert {
    condition     = length(plan.resource_changes) == 7
    error_message = "Expected 7 resource changes in plan, got ${length(plan.resource_changes)}"
  }
}

# Verify specific resources are in the plan
run "expected_resources_present" {
  command = plan

  assert {
    condition     = contains([for rc in plan.resource_changes : rc.type], "aws_vpc")
    error_message = "Plan should include an aws_vpc resource"
  }

  assert {
    condition     = contains([for rc in plan.resource_changes : rc.type], "aws_subnet")
    error_message = "Plan should include aws_subnet resources"
  }

  assert {
    condition     = length([for rc in plan.resource_changes : rc if rc.type == "aws_subnet"]) == 4
    error_message = "Plan should create exactly 4 subnets (2 public, 2 private)"
  }
}
```

## What to Include in Snapshots

Not everything in a Terraform plan is suitable for snapshot testing. Some values change every run (timestamps, random IDs, ARNs). Filter these out.

Good candidates for snapshots:
- Resource types and addresses
- Resource actions (create, update, destroy)
- Configuration values you set explicitly
- Output names and basic structure
- Resource count per type

Bad candidates:
- Resource IDs (generated by cloud provider)
- ARNs (contain account IDs)
- Timestamps
- Random values
- Provider-computed defaults that might change between versions

```python
# scripts/normalize_plan.py
# Python script to normalize a plan for snapshot comparison

import json
import sys

# Fields to remove from resource attributes
VOLATILE_FIELDS = [
    'id', 'arn', 'tags_all', 'unique_id',
    'create_date', 'last_modified_date'
]

def normalize_plan(plan_data):
    """Remove volatile fields that change between runs."""
    normalized = {
        'resource_changes': [],
        'output_changes': {}
    }

    for change in plan_data.get('resource_changes', []):
        normalized_change = {
            'address': change['address'],
            'type': change['type'],
            'actions': change['change']['actions'],
        }

        # Include 'after' values but strip volatile fields
        after = change['change'].get('after', {}) or {}
        for field in VOLATILE_FIELDS:
            after.pop(field, None)
        normalized_change['after_known'] = after

        normalized['resource_changes'].append(normalized_change)

    # Sort for consistent ordering
    normalized['resource_changes'].sort(key=lambda x: x['address'])

    return normalized

if __name__ == '__main__':
    plan = json.load(sys.stdin)
    print(json.dumps(normalize_plan(plan), indent=2, sort_keys=True))
```

## CI Integration

Add snapshot tests to your CI pipeline with an update mechanism:

```yaml
# .github/workflows/snapshot-test.yml
name: Terraform Snapshot Tests

on:
  pull_request:
    paths:
      - 'modules/**'
      - 'tests/snapshots/**'

jobs:
  snapshot-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Run snapshot tests
        run: ./scripts/snapshot-test.sh modules/networking

      - name: Upload snapshot diff on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: snapshot-diff
          path: /tmp/current-snapshot.json
```

When the snapshot test fails in CI, the developer reviews the diff, confirms the changes are intentional, updates the snapshot, and includes it in their PR. The updated snapshot becomes part of the code review, giving reviewers visibility into exactly what infrastructure changes the PR introduces.

Snapshot testing complements other Terraform testing approaches. It is not a replacement for targeted assertions, but it catches the changes you did not think to test for. Start with your most critical modules and expand from there.

For related approaches, see [How to Use Approval Tests with Terraform Plans](https://oneuptime.com/blog/post/2026-02-23-how-to-use-approval-tests-with-terraform-plans/view) and [How to Use Contract Tests for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-contract-tests-for-terraform-modules/view).
