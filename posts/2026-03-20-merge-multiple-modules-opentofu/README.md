# How to Merge Multiple Modules into One in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Refactoring, Moved Blocks, Infrastructure as Code

Description: Learn how to safely consolidate multiple OpenTofu modules into a single module using moved blocks to avoid infrastructure disruption.

Sometimes the opposite of splitting is needed - small modules that are always deployed together and share tight dependencies are better as a single module. Merging them reduces complexity, eliminates cross-module output wiring, and simplifies the root configuration.

## When to Merge

Merge modules when:
- Two modules are always called together and never independently.
- Cross-module output references create coupling that negates the benefit of separation.
- The module boundaries don't reflect meaningful architectural boundaries.

## The Merge Process

Given two modules:

```text
modules/
├── security-groups/   (aws_security_group resources)
└── compute/           (aws_instance resources, depends on security-groups)
```

You want to merge them into:

```text
modules/
└── compute/           (includes both SGs and instances)
```

## Step 1: Move Resources into the Target Module

Copy the security group resources from `modules/security-groups/main.tf` into `modules/compute/main.tf`:

```hcl
# modules/compute/main.tf (after merge)

# Security groups (moved from modules/security-groups)

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id
}

# EC2 instances (already here)
resource "aws_instance" "web" {
  ami                    = var.ami_id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]
}
```

## Step 2: Update the Root Module

Remove the `module.security_groups` call and update the `module.compute` call:

```hcl
# root main.tf (after merge)
module "compute" {
  source = "./modules/compute"
  vpc_id = module.networking.vpc_id
  ami_id = var.ami_id
  # No longer need to pass sg_ids from security-groups module
}
```

## Step 3: Add moved Blocks

Map every resource from the old module address to the new merged module:

```hcl
# root moved.tf

# Security group resources moved into module.compute
moved {
  from = module.security_groups.aws_security_group.web
  to   = module.compute.aws_security_group.web
}

moved {
  from = module.security_groups.aws_security_group.app
  to   = module.compute.aws_security_group.app
}
```

## Step 4: Verify with tofu plan

```bash
tofu plan
```

Expected output should only show `moved` annotations with no creates or destroys. Verify each one:

```text
# module.security_groups.aws_security_group.web has moved to module.compute.aws_security_group.web
# module.security_groups.aws_security_group.app has moved to module.compute.aws_security_group.app
```

If you see destroys, double-check that:
- The resource names match exactly.
- The resource type is identical in both locations.
- The moved block uses the correct source and destination addresses.

```bash
# List current state to confirm addresses
tofu state list | grep "module.security_groups"
```

## Step 5: Apply and Clean Up

```bash
tofu apply

# Remove the merged module directory
rm -rf modules/security-groups
```

Keep the `moved` blocks if this configuration is shared, because removing them is generally a breaking change. Only remove them if you're certain every affected state has already applied the migration.

## Updating Module Outputs

If other parts of your codebase reference outputs from the merged-away module, update them to reference the consolidated module:

```hcl
# Before
output "web_sg_id" { value = module.security_groups.web_sg_id }

# After
output "web_sg_id" { value = module.compute.web_sg_id }
```

## Conclusion

Merging modules is the mirror of splitting - use `moved` blocks to map old addresses to new ones, verify with `tofu plan`, and only proceed with the apply when no destroys are planned. The key is patience: get the `moved` blocks exactly right before running `apply`.
