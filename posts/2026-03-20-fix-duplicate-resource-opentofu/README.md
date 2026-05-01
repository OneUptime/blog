# How to Fix 'Error: Duplicate Resource' in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Duplicate Resource, Error, Infrastructure as Code, Refactoring

Description: Learn how to resolve duplicate resource definition errors in OpenTofu caused by refactoring, copy-paste mistakes, or module merges.

## Introduction

"Error: Duplicate resource" means two `resource` blocks with the same type and name exist in the same namespace (module). OpenTofu requires each resource address to be unique. This typically happens during refactoring, when merging branches, or when moving resources between files.

## Error Messages

```hcl
Error: Duplicate resource "aws_instance" configuration
  on main.tf line 25:
  A aws_instance resource named "web" was already declared at main.tf line 8.
  Resource names must be unique per type in each module.

Error: Duplicate module "vpc" call
  on main.tf line 15:
  A module call named "vpc" was already declared at main.tf line 3.
```

## Fix 1: Find and Remove Duplicates

```bash
# Search for duplicate resource declarations

grep -rn "resource \"aws_instance\" \"web\"" .

# Search for duplicate module calls
grep -rn "module \"vpc\"" .
```

Once found, remove or rename the duplicate:

```hcl
# File: main.tf - has one declaration
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
}

# File: compute.tf - has a duplicate (remove this one)
# resource "aws_instance" "web" {   # DELETE THIS
#   ...
# }
```

## Fix 2: Rename One of the Duplicates

If both resources are intentional but different, rename one:

```hcl
# Rename to reflect purpose
resource "aws_instance" "web_primary" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  tags = { Name = "web-primary" }
}

resource "aws_instance" "web_secondary" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  tags = { Name = "web-secondary" }
}
```

## Fix 3: Move State When Renaming

If you rename a resource that already exists in state, move the state entry to match:

```bash
# Resource was "aws_instance.web" in config and state
# After renaming to "aws_instance.web_primary" in config

# Move the state entry to the new name before applying
tofu state mv aws_instance.web aws_instance.web_primary

# Now plan will show no changes (assuming config matches)
tofu plan
```

## Fix 4: Module Name Conflicts After Merge

After merging two branches that both added a module call with the same name:

```hcl
# Rename one module call and update all references
module "vpc_east" {
  source = "./modules/vpc"
  region = "us-east-1"
}

module "vpc_west" {
  source = "./modules/vpc"
  region = "us-west-2"
}
```

```bash
# Move state for the renamed module
tofu state mv module.vpc module.vpc_east
```

## Fix 5: Use moved Block for Clean Refactoring

OpenTofu's `moved` block documents resource renames without requiring manual state operations:

```hcl
# moved.tf - declare the rename
moved {
  from = aws_instance.web
  to   = aws_instance.web_primary
}

# The duplicate is removed and replaced with the renamed version
resource "aws_instance" "web_primary" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
}
```

```bash
# Run plan - OpenTofu handles the state move automatically
tofu plan
# Shows: aws_instance.web has moved to aws_instance.web_primary

tofu apply
# Keep the moved block to preserve the refactoring history.
# Remove it only when you're certain all relevant states have applied the move.
```

## Conclusion

Duplicate resource errors are fixed by removing or renaming one of the conflicting declarations. When renaming a resource that has existing state, use `tofu state mv` or the declarative `moved` block to update the state reference without destroying and re-creating the resource. Keep `moved` blocks until you're sure all relevant states have applied the refactor, because removing them too early is a breaking change. Always run `tofu validate` after merging branches to catch duplicates early.
