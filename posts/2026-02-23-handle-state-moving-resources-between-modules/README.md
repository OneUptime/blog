# How to Handle State When Moving Resources Between Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Modules, Refactoring, Infrastructure as Code

Description: A practical guide to moving Terraform resources between modules without destroying and recreating infrastructure, using state mv and moved blocks.

---

As Terraform projects mature, you'll inevitably want to reorganize resources into modules. Maybe you started with everything in a flat root module and now want to group related resources. Or maybe you're moving resources from one module to a completely different one. Either way, the challenge is the same: moving resources in your configuration without Terraform thinking it needs to destroy and recreate them.

## Understanding the Problem

Terraform identifies resources by their full address in state. When a resource moves between modules, its address changes:

```
# Resource at the root level
aws_instance.web

# Same resource inside a module
module.compute.aws_instance.web

# Same resource inside a nested module
module.app.module.compute.aws_instance.web
```

If you just move the resource definition from one module to another without updating the state, Terraform sees a resource being deleted at the old address and a new resource being created at the new address. That means downtime.

## Method 1: terraform state mv

The traditional approach uses `terraform state mv` to update the resource address in state:

### Moving from Root to a Module

```bash
# Move a resource from root level into a module
terraform state mv aws_instance.web module.compute.aws_instance.web

# Move multiple resources
terraform state mv aws_instance.web module.compute.aws_instance.web
terraform state mv aws_security_group.web module.compute.aws_security_group.web
terraform state mv aws_eip.web module.compute.aws_eip.web
```

### Moving from One Module to Another

```bash
# Move a resource from module.old to module.new
terraform state mv \
  module.old_compute.aws_instance.web \
  module.new_compute.aws_instance.web
```

### Moving an Entire Module

```bash
# Move all resources from one module to another
terraform state mv module.old_compute module.new_compute
```

This moves every resource inside the module in one command. It's the cleanest approach when you're renaming a module or restructuring the module hierarchy.

### Moving from a Module to Root

```bash
# Move a resource from a module back to the root level
terraform state mv module.compute.aws_instance.web aws_instance.web
```

## Method 2: moved Blocks (Terraform 1.1+)

The `moved` block is the modern, declarative approach:

### Moving to a Module

```hcl
# Tell Terraform the resource moved from root to a module
moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}
```

### Moving Between Modules

```hcl
# Tell Terraform the resource moved between modules
moved {
  from = module.old_compute.aws_instance.web
  to   = module.new_compute.aws_instance.web
}
```

### Moving an Entire Module

```hcl
# Move all resources in a module to a new module path
moved {
  from = module.old_compute
  to   = module.new_compute
}
```

## Real-World Example: Extracting a Module

Let's walk through a complete example. You have a flat configuration and want to extract networking resources into a module.

### Before: Flat Configuration

```hcl
# main.tf - everything at root level
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "main-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  tags = { Name = "public-subnet" }
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
  tags = { Name = "private-subnet" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public.id
}
```

### Step 1: Create the Module

```hcl
# modules/networking/main.tf
variable "vpc_cidr" {
  type = string
}

variable "public_subnet_cidr" {
  type = string
}

variable "private_subnet_cidr" {
  type = string
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = { Name = "main-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.public_subnet_cidr
  tags = { Name = "public-subnet" }
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.private_subnet_cidr
  tags = { Name = "private-subnet" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "private_subnet_id" {
  value = aws_subnet.private.id
}
```

### Step 2: Update the Root Configuration

```hcl
# main.tf - updated to use the module
module "networking" {
  source = "./modules/networking"

  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidr  = "10.0.1.0/24"
  private_subnet_cidr = "10.0.2.0/24"
}

# moved blocks to tell Terraform where resources went
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

moved {
  from = aws_subnet.public
  to   = module.networking.aws_subnet.public
}

moved {
  from = aws_subnet.private
  to   = module.networking.aws_subnet.private
}

moved {
  from = aws_internet_gateway.main
  to   = module.networking.aws_internet_gateway.main
}

# The instance stays at root but now references module outputs
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  subnet_id     = module.networking.public_subnet_id
}
```

### Step 3: Run Plan

```bash
terraform plan
```

The plan should show the moves but no creates or destroys:

```
Terraform will perform the following actions:

  # aws_vpc.main has moved to module.networking.aws_vpc.main
  # aws_subnet.public has moved to module.networking.aws_subnet.public
  # aws_subnet.private has moved to module.networking.aws_subnet.private
  # aws_internet_gateway.main has moved to module.networking.aws_internet_gateway.main

Plan: 0 to add, 0 to change, 0 to destroy.
```

### Step 4: Apply

```bash
terraform apply
```

After applying, the state is updated with the new addresses. You can remove the `moved` blocks once everyone on the team has applied.

## Handling counted and for_each Resources in Modules

When moving resources that use `count` or `for_each`:

```hcl
# Moving counted resources to a module
moved {
  from = aws_subnet.public[0]
  to   = module.networking.aws_subnet.public[0]
}

moved {
  from = aws_subnet.public[1]
  to   = module.networking.aws_subnet.public[1]
}
```

Or with `terraform state mv`:

```bash
terraform state mv 'aws_subnet.public[0]' 'module.networking.aws_subnet.public[0]'
terraform state mv 'aws_subnet.public[1]' 'module.networking.aws_subnet.public[1]'
```

## Moving Between Separate State Files

If you're moving resources between modules that live in different state files (different root configurations), you can't use `moved` blocks. Use `terraform state mv` with `-state` and `-state-out`:

```bash
# Pull both states
cd project-a && terraform state pull > /tmp/state-a.tfstate
cd project-b && terraform state pull > /tmp/state-b.tfstate

# Move the resource between state files
terraform state mv \
  -state=/tmp/state-a.tfstate \
  -state-out=/tmp/state-b.tfstate \
  module.networking.aws_vpc.main \
  module.shared_networking.aws_vpc.main

# Push the updated states back
cd project-a && terraform state push /tmp/state-a.tfstate
cd project-b && terraform state push /tmp/state-b.tfstate
```

## Dealing with Cross-Module Dependencies

When you move resources between modules, you may need to update how other resources reference them. This is especially important for outputs:

```hcl
# Before: direct reference
resource "aws_instance" "web" {
  subnet_id = aws_subnet.public.id
}

# After: reference through module output
resource "aws_instance" "web" {
  subnet_id = module.networking.public_subnet_id
}
```

Make sure the source module exports all the attributes that other parts of your configuration need.

## Scripting Large Moves

For large refactors, script the state moves:

```bash
#!/bin/bash
# move-to-module.sh - Move resources from root to a module

set -euo pipefail

MODULE="module.networking"

RESOURCES=(
  "aws_vpc.main"
  "aws_subnet.public"
  "aws_subnet.private"
  "aws_internet_gateway.main"
  "aws_route_table.public"
  "aws_route_table.private"
  "aws_route_table_association.public"
  "aws_route_table_association.private"
  "aws_nat_gateway.main"
  "aws_eip.nat"
)

for resource in "${RESOURCES[@]}"; do
  echo "Moving $resource to $MODULE.$resource"
  terraform state mv "$resource" "$MODULE.$resource"
done

echo "Done. Run 'terraform plan' to verify."
```

## Verification Checklist

After moving resources between modules:

1. Run `terraform plan` and verify zero creates/destroys.
2. Check that all resource references have been updated.
3. Verify outputs are correctly defined in the new module.
4. Test that `terraform_remote_state` consumers (if any) still work.
5. Run `terraform state list` to confirm all resources are at their new addresses.

```bash
# Quick verification
terraform state list | sort > /tmp/after-move.txt
echo "Resources in state after move:"
cat /tmp/after-move.txt

# Verify plan is clean
terraform plan -detailed-exitcode
echo "Exit code: $? (0 = no changes, 2 = changes detected)"
```

## Wrapping Up

Moving resources between modules is a routine part of Terraform project maintenance. The `moved` block (Terraform 1.1+) is the recommended approach because it's declarative, team-friendly, and works within the normal plan/apply workflow. Use `terraform state mv` for older versions or when moving between separate state files.

The key is always to verify with `terraform plan` after the move. If you see any creates or destroys, stop and investigate before applying.

For more on Terraform state refactoring, see our posts on [renaming resources](https://oneuptime.com/blog/post/2026-02-23-handle-state-renaming-terraform-resources/view) and [changing resource types](https://oneuptime.com/blog/post/2026-02-23-handle-state-changing-resource-types-terraform/view).
