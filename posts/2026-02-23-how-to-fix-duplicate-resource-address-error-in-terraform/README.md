# How to Fix Duplicate Resource Address Error in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, State Management, Configuration, DevOps

Description: How to fix Duplicate Resource Address errors in Terraform caused by naming conflicts, moved resources, or module duplication issues.

---

You add a resource to your Terraform configuration and get:

```text
Error: Duplicate resource "aws_instance" configuration

on main.tf line 20:
  20: resource "aws_instance" "web" {

A aws_instance resource named "web" was already declared at main.tf:5.
Resource names must be unique per type in each module.
```

Or the state-related variant:

```text
Error: Duplicate resource address

The resource address "aws_instance.web" is already used in the current state.
Each resource must have a unique address.
```

This error means you have two resources with the same type and name in the same module. Terraform cannot tell them apart, so it refuses to proceed. Let us look at how this happens and how to fix it.

## Cause 1: Same Resource Defined Twice in Code

The most straightforward case: you defined the same resource twice, maybe in different files within the same module:

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}

# servers.tf (in the same directory)
resource "aws_instance" "web" {  # ERROR: duplicate
  ami           = "ami-0987654321fedcba0"
  instance_type = "t3.large"
}
```

**Fix**: Rename one of the resources:

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}

# servers.tf
resource "aws_instance" "api" {  # Unique name
  ami           = "ami-0987654321fedcba0"
  instance_type = "t3.large"
}
```

Remember that Terraform loads all `.tf` files in a directory as a single module. Two files in the same directory cannot have resources with the same type and name.

## Cause 2: Resource Name Conflict After Refactoring

You refactored code by moving resources between files but accidentally left a copy behind:

```bash
# Find duplicate resource definitions across all .tf files
grep -rn 'resource "aws_instance" "web"' *.tf
# main.tf:5:resource "aws_instance" "web" {
# old-main.tf:12:resource "aws_instance" "web" {
```

**Fix**: Remove the duplicate definition:

```bash
# Check which file has the correct configuration
# Then remove or rename the duplicate
```

A good practice is to use `terraform fmt` and `terraform validate` after refactoring to catch issues early:

```bash
terraform fmt -recursive
terraform validate
```

## Cause 3: Module Called Multiple Times Without Unique Names

If you call the same module multiple times without distinct names:

```hcl
# WRONG - but this actually works since module names are different
# The real issue is when you copy-paste and forget to change the name
module "web_server" {
  source        = "./modules/web-server"
  instance_type = "t3.micro"
}

module "web_server" {  # ERROR: duplicate module name
  source        = "./modules/web-server"
  instance_type = "t3.large"
}
```

**Fix**: Give each module call a unique name:

```hcl
module "web_server_small" {
  source        = "./modules/web-server"
  instance_type = "t3.micro"
}

module "web_server_large" {
  source        = "./modules/web-server"
  instance_type = "t3.large"
}
```

Or use `for_each` to create multiple instances of the same module:

```hcl
module "web_server" {
  for_each = {
    small = "t3.micro"
    large = "t3.large"
  }

  source        = "./modules/web-server"
  instance_type = each.value
}
```

## Cause 4: State Has a Resource That Matches a New One

You removed a resource from your code, but it is still in the state. Then you try to create a new resource with the same address:

```bash
# State still has aws_instance.web from a previous configuration
# You add a new aws_instance.web with different attributes
```

**Fix Option 1**: Remove the old resource from state first:

```bash
# Check what is in state
terraform state list | grep "aws_instance.web"

# Remove the stale entry
terraform state rm aws_instance.web

# Now your new definition can take its place
terraform plan
```

**Fix Option 2**: Import the existing resource into the new definition:

```bash
# If the real infrastructure still exists and matches your new definition
terraform import aws_instance.web i-0123456789abcdef0
```

## Cause 5: Moved Blocks Creating Conflicts

When using `moved` blocks to rename resources, conflicts can arise:

```hcl
# You renamed the resource
moved {
  from = aws_instance.old_web
  to   = aws_instance.web
}

# But aws_instance.web already exists in the state
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
```

**Fix**: Resolve the conflict by removing one of the state entries:

```bash
# Check what is at both addresses
terraform state show aws_instance.old_web
terraform state show aws_instance.web

# If old_web should replace web:
terraform state rm aws_instance.web
# Then the moved block will handle the rename

# If web is the correct one:
terraform state rm aws_instance.old_web
# Then remove the moved block from your code
```

## Cause 6: count and for_each Changes

Switching between `count` and `for_each` (or adding them to an existing resource) can cause address conflicts:

```hcl
# Before: single resource
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}

# After: you add count
resource "aws_instance" "web" {
  count         = 2
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
```

The state has `aws_instance.web` but now Terraform expects `aws_instance.web[0]` and `aws_instance.web[1]`.

**Fix**: Use `moved` blocks or state commands to handle the migration:

```hcl
# Use a moved block to map the old address to the new one
moved {
  from = aws_instance.web
  to   = aws_instance.web[0]
}
```

Or manually:

```bash
# Move the state entry to the indexed address
terraform state mv 'aws_instance.web' 'aws_instance.web[0]'
```

For switching from `count` to `for_each`:

```bash
# Move from count index to for_each key
terraform state mv 'aws_instance.web[0]' 'aws_instance.web["web-1"]'
terraform state mv 'aws_instance.web[1]' 'aws_instance.web["web-2"]'
```

## Finding Duplicates Programmatically

For large configurations, manually checking for duplicates is impractical. Use these approaches:

```bash
# Find duplicate resource declarations in .tf files
grep -rh 'resource "' *.tf | sort | uniq -d

# Find all resource addresses in state
terraform state list | sort | uniq -d

# Compare configuration with state
terraform plan -detailed-exitcode
# Exit code 2 means changes are needed
```

## Prevention

1. **Use consistent file organization** - put related resources in the same file, not scattered across many files
2. **Run `terraform validate` after changes** - it catches duplicate definitions immediately
3. **Use `terraform state list` before adding resources** to check for conflicts
4. **Use `moved` blocks** when renaming resources instead of deleting and recreating
5. **Review Terraform plan output carefully** - look for unexpected creates and destroys that might indicate naming conflicts

The duplicate resource address error is fundamentally about naming: every resource in a module must have a unique combination of type and name. Whether the conflict is in your code or in your state, the fix is always to make sure each resource address points to exactly one thing.
