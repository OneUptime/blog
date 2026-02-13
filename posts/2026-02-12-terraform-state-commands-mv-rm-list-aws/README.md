# How to Use Terraform State Commands (mv, rm, list) for AWS Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure as Code, DevOps

Description: A practical guide to Terraform state commands including state mv, rm, list, show, and pull for managing AWS resource state without recreating infrastructure.

---

Terraform state is the source of truth that maps your configuration files to real AWS resources. Sometimes you need to manipulate this state directly - renaming resources, removing things from management, moving resources between modules, or just inspecting what Terraform thinks exists. The `terraform state` commands give you that control.

These commands are powerful but need to be used carefully. A wrong move can disconnect Terraform from your actual infrastructure, leading to orphaned resources or accidental recreations. Let's go through each command with real AWS scenarios.

## terraform state list

This is your starting point. It shows every resource Terraform is tracking:

```bash
# List all resources in state
terraform state list
```

The output looks something like this:

```
aws_instance.web
aws_instance.api
aws_security_group.web
aws_security_group.api
aws_vpc.main
aws_subnet.public[0]
aws_subnet.public[1]
aws_subnet.private[0]
aws_subnet.private[1]
module.rds.aws_db_instance.main
module.rds.aws_db_subnet_group.main
```

You can filter the output to find specific resources:

```bash
# List only resources in a specific module
terraform state list module.rds

# List only EC2 instances
terraform state list aws_instance

# Filter with a pattern
terraform state list 'aws_subnet.private'
```

This is particularly useful when you have hundreds of resources and need to find the exact address for a state operation.

## terraform state show

When you need the full details of a specific resource, `state show` gives you everything Terraform knows about it:

```bash
# Show details of a specific resource
terraform state show aws_instance.web
```

This outputs all attributes including computed values like IDs, ARNs, and IP addresses:

```
# aws_instance.web:
resource "aws_instance" "web" {
    ami                          = "ami-0abcdef1234567890"
    arn                          = "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456"
    availability_zone            = "us-east-1a"
    id                           = "i-0abc123def456"
    instance_state               = "running"
    instance_type                = "t3.medium"
    private_ip                   = "10.0.1.50"
    public_ip                    = "54.123.45.67"
    subnet_id                    = "subnet-abc123"
    vpc_security_group_ids       = ["sg-abc123"]
    ...
}
```

This is invaluable for debugging. If Terraform wants to recreate a resource and you don't understand why, compare the state with your configuration.

## terraform state mv

This is probably the most commonly used state command. It renames a resource address in state without destroying and recreating the actual AWS resource.

**Scenario 1: Renaming a resource**

You wrote `aws_instance.web` but want to rename it to `aws_instance.frontend`:

```bash
# Rename a resource in state
terraform state mv aws_instance.web aws_instance.frontend
```

After this, update your `.tf` file to use the new name. Run `terraform plan` to confirm no changes are needed.

**Scenario 2: Moving a resource into a module**

You're refactoring and want to move a standalone resource into a module:

```bash
# Move resource into a module
terraform state mv aws_db_instance.main module.database.aws_db_instance.main
```

**Scenario 3: Moving a resource out of a module**

The reverse - extracting a resource from a module:

```bash
# Move resource out of a module
terraform state mv module.networking.aws_vpc.main aws_vpc.main
```

**Scenario 4: Moving between module instances**

If you're converting from `count` to `for_each`:

```bash
# Move from count index to for_each key
terraform state mv 'aws_subnet.private[0]' 'aws_subnet.private["us-east-1a"]'
terraform state mv 'aws_subnet.private[1]' 'aws_subnet.private["us-east-1b"]'
terraform state mv 'aws_subnet.private[2]' 'aws_subnet.private["us-east-1c"]'
```

This is a common operation when refactoring. Using `count` with subnets is fragile because adding or removing an AZ shifts all indices. Switching to `for_each` with AZ names as keys is more robust, but requires state moves.

**Scenario 5: Dry run**

Always use `-dry-run` first to verify the operation:

```bash
# Preview the state move
terraform state mv -dry-run aws_instance.web aws_instance.frontend
```

## terraform state rm

This removes a resource from Terraform's state without destroying the actual AWS resource. The resource continues to exist in AWS, but Terraform no longer manages it.

**Scenario 1: Hand off a resource to another team**

Another team wants to manage an RDS instance with their own Terraform config:

```bash
# Remove from state (resource stays in AWS)
terraform state rm aws_db_instance.shared
```

After this, the other team can `terraform import` it into their state.

**Scenario 2: Remove a resource you imported by mistake**

You accidentally imported the wrong resource:

```bash
# Remove the incorrectly imported resource
terraform state rm aws_s3_bucket.wrong_bucket
```

**Scenario 3: Remove all instances of a module**

When you want to stop managing an entire module's resources:

```bash
# Remove all resources from a module
terraform state rm module.legacy_app
```

**Important warning**: After `terraform state rm`, if you don't also remove the resource from your `.tf` files, the next `terraform apply` will try to create it again. Always clean up your configuration after removing from state.

## terraform state pull and push

`state pull` downloads the entire state file as JSON. This is useful for inspection, backup, or scripting:

```bash
# Download state as JSON
terraform state pull > state_backup.json

# Pretty-print and search
terraform state pull | jq '.resources[] | select(.type == "aws_instance")'

# Count resources by type
terraform state pull | jq '[.resources[].type] | group_by(.) | map({type: .[0], count: length}) | sort_by(.count) | reverse'
```

`state push` uploads a state file. This is dangerous and rarely needed:

```bash
# Push a modified state (use with extreme caution)
terraform state push modified_state.json
```

You should almost never use `state push`. It's a last resort for disaster recovery.

## terraform state replace-provider

When you need to switch provider namespaces (like during the Terraform 0.13 upgrade):

```bash
# Replace provider in state
terraform state replace-provider hashicorp/aws registry.terraform.io/hashicorp/aws
```

## Practical Workflow: Refactoring a Flat Config into Modules

Here's a real-world workflow for refactoring AWS resources into modules. Say you have this flat structure:

```hcl
# Before: everything in root
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public" { ... }
resource "aws_db_instance" "main" { ... }
resource "aws_instance" "web" { ... }
```

And you want to reorganize into modules:

```bash
# Step 1: Backup state
terraform state pull > backup.json

# Step 2: Move resources to modules
terraform state mv aws_vpc.main module.networking.aws_vpc.main
terraform state mv aws_subnet.public module.networking.aws_subnet.public
terraform state mv aws_db_instance.main module.database.aws_db_instance.main
terraform state mv aws_instance.web module.compute.aws_instance.web

# Step 3: Verify - plan should show no changes
terraform plan
```

If the plan shows changes, something went wrong with the move. Check addresses and fix before applying.

## Safety Tips

1. **Always backup state first**: `terraform state pull > backup_$(date +%Y%m%d).json`
2. **Use -dry-run with mv**: Preview before executing
3. **Lock the state**: Make sure no one else is running Terraform during state operations
4. **Run terraform plan after**: Confirm zero changes after state manipulation
5. **Use workspaces carefully**: State commands operate on the current workspace

State management mistakes can cause real problems - from orphaned resources you're still paying for to accidental infrastructure deletion. Take your time with these commands, especially on production state.

For monitoring the infrastructure these resources represent, take a look at our guide on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).
