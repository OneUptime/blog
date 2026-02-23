# How to Use Approval Tests with Terraform Plans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Approval Tests, Plan Review, Infrastructure as Code, DevOps

Description: Learn how to implement approval testing for Terraform plans where plan output is compared against pre-approved baselines, catching unexpected infrastructure changes.

---

Approval testing is a testing technique where you capture the output of an operation, manually review and approve it, and then use that approved output as the expected result for future test runs. For Terraform, this means capturing a plan, reviewing it, approving it, and then comparing all future plans against that approved baseline. Any deviation flags the change for review.

This differs from snapshot testing in one important way: snapshots are created automatically, but approved plans are explicitly reviewed and signed off by a human. The approval step adds a layer of intentionality that is valuable for critical infrastructure.

## How Approval Testing Works

The workflow is:

1. Generate a Terraform plan
2. Convert it to a human-readable format
3. Compare it against the last approved plan
4. If they match, the test passes
5. If they differ, the test fails and shows the diff
6. A human reviews the diff and either approves the new plan or fixes the issue

```
Developer changes code
    |
    v
Generate new plan ---> Compare to approved plan
    |                       |
    |                  Match? --> PASS
    |                       |
    |                  Differ? --> Show diff --> Human reviews
    |                                               |
    |                               Approve new plan / Fix code
    v
```

## Setting Up Approval Tests

Create a directory for approved plans and a script to manage them.

```bash
#!/bin/bash
# scripts/approval-test.sh
# Compare current Terraform plan against approved plan

set -e

MODULE_DIR="${1:-.}"
APPROVED_DIR="approved-plans"
MODULE_NAME=$(basename "$MODULE_DIR")
APPROVED_FILE="$APPROVED_DIR/${MODULE_NAME}.approved.txt"

mkdir -p "$APPROVED_DIR"

cd "$MODULE_DIR"

# Generate the current plan in human-readable format
terraform init -backend=false -input=false > /dev/null 2>&1
terraform plan -input=false -no-color > /tmp/current-plan.txt 2>&1

# Normalize the plan output
# Remove timestamps, IDs, and other volatile values
sed -E \
  -e 's/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.Z]+/TIMESTAMP/g' \
  -e 's/i-[a-f0-9]{17}/INSTANCE_ID/g' \
  -e 's/vpc-[a-f0-9]+/VPC_ID/g' \
  -e 's/subnet-[a-f0-9]+/SUBNET_ID/g' \
  -e 's/sg-[a-f0-9]+/SG_ID/g' \
  -e 's/arn:aws:[^"]+/ARN/g' \
  /tmp/current-plan.txt > /tmp/normalized-plan.txt

cd -

if [ ! -f "$APPROVED_FILE" ]; then
    echo "No approved plan exists for $MODULE_NAME"
    echo ""
    echo "Current plan:"
    cat /tmp/normalized-plan.txt
    echo ""
    echo "To approve this plan, run:"
    echo "  cp /tmp/normalized-plan.txt $APPROVED_FILE"
    exit 1
fi

# Compare against approved plan
if diff -u "$APPROVED_FILE" /tmp/normalized-plan.txt > /tmp/plan-diff.txt 2>&1; then
    echo "PASS: Plan matches approved baseline for $MODULE_NAME"
else
    echo "FAIL: Plan differs from approved baseline for $MODULE_NAME"
    echo ""
    echo "Differences:"
    cat /tmp/plan-diff.txt
    echo ""
    echo "If this change is intentional, review and approve:"
    echo "  cp /tmp/normalized-plan.txt $APPROVED_FILE"
    exit 1
fi
```

## Approval Testing with Go and Terratest

For a more structured approach, use Go with an approval testing library.

```go
// test/approval_test.go
package test

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "regexp"
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

const approvedDir = "approved-plans"

func TestApprovalNetworking(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "environment":        "dev",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    }

    // Get the plan as text
    planOutput := terraform.InitAndPlan(t, opts)

    // Normalize volatile values
    normalized := normalizePlan(planOutput)

    // Compare against approved plan
    approvedFile := filepath.Join(approvedDir, "networking.approved.txt")
    verifyApproval(t, approvedFile, normalized)
}

func TestApprovalCompute(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../modules/compute",
        Vars: map[string]interface{}{
            "name_prefix":   "approval-test",
            "instance_type": "t3.micro",
            "instance_count": 2,
        },
    }

    planOutput := terraform.InitAndPlan(t, opts)
    normalized := normalizePlan(planOutput)

    approvedFile := filepath.Join(approvedDir, "compute.approved.txt")
    verifyApproval(t, approvedFile, normalized)
}

// normalizePlan removes volatile values that change between runs
func normalizePlan(plan string) string {
    replacements := []struct {
        pattern     string
        replacement string
    }{
        {`i-[a-f0-9]{8,17}`, "INSTANCE_ID"},
        {`vpc-[a-f0-9]+`, "VPC_ID"},
        {`subnet-[a-f0-9]+`, "SUBNET_ID"},
        {`sg-[a-f0-9]+`, "SG_ID"},
        {`arn:aws:[^\s"]+`, "ARN"},
        {`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z`, "TIMESTAMP"},
        {`\(known after apply\)`, "COMPUTED"},
    }

    result := plan
    for _, r := range replacements {
        re := regexp.MustCompile(r.pattern)
        result = re.ReplaceAllString(result, r.replacement)
    }
    return result
}

// verifyApproval compares current plan against approved baseline
func verifyApproval(t *testing.T, approvedFile string, current string) {
    t.Helper()

    // Create approved directory if it doesn't exist
    os.MkdirAll(filepath.Dir(approvedFile), 0755)

    if _, err := os.Stat(approvedFile); os.IsNotExist(err) {
        // No approved plan exists - write current as received plan
        receivedFile := approvedFile + ".received"
        os.WriteFile(receivedFile, []byte(current), 0644)

        t.Fatalf("No approved plan exists at %s.\n"+
            "Review the received plan at %s\n"+
            "If it looks correct, approve it:\n"+
            "  mv %s %s",
            approvedFile, receivedFile, receivedFile, approvedFile)
        return
    }

    // Read approved plan
    approved, err := os.ReadFile(approvedFile)
    require.NoError(t, err)

    // Compare
    if string(approved) != current {
        // Write the received plan for easy diffing
        receivedFile := approvedFile + ".received"
        os.WriteFile(receivedFile, []byte(current), 0644)

        t.Errorf("Plan differs from approved baseline.\n"+
            "Approved: %s\n"+
            "Received: %s\n"+
            "To see the diff: diff %s %s\n"+
            "To approve the change: mv %s %s",
            approvedFile, receivedFile,
            approvedFile, receivedFile,
            receivedFile, approvedFile)
    }
}
```

## JSON-Based Approval Testing

For more precise comparisons, use the JSON plan output and compare specific sections.

```go
// test/approval_json_test.go
package test

import (
    "encoding/json"
    "os"
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/require"
)

// ApprovedPlan represents the relevant parts of a plan for approval
type ApprovedPlan struct {
    ResourceActions map[string][]string `json:"resource_actions"`
    OutputNames     []string            `json:"output_names"`
    ResourceCount   int                 `json:"resource_count"`
}

func TestApprovalJSON(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "environment":        "dev",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    }

    planJSON := terraform.InitAndPlanAndShow(t, opts)

    var fullPlan map[string]interface{}
    require.NoError(t, json.Unmarshal([]byte(planJSON), &fullPlan))

    // Extract the approval-relevant parts
    current := extractApprovalPlan(fullPlan)

    // Marshal for comparison
    currentJSON, err := json.MarshalIndent(current, "", "  ")
    require.NoError(t, err)

    approvedFile := "approved-plans/networking.approved.json"
    verifyApproval(t, approvedFile, string(currentJSON))
}

func extractApprovalPlan(plan map[string]interface{}) ApprovedPlan {
    approved := ApprovedPlan{
        ResourceActions: make(map[string][]string),
    }

    if changes, ok := plan["resource_changes"].([]interface{}); ok {
        approved.ResourceCount = len(changes)
        for _, c := range changes {
            change := c.(map[string]interface{})
            address := change["address"].(string)
            actions := change["change"].(map[string]interface{})["actions"].([]interface{})

            actionStrs := make([]string, len(actions))
            for i, a := range actions {
                actionStrs[i] = a.(string)
            }
            approved.ResourceActions[address] = actionStrs
        }
    }

    if outputs, ok := plan["output_changes"].(map[string]interface{}); ok {
        for name := range outputs {
            approved.OutputNames = append(approved.OutputNames, name)
        }
    }

    return approved
}
```

## CI Integration for Approval Tests

In CI, approval test failures should block the merge but provide a clear path to approval.

```yaml
# .github/workflows/approval-test.yml
name: Terraform Approval Tests

on:
  pull_request:
    paths:
      - 'modules/**'
      - 'approved-plans/**'

jobs:
  approval-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Run Approval Tests
        id: approval
        continue-on-error: true
        run: |
          for module in modules/*/; do
            MODULE_NAME=$(basename "$module")
            echo "Testing $MODULE_NAME..."
            ./scripts/approval-test.sh "$module"
          done

      - name: Comment on PR with approval instructions
        if: steps.approval.outcome == 'failure'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `**Approval Test Failed**

              The Terraform plan differs from the approved baseline. This is expected when making infrastructure changes.

              To approve the new plan:
              1. Review the plan diff in the workflow logs
              2. Run locally: \`./scripts/approval-test.sh modules/<module>\`
              3. If the changes look correct: \`cp /tmp/normalized-plan.txt approved-plans/<module>.approved.txt\`
              4. Commit and push the updated approved plan`
            })

      - name: Fail if not approved
        if: steps.approval.outcome == 'failure'
        run: exit 1
```

## When to Use Approval Tests

Approval tests work best for:

- **Critical infrastructure**: Production databases, networking, identity systems
- **Regulated environments**: Changes need explicit human sign-off
- **Shared modules**: Changes affect multiple teams
- **Compliance requirements**: Audit trail of approved changes

They are less useful for:
- Rapidly changing development environments
- Feature branches with frequent experimentation
- Modules with highly dynamic resource counts

## Approval Test vs Snapshot Test

| Aspect | Snapshot Test | Approval Test |
|--------|--------------|---------------|
| Initial baseline | Auto-generated | Human-reviewed |
| Update process | Overwrite snapshot | Review and approve |
| Audit trail | Git history | Explicit approval commits |
| Best for | Catching unintended changes | Requiring human sign-off |
| Speed | Fast (automated) | Slower (requires review) |

Both approaches complement each other. Use snapshots for broad change detection and approval tests for critical infrastructure changes that need human oversight.

Approval testing adds a formal review step to your infrastructure changes. It is not about slowing things down - it is about making sure every infrastructure change is intentional and reviewed. The first time it catches an unintended production change, the investment pays for itself.

For related testing approaches, see [How to Use Snapshot Testing for Terraform Plans](https://oneuptime.com/blog/post/2026-02-23-how-to-use-snapshot-testing-for-terraform-plans/view) and [How to Use Contract Tests for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-contract-tests-for-terraform-modules/view).
