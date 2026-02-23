# How to Use terraform state mv to Move Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, CLI Commands, Refactoring, Infrastructure as Code

Description: Practical guide to using terraform state mv for renaming resources, moving resources between modules, and refactoring Terraform configurations without destroying infrastructure.

---

Refactoring Terraform code is inevitable. You rename a resource, reorganize into modules, or split a large configuration into smaller ones. Without `terraform state mv`, any of these changes would cause Terraform to destroy the old resource and create a new one. The `state mv` command updates the state to match your new code structure, preserving the actual infrastructure.

## What terraform state mv Does

The `terraform state mv` command changes the address of a resource in the Terraform state file. It does not modify any real infrastructure - it only updates the mapping between your Terraform configuration and the existing resources.

Think of it this way: your state file says "the resource at address `aws_instance.old_name` corresponds to EC2 instance `i-0abc123`." When you rename the resource in your code to `aws_instance.new_name`, Terraform sees a resource to destroy (`old_name`) and one to create (`new_name`). By running `state mv`, you tell Terraform that `aws_instance.new_name` corresponds to the same `i-0abc123` - no destruction needed.

## Basic Syntax

```bash
terraform state mv [options] SOURCE DESTINATION
```

Both SOURCE and DESTINATION are resource addresses.

## Renaming a Resource

The most common use case - you change a resource name in your configuration:

```hcl
# Before: the resource was called "server"
# resource "aws_instance" "server" { ... }

# After: you renamed it to "web_server"
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}
```

Update the state to match:

```bash
# Move the resource to its new address
terraform state mv aws_instance.server aws_instance.web_server

# Verify the move
terraform state list | grep aws_instance

# Run plan to confirm no changes
terraform plan
# Should show: No changes. Your infrastructure matches the configuration.
```

## Moving Resources Into a Module

When you extract resources into a module:

```hcl
# Before: resource was at the root level
# resource "aws_vpc" "main" { ... }
# resource "aws_subnet" "public" { ... }

# After: resources are in a module
module "networking" {
  source = "./modules/networking"
}
```

```bash
# Move each resource into the module
terraform state mv aws_vpc.main module.networking.aws_vpc.main
terraform state mv aws_subnet.public module.networking.aws_subnet.public

# Verify
terraform plan
```

## Moving Resources Out of a Module

The reverse operation - extracting resources from a module to the root:

```bash
# Move from module to root
terraform state mv module.networking.aws_vpc.main aws_vpc.main
terraform state mv module.networking.aws_subnet.public aws_subnet.public
```

## Moving Resources Between Modules

```bash
# Move from one module to another
terraform state mv module.old_module.aws_instance.web module.new_module.aws_instance.web
```

## Moving Indexed Resources

### count-Based Resources

```bash
# Move a specific count index
terraform state mv 'aws_instance.worker[0]' 'aws_instance.worker[2]'

# Move a count resource to a non-indexed resource
terraform state mv 'aws_instance.worker[0]' aws_instance.primary_worker
```

### for_each-Based Resources

```bash
# Move a for_each instance to a different key
terraform state mv 'aws_s3_bucket.data["old-key"]' 'aws_s3_bucket.data["new-key"]'

# Move from for_each to a standalone resource
terraform state mv 'aws_s3_bucket.data["logs"]' aws_s3_bucket.logs
```

## Moving an Entire Module

You can move a whole module at once:

```bash
# Rename a module
terraform state mv module.old_name module.new_name

# This moves ALL resources inside the module
```

This is much faster than moving resources individually when you rename a module.

## Dry Run

Unfortunately, `terraform state mv` does not have a built-in dry-run flag. The best approach is to verify before and after:

```bash
# Step 1: Check current state
terraform state list > before.txt

# Step 2: Run the move
terraform state mv aws_instance.old aws_instance.new

# Step 3: Check the result
terraform state list > after.txt

# Step 4: Compare
diff before.txt after.txt

# Step 5: Verify no infrastructure changes
terraform plan
```

## Backup and Recovery

Terraform automatically creates a backup before modifying state. You can also specify a custom backup path:

```bash
# Create a custom backup
terraform state mv -backup=./state-backup.tfstate \
  aws_instance.old aws_instance.new
```

If something goes wrong, restore from backup:

```bash
# Restore from the auto-created backup
terraform state push terraform.tfstate.backup

# Or from your custom backup
terraform state push ./state-backup.tfstate
```

## Moving Between State Files

To move a resource from one state file to another (useful when splitting configurations):

```bash
# Move a resource from one state to another
terraform state mv \
  -state=source/terraform.tfstate \
  -state-out=destination/terraform.tfstate \
  aws_instance.web aws_instance.web
```

For remote backends, you need to use `terraform state pull` and `terraform state push`:

```bash
# In the source directory, remove from state
cd source/
terraform state rm aws_instance.web

# In the destination directory, import the resource
cd ../destination/
terraform import aws_instance.web i-0abc123def456789
```

## Common Refactoring Patterns

### Converting count to for_each

When migrating from `count` to `for_each`:

```hcl
# Before: using count
# resource "aws_instance" "worker" {
#   count = 3
#   ...
# }

# After: using for_each
resource "aws_instance" "worker" {
  for_each = toset(["app-1", "app-2", "app-3"])
  # ...
}
```

```bash
# Map old indices to new keys
terraform state mv 'aws_instance.worker[0]' 'aws_instance.worker["app-1"]'
terraform state mv 'aws_instance.worker[1]' 'aws_instance.worker["app-2"]'
terraform state mv 'aws_instance.worker[2]' 'aws_instance.worker["app-3"]'
```

### Splitting a Monolith

When breaking a large configuration into smaller ones:

```bash
# In the monolith directory
# Remove the networking resources from state (they're moving)
terraform state rm aws_vpc.main
terraform state rm aws_subnet.public
terraform state rm aws_subnet.private

# In the new networking directory
# Import the resources
terraform import aws_vpc.main vpc-0abc123
terraform import aws_subnet.public subnet-0abc123
terraform import aws_subnet.private subnet-0def456
```

### Renaming a Module Source

When you change a module's source path but not its content:

```hcl
# Before
module "networking" {
  source = "./modules/network"
}

# After (renamed the directory)
module "networking" {
  source = "./modules/networking"
}
```

No state mv needed in this case - the module name did not change, only the source path. Terraform handles this during `terraform init`.

But if you rename the module block itself:

```hcl
# Before
module "network" {
  source = "./modules/networking"
}

# After
module "networking" {
  source = "./modules/networking"
}
```

```bash
# Move the entire module
terraform state mv module.network module.networking
```

## Using moved Blocks (Terraform 1.1+)

Starting with Terraform 1.1, you can declare resource moves in configuration instead of running state commands:

```hcl
# Declare the move in your configuration
moved {
  from = aws_instance.server
  to   = aws_instance.web_server
}

# Terraform will automatically update state during apply
```

This is often preferred over `terraform state mv` because:
- It is declarative and version-controlled
- It works for all team members automatically
- No manual state manipulation needed

However, `moved` blocks only work within a single state file. Cross-state moves still require `terraform state mv` or import/rm.

## Common Mistakes

### Not Running plan After mv

Always run `terraform plan` after a move to verify the state matches your configuration:

```bash
terraform state mv aws_instance.old aws_instance.new
terraform plan  # ALWAYS do this
```

If the plan shows changes, something is off. Review and fix before applying.

### Typos in Addresses

A typo in the destination address creates a resource at a wrong address:

```bash
# Oops - typo in destination
terraform state mv aws_instance.web aws_intance.web  # "intance" not "instance"

# Fix by moving again
terraform state mv aws_intance.web aws_instance.web
```

### Forgetting Quoted Addresses

Shell interpretation can mangle addresses with brackets:

```bash
# Wrong - shell interprets brackets
terraform state mv aws_instance.worker[0] aws_instance.worker[1]

# Correct - quote the addresses
terraform state mv 'aws_instance.worker[0]' 'aws_instance.worker[1]'
```

## Summary

The `terraform state mv` command is essential for refactoring Terraform code without destroying real infrastructure. Use it for renaming resources, reorganizing into modules, converting between `count` and `for_each`, and splitting configurations. Always back up state before making changes, always run `terraform plan` afterward to verify, and consider using `moved` blocks for simple renames that should be tracked in version control. For removing resources from state entirely, see [terraform state rm](https://oneuptime.com/blog/post/terraform-state-rm-command/view). For discovering resource addresses, start with [terraform state list](https://oneuptime.com/blog/post/terraform-state-list-command/view).
