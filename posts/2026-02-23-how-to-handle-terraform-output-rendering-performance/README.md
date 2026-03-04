# How to Handle Terraform Output Rendering Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Outputs, Performance, CLI, Optimization

Description: Reduce time spent on Terraform output rendering by controlling plan display, managing large outputs, and optimizing CLI performance.

---

Terraform's plan and apply output is designed to be human-readable, but for large infrastructure changes, rendering that output can itself become a performance issue. I have seen plans where the actual planning took 2 minutes, but rendering the output to the terminal took another 30 seconds. In CI/CD pipelines, large outputs can also cause memory issues and slow down log processing.

This post covers how to manage output rendering for better performance.

## Understanding Output Rendering

When Terraform runs a plan or apply, it generates a structured internal representation of changes. It then renders this to text for display. The rendering includes:

- Resource addresses and types
- Attribute changes (old value to new value)
- Computed values marked as "(known after apply)"
- Color coding (in interactive terminals)
- Summary statistics

For a plan that touches 500 resources, the rendered output can be tens of thousands of lines. Each line requires string formatting, and in some cases, diffing large text blocks (like policy documents).

## Using -no-color to Speed Up Rendering

ANSI color codes add overhead to output processing, especially when piped through tools:

```bash
# Without color (faster, cleaner for CI/CD)
terraform plan -no-color

# With color (default in interactive terminals)
terraform plan
```

The time savings from `-no-color` are small (usually under a second), but in CI/CD where output is captured and processed, it can make a noticeable difference.

## Suppressing Output for Speed

If you do not need the full plan output (for example, you just want the exit code to check if there are changes):

```bash
# Redirect output, keep only the summary
terraform plan -detailed-exitcode > /dev/null 2>&1
exit_code=$?

case $exit_code in
  0) echo "No changes" ;;
  1) echo "Error" ;;
  2) echo "Changes detected" ;;
esac
```

This skips the terminal rendering entirely. The plan still runs and takes the same time, but you save the output rendering time.

## Saving Plans to Files

Using plan files avoids rendering twice (once during plan, once during apply):

```bash
# Generate plan file (no rendering needed)
terraform plan -out=plan.tfplan

# View the plan separately if needed
terraform show plan.tfplan

# Apply without re-planning
terraform apply plan.tfplan
```

When using `terraform apply plan.tfplan`, Terraform does not re-render the plan. It just applies the saved changes.

## Managing Large Outputs in CI/CD

### Truncating Plan Output

GitHub Actions, GitLab CI, and other platforms have limits on log size and PR comment size. Truncate large plans:

```bash
#!/bin/bash
# truncated-plan.sh

# Capture plan output
terraform plan -no-color > plan_output.txt 2>&1
plan_exit=$?

# Get line count
lines=$(wc -l < plan_output.txt)

if [ "$lines" -gt 500 ]; then
  echo "Plan output is $lines lines. Showing summary only."
  echo ""
  echo "First 50 lines:"
  head -50 plan_output.txt
  echo ""
  echo "... ($((lines - 100)) lines omitted) ..."
  echo ""
  echo "Last 50 lines:"
  tail -50 plan_output.txt
else
  cat plan_output.txt
fi

exit $plan_exit
```

### Posting Plan Summaries to PRs

Instead of posting the full plan, extract just the summary:

```bash
# Extract just the plan summary
terraform plan -no-color 2>&1 | tail -20 > plan_summary.txt

# Post to PR as a comment
gh pr comment $PR_NUMBER --body "$(cat plan_summary.txt)"
```

## Reducing Output Volume

### Use -compact-warnings

Terraform can print many warnings about deprecated features or upcoming changes. Compact them:

```bash
terraform plan -compact-warnings
```

This collapses multiple similar warnings into a single line, reducing output volume.

### Minimize Outputs Block

Every `output` block in your configuration is evaluated and displayed during apply. If you have many outputs, this adds rendering time:

```hcl
# Too many outputs slow down the final display
output "vpc_id" { value = aws_vpc.main.id }
output "subnet_a_id" { value = aws_subnet.a.id }
output "subnet_b_id" { value = aws_subnet.b.id }
output "subnet_c_id" { value = aws_subnet.c.id }
# ... 50 more outputs
```

Only output values that other projects or users actually need:

```hcl
# Consolidated output - fewer items to render
output "networking" {
  value = {
    vpc_id     = aws_vpc.main.id
    subnet_ids = aws_subnet.private[*].id
  }
}
```

## JSON Output for Programmatic Use

JSON output skips human-readable formatting and is faster to generate:

```bash
# JSON plan output
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json

# Parse specific information
cat plan.json | jq '.resource_changes | length'
cat plan.json | jq '[.resource_changes[] | select(.change.actions != ["no-op"])] | length'
```

JSON is also easier to process in CI/CD pipelines than parsing text output.

## Handling Sensitive Output

Sensitive values are masked in output, but Terraform still processes them. If you have many sensitive outputs, the masking adds overhead:

```hcl
output "database_password" {
  value     = random_password.db.result
  sensitive = true  # Masked in output, but still evaluated
}
```

Consider whether sensitive outputs are actually needed. If no one reads them from Terraform output, remove them.

## Optimizing terraform show

`terraform show` renders the full state or plan in human-readable format. For large states, this can be very slow:

```bash
# Slow: Rendering the entire state
terraform show

# Faster: Query specific resources
terraform state show aws_instance.web

# Fastest: Use JSON output and filter
terraform show -json | jq '.values.root_module.resources[] | select(.address == "aws_instance.web")'
```

## Output Performance in Large for_each

Resources created with `for_each` that have many instances generate large output blocks:

```text
# aws_route53_record.records["api.example.com"] will be created
# aws_route53_record.records["web.example.com"] will be created
# aws_route53_record.records["mail.example.com"] will be created
# ... 200 more records
```

There is no way to suppress individual resource output in a plan. The best approach is to use plan files and only view the output when needed:

```bash
# Generate plan without viewing
terraform plan -out=plan.tfplan > /dev/null 2>&1

# Check if there are changes
terraform show -json plan.tfplan | jq '[.resource_changes[] | select(.change.actions != ["no-op"])] | length'

# Only render full output if changes exist
changes=$(terraform show -json plan.tfplan | jq '[.resource_changes[] | select(.change.actions != ["no-op"])] | length')
if [ "$changes" -gt 0 ]; then
  echo "$changes resources will change:"
  terraform show plan.tfplan
fi
```

## Dealing with Large Attribute Diffs

Some resources have large attribute values that create huge diffs. For example, updating an IAM policy with a long JSON document:

```text
# aws_iam_policy.app will be updated in-place
~ resource "aws_iam_policy" "app" {
    ~ policy = jsonencode(
        ~ {
            ~ Statement = [
                ~ {
                    ... (hundreds of lines of JSON diff)
                  }
              ]
          }
      )
  }
```

To avoid this, structure policies as separate resources so each diff is smaller:

```hcl
# Each policy document is a separate resource with a smaller diff
resource "aws_iam_policy" "s3_access" {
  name   = "s3-access"
  policy = data.aws_iam_policy_document.s3_access.json
}

resource "aws_iam_policy" "dynamodb_access" {
  name   = "dynamodb-access"
  policy = data.aws_iam_policy_document.dynamodb_access.json
}
```

## Summary

Output rendering is an often-overlooked aspect of Terraform performance. For large infrastructure, the techniques that help most are: use `-no-color` in CI/CD, save plans to files instead of rendering twice, truncate output for PR comments, use JSON output for programmatic processing, and minimize the number of output blocks. These changes make your Terraform workflows faster and your CI/CD logs more manageable.

For monitoring the infrastructure behind your Terraform outputs, [OneUptime](https://oneuptime.com) provides comprehensive observability and alerting across your entire cloud stack.
