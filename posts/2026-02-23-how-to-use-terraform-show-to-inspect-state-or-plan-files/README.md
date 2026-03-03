# How to Use terraform show to Inspect State or Plan Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, CLI, State Management

Description: Learn how to use the terraform show command to inspect your Terraform state files and saved plan files, with practical examples for debugging and auditing infrastructure.

---

If you have ever run `terraform apply` and wondered what exactly Terraform thinks your infrastructure looks like right now, `terraform show` is the command you need. It gives you a human-readable dump of your current state or a saved plan file, which is incredibly useful for debugging, auditing, and understanding what Terraform is about to do.

In this post, we will walk through everything you need to know about `terraform show` - from basic usage to advanced patterns with JSON output.

## What Does terraform show Do?

The `terraform show` command reads a Terraform state file or a saved plan file and outputs the contents in a readable format. By default, it reads the current state from your working directory. If you pass a file path, it reads that specific state or plan file instead.

Here is the basic syntax:

```bash
# Show the current state
terraform show

# Show a saved plan file
terraform show tfplan

# Show state in JSON format
terraform show -json

# Show a plan file in JSON format
terraform show -json tfplan
```

The distinction between state and plan is important. The state file represents what Terraform believes currently exists in your infrastructure. A plan file represents what Terraform intends to change on the next apply.

## Inspecting Current State

When you run `terraform show` with no arguments, Terraform reads the `terraform.tfstate` file in your working directory (or from your configured backend) and prints out every resource it tracks.

```bash
# Run terraform show to see your current state
terraform show
```

The output looks something like this:

```text
# aws_instance.web:
resource "aws_instance" "web" {
    ami                          = "ami-0c55b159cbfafe1f0"
    arn                          = "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456"
    associate_public_ip_address  = true
    availability_zone            = "us-east-1a"
    id                           = "i-0abc123def456"
    instance_state               = "running"
    instance_type                = "t3.micro"
    tags                         = {
        "Name" = "web-server"
    }
    # ... more attributes
}

# aws_s3_bucket.logs:
resource "aws_s3_bucket" "logs" {
    arn           = "arn:aws:s3:::my-app-logs-bucket"
    bucket        = "my-app-logs-bucket"
    id            = "my-app-logs-bucket"
    region        = "us-east-1"
    # ... more attributes
}
```

Each resource block shows the resource type, name, and every attribute Terraform tracks. This is the ground truth of what Terraform thinks exists.

## Inspecting a Saved Plan File

Before you can show a plan, you need to save one. Use the `-out` flag with `terraform plan`:

```bash
# Save a plan to a file called tfplan
terraform plan -out=tfplan
```

Now you can inspect that plan:

```bash
# Show what the saved plan will do
terraform show tfplan
```

The output shows you the planned changes with the familiar `+`, `-`, and `~` markers:

```text
Terraform will perform the following actions:

  # aws_instance.web will be updated in-place
  ~ resource "aws_instance" "web" {
        id            = "i-0abc123def456"
      ~ instance_type = "t3.micro" -> "t3.small"
        tags          = {
            "Name" = "web-server"
        }
        # (15 unchanged attributes hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

This is especially useful when you want to review a plan that was generated hours or days ago, or when a colleague saved a plan for you to review before applying.

## Using JSON Output for Automation

The `-json` flag is where `terraform show` becomes truly powerful for automation. Instead of the human-readable format, you get structured JSON that you can parse with tools like `jq`.

```bash
# Get the current state as JSON
terraform show -json > state.json

# Get a plan as JSON
terraform show -json tfplan > plan.json
```

### Parsing State with jq

Here are some practical examples of extracting information from the JSON output:

```bash
# List all resource addresses in the state
terraform show -json | jq -r '.values.root_module.resources[].address'

# Get the instance ID of a specific resource
terraform show -json | jq -r '
  .values.root_module.resources[]
  | select(.address == "aws_instance.web")
  | .values.id
'

# List all resources of a specific type
terraform show -json | jq -r '
  .values.root_module.resources[]
  | select(.type == "aws_s3_bucket")
  | .address
'

# Count resources by type
terraform show -json | jq '
  [.values.root_module.resources[].type]
  | group_by(.)
  | map({type: .[0], count: length})
'
```

### Parsing Plans with jq

Plan JSON has a different structure. The key field is `resource_changes`:

```bash
# List all resources that will be changed
terraform show -json tfplan | jq -r '
  .resource_changes[]
  | select(.change.actions != ["no-op"])
  | "\(.address): \(.change.actions | join(", "))"
'

# Show only resources being destroyed
terraform show -json tfplan | jq -r '
  .resource_changes[]
  | select(.change.actions | index("delete"))
  | .address
'

# Get the before and after values for changed resources
terraform show -json tfplan | jq '
  .resource_changes[]
  | select(.change.actions | index("update"))
  | {address, before: .change.before, after: .change.after}
'
```

## Practical Use Cases

### 1. Pre-Apply Review in CI/CD

In a CI/CD pipeline, you might generate a plan in one step and apply it in another. The show command lets you add a review step:

```bash
#!/bin/bash
# ci-terraform.sh - CI/CD pipeline script

# Step 1: Generate the plan
terraform plan -out=tfplan

# Step 2: Check for destructive changes
DESTROYS=$(terraform show -json tfplan | jq '
  [.resource_changes[]
   | select(.change.actions | index("delete"))]
  | length
')

if [ "$DESTROYS" -gt 0 ]; then
  echo "WARNING: Plan includes $DESTROYS resource deletions!"
  # Show which resources will be destroyed
  terraform show -json tfplan | jq -r '
    .resource_changes[]
    | select(.change.actions | index("delete"))
    | "  DESTROY: \(.address)"
  '
  # Require manual approval for destructive changes
  exit 1
fi

# Step 3: Apply the plan
terraform apply tfplan
```

### 2. Auditing Infrastructure State

You can use `terraform show -json` to generate inventory reports:

```bash
#!/bin/bash
# audit-resources.sh - Generate an infrastructure audit report

echo "=== Infrastructure Audit Report ==="
echo "Generated: $(date)"
echo ""

# Total resource count
TOTAL=$(terraform show -json | jq '.values.root_module.resources | length')
echo "Total managed resources: $TOTAL"
echo ""

# Resources by type
echo "Resources by type:"
terraform show -json | jq -r '
  [.values.root_module.resources[].type]
  | group_by(.)
  | map("  \(.[0]): \(length)")
  | .[]
'

# Resources by provider
echo ""
echo "Resources by provider:"
terraform show -json | jq -r '
  [.values.root_module.resources[].provider_name]
  | group_by(.)
  | map("  \(.[0]): \(length)")
  | .[]
'
```

### 3. Comparing State Across Environments

```bash
#!/bin/bash
# compare-envs.sh - Compare resources between staging and production

# Capture resource lists from each environment
cd /infra/staging
terraform show -json | jq -r '.values.root_module.resources[].type' | sort | uniq -c > /tmp/staging-resources.txt

cd /infra/production
terraform show -json | jq -r '.values.root_module.resources[].type' | sort | uniq -c > /tmp/prod-resources.txt

# Compare them
echo "Differences between staging and production:"
diff /tmp/staging-resources.txt /tmp/prod-resources.txt
```

## Dealing with Sensitive Values

Terraform marks certain values as sensitive, and `terraform show` respects that by default:

```text
# aws_db_instance.main:
resource "aws_db_instance" "main" {
    password = (sensitive value)
    username = "admin"
    # ...
}
```

If you need to see sensitive values (be careful with this in shared environments), you can use the JSON output and pipe through jq. The JSON output includes sensitive values but marks them with a `sensitive` field in the metadata.

```bash
# The JSON output still includes sensitive values
# Be careful not to log this in CI/CD
terraform show -json | jq '.values.root_module.resources[] | select(.sensitive_values | length > 0)'
```

## Common Issues and Tips

**State file not found**: If you see "No state file found," make sure you are in the correct directory or that your backend is configured properly.

```bash
# Check if state exists
terraform state list

# If using a remote backend, make sure you have initialized
terraform init
```

**Plan file expired**: Saved plan files can become stale if the state changes between plan and show. Terraform will warn you about this:

```bash
# If the state has changed since the plan was created,
# generate a fresh plan
terraform plan -out=tfplan
terraform show tfplan
```

**Large state files**: For very large state files, the output can be overwhelming. Use JSON output with jq to filter what you need:

```bash
# Only show resources in a specific module
terraform show -json | jq '.values.root_module.child_modules[] | select(.address == "module.networking")'
```

## Summary

The `terraform show` command is a straightforward but essential tool in your Terraform workflow. Use it to inspect current state, review saved plans before applying, and build automation around your infrastructure management. The JSON output mode is particularly valuable for CI/CD pipelines and audit scripts where you need to programmatically analyze what Terraform is managing.

Get into the habit of running `terraform show` before any significant apply, especially in production environments. It is a simple step that can prevent costly mistakes.
