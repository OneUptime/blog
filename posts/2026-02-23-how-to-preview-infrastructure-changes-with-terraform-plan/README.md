# How to Preview Infrastructure Changes with terraform plan

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform plan, Infrastructure as Code, DevOps, Planning

Description: Master the terraform plan command to preview infrastructure changes before applying them, including output interpretation, saved plans, and advanced targeting.

---

`terraform plan` is your safety net. Before Terraform touches any real infrastructure, it shows you exactly what it intends to do. Will it create a new server? Modify a security group? Destroy a database? The plan tells you all of this before anything happens. Learning to read and work with plans effectively is one of the most important Terraform skills.

## Basic Usage

```bash
# Preview what Terraform will do
terraform plan
```

This compares your `.tf` files (desired state) against the state file and actual cloud resources (current state), then outputs a detailed list of changes.

## How terraform plan Works

When you run `terraform plan`, Terraform goes through these steps:

1. **Reads configuration** - Parses all `.tf` files in the current directory
2. **Reads state** - Loads the terraform.tfstate file (local or remote)
3. **Refreshes** - Queries the cloud provider to get the actual current state of each resource
4. **Computes diff** - Compares desired state (config) against actual state (refreshed)
5. **Produces plan** - Lists all create, update, destroy, and no-change actions

The refresh step is important. Even if nobody changed the state file, someone might have manually modified a resource through the cloud console. Terraform detects that drift during refresh.

## Reading Plan Output

The plan output uses a set of symbols and conventions that you need to know:

### Create (+)

```text
  # aws_instance.web will be created
  + resource "aws_instance" "web" {
      + ami                          = "ami-0c55b159cbfafe1f0"
      + arn                          = (known after apply)
      + instance_type                = "t3.micro"
      + id                           = (known after apply)
      + public_ip                    = (known after apply)
    }
```

The `+` prefix means this resource will be created. Attributes marked `(known after apply)` are computed by the cloud provider - Terraform cannot know them until the resource actually exists.

### Update in Place (~)

```text
  # aws_instance.web will be updated in-place
  ~ resource "aws_instance" "web" {
        id            = "i-abc123"
      ~ tags          = {
          ~ "Name" = "old-name" -> "new-name"
        }
    }
```

The `~` prefix means the resource will be modified without being destroyed. The `->` arrow shows old value to new value.

### Destroy (-)

```text
  # aws_instance.old_server will be destroyed
  # (because aws_instance.old_server is not in configuration)
  - resource "aws_instance" "old_server" {
      - ami           = "ami-abc123" -> null
      - instance_type = "t3.micro" -> null
    }
```

The `-` prefix means the resource will be deleted. The `-> null` indicates the attribute will cease to exist.

### Replace (-/+)

```text
  # aws_instance.web must be replaced
  -/+ resource "aws_instance" "web" {
      ~ ami           = "ami-old" -> "ami-new" # forces replacement
      ~ id            = "i-abc123" -> (known after apply)
        instance_type = "t3.micro"
    }
```

The `-/+` means Terraform must destroy and recreate the resource. This usually happens when you change an attribute that cannot be updated in place (like an AMI ID for an EC2 instance). Watch for these carefully because replacing resources can cause downtime.

### No Changes

When nothing needs to change:

```text
No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration
and found no differences, so no changes are needed.
```

## The Plan Summary

At the bottom of every plan, you get a summary:

```text
Plan: 3 to add, 1 to change, 2 to destroy.
```

This quick summary tells you the scale of changes. If you expected to add one resource and the plan says "5 to destroy", stop and investigate.

## Saving Plans

You can save the plan output to a binary file and apply it later. This guarantees that exactly what you reviewed is what gets executed:

```bash
# Save the plan to a file
terraform plan -out=tfplan

# Review (if needed)
terraform show tfplan

# Apply the exact plan you reviewed
terraform apply tfplan
```

The saved plan file is a binary format - you cannot read it directly, but `terraform show` displays its contents.

### Why Save Plans?

In a team environment or CI/CD pipeline, time passes between when someone reviews the plan and when it gets applied. During that time, someone else might change the infrastructure. A saved plan captures a snapshot, and `terraform apply tfplan` will fail if the state has changed since the plan was created. This prevents applying stale plans.

## Useful Flags

### -target (Plan Specific Resources)

```bash
# Plan only for a specific resource
terraform plan -target=aws_instance.web

# Plan for a specific module
terraform plan -target=module.vpc
```

Use `-target` sparingly. It skips dependency analysis for resources outside the target, which can miss important changes.

### -var (Pass Variable Values)

```bash
# Pass a variable value
terraform plan -var="instance_type=t3.large"

# Pass multiple variables
terraform plan -var="instance_type=t3.large" -var="environment=staging"
```

### -var-file (Use a Variable File)

```bash
# Use a specific variable file
terraform plan -var-file="production.tfvars"
```

### -refresh=false (Skip State Refresh)

```bash
# Skip refreshing state from the cloud provider
terraform plan -refresh=false
```

This is faster but may miss drift. Use it when you know the state is current and want a quicker plan.

### -refresh-only (Only Refresh State)

```bash
# Only refresh state without planning configuration changes
terraform plan -refresh-only
```

This detects drift without planning any changes from your configuration. Useful for auditing whether real infrastructure matches the state.

### -destroy (Plan Destruction)

```bash
# Preview what terraform destroy would do
terraform plan -destroy
```

This shows you what would be destroyed without actually destroying anything.

### -detailed-exitcode

```bash
# Use detailed exit codes for automation
terraform plan -detailed-exitcode
```

Exit codes:
- `0` = No changes needed
- `1` = Error
- `2` = Changes are needed

This is useful in CI/CD scripts to conditionally skip the apply step when there are no changes.

### -json (Machine-Readable Output)

```bash
# Output the plan in JSON format
terraform plan -json
```

JSON output is useful for parsing with tools like `jq` or for integrating with automated review systems.

### -compact-warnings

```bash
# Show a more compact format for warnings
terraform plan -compact-warnings
```

### -parallelism

```bash
# Control how many resources are refreshed simultaneously
terraform plan -parallelism=20
```

The default is 10. Increase this for faster plans on large configurations, or decrease it if you are hitting API rate limits.

## Working with Plans in CI/CD

### Posting Plan Output to Pull Requests

A common CI/CD pattern is to post the plan output as a comment on a pull request:

```bash
# Generate the plan and capture output
terraform plan -no-color -out=tfplan > plan_output.txt 2>&1

# The plan output can then be posted as a PR comment
# using your CI/CD platform's API
```

The `-no-color` flag removes ANSI color codes from the output, which makes it readable as plain text in PR comments.

### Checking for Changes in Automation

```bash
#!/bin/bash
# Script to check if there are any pending changes

terraform plan -detailed-exitcode -out=tfplan
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "No changes needed"
elif [ $EXIT_CODE -eq 2 ]; then
    echo "Changes detected - review the plan"
    terraform show tfplan
elif [ $EXIT_CODE -eq 1 ]; then
    echo "Error during plan"
    exit 1
fi
```

## Common Plan Scenarios

### Detecting Drift

If someone changed a resource manually (through the AWS console, for example), `terraform plan` shows the difference:

```text
  # aws_instance.web has been changed
  ~ resource "aws_instance" "web" {
      ~ instance_type = "t3.large" -> "t3.micro"
        # (Terraform wants to change it back to match config)
    }
```

Terraform wants to reconcile the real state back to match your configuration.

### Understanding Forced Replacement

Some changes force Terraform to destroy and recreate a resource. The plan marks these clearly:

```text
  # aws_instance.web must be replaced
  -/+ resource "aws_instance" "web" {
      ~ ami = "ami-old" -> "ami-new" # forces replacement
    }
```

Before applying a replacement plan, consider:
- Will this cause downtime?
- Are there data on this resource that will be lost?
- Should you use `create_before_destroy` lifecycle rules?

## Conclusion

`terraform plan` is the most important command in your Terraform workflow. It is the difference between confidently making infrastructure changes and nervously hoping things work out. Always run it, always read it, and always save the plan before applying in production. The few minutes spent reviewing a plan can prevent hours of disaster recovery.
