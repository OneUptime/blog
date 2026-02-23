# How to Test Terraform Plans Before Applying

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Infrastructure as Code, DevOps, CI/CD

Description: Learn how to validate and test Terraform plans before applying them to catch errors, review changes, and prevent costly infrastructure mistakes.

---

Running `terraform apply` without reviewing what it will actually do is like deploying application code without reading the diff. Terraform gives you several tools to inspect, validate, and test your plans before making any real changes. This guide covers the full workflow for testing Terraform plans so you can catch issues early.

## Why Test Plans Before Applying

A Terraform plan shows you what resources will be created, modified, or destroyed. But simply looking at the plan output is not enough for production workflows. You need automated checks that can:

- Verify that no resources are being unexpectedly destroyed
- Confirm that the number of changes matches expectations
- Check that sensitive values are not being exposed
- Validate that resource configurations match your policies
- Ensure the plan succeeds without errors in the first place

Testing plans before applying is the cheapest form of infrastructure validation. It does not create real resources, costs nothing, and runs fast.

## Step 1 - Validate Configuration Syntax

Before generating a plan, make sure your configuration is syntactically valid:

```bash
# Initialize the working directory
terraform init

# Check formatting - returns non-zero if files need formatting
terraform fmt -check -recursive

# Validate configuration syntax and internal consistency
terraform validate
```

The `validate` command checks that your configuration is internally consistent. It catches things like references to undeclared variables, invalid resource arguments, and type mismatches. But it does not talk to any provider APIs, so it will not catch things like invalid AMI IDs or instance types.

## Step 2 - Generate a Plan File

Always save your plan to a file. This gives you a stable artifact to inspect, and it ensures that `terraform apply` executes exactly the changes you reviewed:

```bash
# Generate a plan and save it to a file
terraform plan -out=tfplan

# You can also generate a plan for a specific variable file
terraform plan -var-file=production.tfvars -out=tfplan
```

The saved plan file is a binary format. To inspect it as JSON for automated processing:

```bash
# Convert the plan to JSON for programmatic inspection
terraform show -json tfplan > tfplan.json
```

## Step 3 - Inspect the Plan with terraform show

The `terraform show` command renders a human-readable summary of the plan:

```bash
# Display the plan in human-readable format
terraform show tfplan
```

This output shows you the full details of every resource change, including attribute values. For large plans, you can filter the JSON output:

```bash
# Count the number of resources being created
terraform show -json tfplan | jq '.resource_changes | map(select(.change.actions[] == "create")) | length'

# Count the number of resources being destroyed
terraform show -json tfplan | jq '.resource_changes | map(select(.change.actions[] == "delete")) | length'

# List all resources being modified
terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions[] == "update") | .address'
```

## Step 4 - Use Plan JSON for Automated Assertions

You can write scripts that parse the plan JSON and enforce policies. Here is a simple bash script that fails if any resources are being destroyed:

```bash
#!/bin/bash
# check-no-destroys.sh
# Fails if the plan includes any resource deletions

PLAN_FILE="${1:-tfplan}"

# Convert plan to JSON
terraform show -json "$PLAN_FILE" > /tmp/plan.json

# Count deletions
DESTROY_COUNT=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' /tmp/plan.json)

if [ "$DESTROY_COUNT" -gt 0 ]; then
  echo "ERROR: Plan includes $DESTROY_COUNT resource deletion(s)"
  jq '.resource_changes[] | select(.change.actions[] == "delete") | .address' /tmp/plan.json
  exit 1
fi

echo "OK: No resource deletions in plan"
```

You can also use Python for more sophisticated checks:

```python
# check_plan.py
# Validates a Terraform plan JSON file against custom rules

import json
import sys

def load_plan(path):
    with open(path) as f:
        return json.load(f)

def check_no_public_s3_buckets(plan):
    """Ensure no S3 buckets are created with public access."""
    issues = []
    for change in plan.get("resource_changes", []):
        if change["type"] == "aws_s3_bucket" and "create" in change["change"]["actions"]:
            after = change["change"].get("after", {})
            # Check for public ACL settings
            acl = after.get("acl", "private")
            if acl in ("public-read", "public-read-write"):
                issues.append(f"{change['address']} has public ACL: {acl}")
    return issues

def check_resource_tags(plan):
    """Ensure all resources have required tags."""
    required_tags = ["Environment", "Team", "ManagedBy"]
    issues = []
    for change in plan.get("resource_changes", []):
        if "create" in change["change"]["actions"]:
            after = change["change"].get("after", {})
            tags = after.get("tags", {}) or {}
            missing = [t for t in required_tags if t not in tags]
            if missing:
                issues.append(f"{change['address']} missing tags: {', '.join(missing)}")
    return issues

if __name__ == "__main__":
    plan = load_plan(sys.argv[1])

    all_issues = []
    all_issues.extend(check_no_public_s3_buckets(plan))
    all_issues.extend(check_resource_tags(plan))

    if all_issues:
        print("Plan validation failed:")
        for issue in all_issues:
            print(f"  - {issue}")
        sys.exit(1)

    print("Plan validation passed")
```

## Step 5 - Use Open Policy Agent (OPA) for Policy Checks

For more structured policy testing, you can use OPA with the plan JSON. Write Rego policies that define what is and is not allowed:

```rego
# policy/terraform.rego
# Deny plans that destroy more than 5 resources at once

package terraform

import input as plan

# Collect all resource deletions
deletions[resource] {
    resource := plan.resource_changes[_]
    resource.change.actions[_] == "delete"
}

# Deny if too many deletions
deny[msg] {
    count(deletions) > 5
    msg := sprintf("Plan would destroy %d resources, which exceeds the limit of 5", [count(deletions)])
}

# Deny if any security group allows 0.0.0.0/0 ingress
deny[msg] {
    resource := plan.resource_changes[_]
    resource.type == "aws_security_group_rule"
    resource.change.after.type == "ingress"
    resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
    msg := sprintf("%s allows ingress from 0.0.0.0/0", [resource.address])
}
```

Run the policy check:

```bash
# Evaluate the plan against OPA policies
opa eval --input tfplan.json --data policy/ "data.terraform.deny" --format pretty
```

## Step 6 - Integrate Plan Testing into CI/CD

In a CI pipeline, you want the plan to run automatically on every pull request. Here is a GitHub Actions example:

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'infrastructure/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init

      - name: Terraform Validate
        working-directory: infrastructure
        run: terraform validate

      - name: Terraform Plan
        working-directory: infrastructure
        run: |
          # Generate plan and save as JSON
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      - name: Check for Destructive Changes
        working-directory: infrastructure
        run: |
          DESTROYS=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' tfplan.json)
          if [ "$DESTROYS" -gt 0 ]; then
            echo "::warning::Plan includes $DESTROYS resource deletion(s)"
          fi

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('infrastructure/tfplan.json', 'utf8');
            const parsed = JSON.parse(plan);
            const changes = parsed.resource_changes || [];
            const creates = changes.filter(c => c.change.actions.includes('create')).length;
            const updates = changes.filter(c => c.change.actions.includes('update')).length;
            const deletes = changes.filter(c => c.change.actions.includes('delete')).length;

            const body = `## Terraform Plan Summary\n\n` +
              `| Action | Count |\n|--------|-------|\n` +
              `| Create | ${creates} |\n` +
              `| Update | ${updates} |\n` +
              `| Delete | ${deletes} |\n`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

## Step 7 - Test with Different Variable Combinations

Your Terraform configuration might behave differently depending on variable values. Test plans with multiple variable files:

```bash
#!/bin/bash
# test-plans.sh
# Run terraform plan with multiple variable files to verify all environments

ENVS=("dev" "staging" "production")

for env in "${ENVS[@]}"; do
  echo "Testing plan for: $env"

  terraform plan \
    -var-file="environments/${env}.tfvars" \
    -out="tfplan-${env}" \
    -detailed-exitcode

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 1 ]; then
    echo "FAIL: Plan for $env has errors"
    exit 1
  fi

  echo "PASS: Plan for $env succeeded"
done
```

## Common Pitfalls

There are a few things to watch out for when testing plans:

- State file freshness matters. If your state is out of date, the plan will show changes that have already been applied. Always run `terraform refresh` or use a remote backend with locking.
- Provider credentials are required even for planning. The plan phase calls provider APIs to read current state and validate configurations.
- Plan files are tied to a specific state. Do not generate a plan on Monday and apply it on Friday - the infrastructure may have changed.
- Some values are only known after apply. The plan will show `(known after apply)` for computed attributes, which limits what you can validate.

## Wrapping Up

Testing Terraform plans before applying is a low-effort, high-value practice. Start with `terraform validate` and `terraform plan -out`, then graduate to JSON-based policy checks as your infrastructure grows. The plan JSON format gives you a structured way to write assertions that can run in CI and block unsafe changes before they reach production.

For more on Terraform testing strategies, check out [How to Write Unit Tests for Terraform with the Built-in Test Framework](https://oneuptime.com/blog/post/2026-02-23-how-to-write-unit-tests-for-terraform-with-the-built-in-test-framework/view) and [How to Use terraform plan -detailed-exitcode for CI Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-plan-detailed-exitcode-for-ci-testing/view).
