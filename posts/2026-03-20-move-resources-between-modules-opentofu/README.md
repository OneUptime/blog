# How to Move Resources Between Modules Using moved Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Moved Blocks, Module, Refactoring, Infrastructure as Code

Description: Learn how to use OpenTofu moved blocks to relocate resources between modules without destroying and recreating your infrastructure.

Moving a resource into or out of a module changes its state address. Without a `moved` block, OpenTofu treats the old address as deleted and the new address as a new resource. The `moved` block maps the old module address to the new one, preserving the resource in place.

## How Module Addresses Work

Resources inside modules have addresses like:
- Root-level: `aws_instance.app`
- Inside a module: `module.compute.aws_instance.app`
- Inside a nested module: `module.app.module.compute.aws_instance.app`

A `moved` block maps between these address formats.

## Moving a Resource INTO a Module

Suppose you have a root-level security group that you want to move into a `networking` module:

```hcl
# Before: root-level resource

# resource "aws_security_group" "web" { ... }

# After: resource lives inside module.networking
module "networking" {
  source = "./modules/networking"
}
```

```hcl
# modules/networking/main.tf
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id
}
```

Add the `moved` block in your root configuration:

```hcl
# root moved.tf
moved {
  from = aws_security_group.web
  to   = module.networking.aws_security_group.web
}
```

## Moving a Resource OUT of a Module

The reverse works the same way:

```hcl
# Promote a resource from a module to root level
moved {
  from = module.networking.aws_security_group.web
  to   = aws_security_group.web
}
```

## Moving Between Sibling Modules

Transfer a resource from one module to another:

```hcl
# Move a load balancer from the "legacy" module to the "networking" module
moved {
  from = module.legacy.aws_lb.main
  to   = module.networking.aws_lb.main
}
```

## Moving for_each Resources Between Modules

For resources created with `for_each`, include the key in the address:

```hcl
# Move all subnets from root to the networking module
moved {
  from = aws_subnet.public["us-east-1a"]
  to   = module.networking.aws_subnet.public["us-east-1a"]
}

moved {
  from = aws_subnet.public["us-east-1b"]
  to   = module.networking.aws_subnet.public["us-east-1b"]
}
```

## Bulk Moving with for_each Modules

When you have multiple instances of a module using `for_each`, move resources for each instance:

```hcl
# Moving a resource to a specific module instance
moved {
  from = aws_s3_bucket.logs["us-east-1"]
  to   = module.regional["us-east-1"].aws_s3_bucket.logs
}
```

## Verifying the Move

After adding the `moved` blocks, run `tofu plan` to verify:

```bash
tofu plan
```

Expected output for a successful move:

```text
# aws_security_group.web has moved to module.networking.aws_security_group.web
```

There should be no `+` (create) or `-` (destroy) lines for the moved resources - only a `moved` annotation.

If you see both a destroy and a create, the addresses in your `moved` block are incorrect. Check the exact state addresses with `tofu state list`.

```bash
# List all current state addresses
tofu state list

# Show detail for a specific resource
tofu state show module.networking.aws_security_group.web
```

## Conclusion

Moving resources between modules is one of the most common refactoring operations in maturing infrastructure codebases. The `moved` block makes this safe and non-destructive. Always verify with `tofu plan` before applying, and check `tofu state list` to confirm the exact source and destination addresses.
