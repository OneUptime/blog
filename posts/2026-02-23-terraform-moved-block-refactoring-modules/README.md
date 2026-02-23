# How to Use the moved Block When Refactoring Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Refactoring, State Management, IaC

Description: A deep dive into the Terraform moved block for safely refactoring modules without destroying resources, covering syntax, common patterns, and edge cases.

---

The `moved` block was introduced in Terraform 1.1 and it changed how teams approach refactoring. Before `moved`, renaming a resource or extracting it into a module meant either manually manipulating the state file with `terraform state mv` or accepting that Terraform would destroy and recreate the resource. Both options were risky.

The `moved` block eliminates that risk by declaring refactoring intent directly in your Terraform code. Terraform reads these declarations, updates the state automatically, and no resources get destroyed.

## How moved Works

When Terraform encounters a `moved` block, it checks the state file for a resource at the `from` address. If found, it updates the state to use the `to` address instead. The actual cloud resource is untouched.

```hcl
moved {
  from = aws_instance.web_server
  to   = aws_instance.application
}
```

After running `terraform apply`, the state entry for `aws_instance.web_server` becomes `aws_instance.application`. No instance is destroyed, no instance is created.

## Common Refactoring Patterns

### Renaming a Resource

The simplest use case - you want a better name:

```hcl
# Old name
# resource "aws_s3_bucket" "data" { ... }

# New name
resource "aws_s3_bucket" "application_data" {
  bucket = "mycompany-app-data"
  # ... same configuration
}

moved {
  from = aws_s3_bucket.data
  to   = aws_s3_bucket.application_data
}
```

### Moving into a Module

This is the most common refactoring scenario. You extract resources from the root module into a child module:

```hcl
# Before: resources in root module
# resource "aws_vpc" "main" { ... }
# resource "aws_subnet" "public" { ... }

# After: resources managed by a module
module "networking" {
  source = "./modules/networking"
  # ... variables
}

moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.this
}

moved {
  from = aws_subnet.public
  to   = module.networking.aws_subnet.public
}
```

### Moving Between Modules

You can also move resources from one module to another:

```hcl
moved {
  from = module.old_module.aws_iam_role.service
  to   = module.new_module.aws_iam_role.service
}
```

### Renaming a Module

When you rename a module call:

```hcl
# Old: module "web" { ... }
# New: module "frontend" { ... }

module "frontend" {
  source = "./modules/web-service"
  # ... same configuration
}

moved {
  from = module.web
  to   = module.frontend
}
```

This moves all resources inside the module at once. You do not need to list every individual resource.

### Converting count to for_each

A tricky but common refactoring is converting from `count` to `for_each`:

```hcl
# Old: using count
# resource "aws_subnet" "public" {
#   count = 3
#   ...
# }

# New: using for_each
resource "aws_subnet" "public" {
  for_each = {
    "us-east-1a" = "10.0.1.0/24"
    "us-east-1b" = "10.0.2.0/24"
    "us-east-1c" = "10.0.3.0/24"
  }

  availability_zone = each.key
  cidr_block        = each.value
}

# Map each index to its new key
moved {
  from = aws_subnet.public[0]
  to   = aws_subnet.public["us-east-1a"]
}

moved {
  from = aws_subnet.public[1]
  to   = aws_subnet.public["us-east-1b"]
}

moved {
  from = aws_subnet.public[2]
  to   = aws_subnet.public["us-east-1c"]
}
```

### Splitting a Module

When a module gets too big and you split it into two:

```hcl
# Old: one big module
# module "infrastructure" {
#   source = "./modules/infrastructure"
#   ...
# }

# New: split into networking and compute
module "networking" {
  source = "./modules/networking"
  # ...
}

module "compute" {
  source = "./modules/compute"
  # ...
}

# Move networking resources to the new networking module
moved {
  from = module.infrastructure.aws_vpc.main
  to   = module.networking.aws_vpc.this
}

moved {
  from = module.infrastructure.aws_subnet.public
  to   = module.networking.aws_subnet.public
}

# Move compute resources to the new compute module
moved {
  from = module.infrastructure.aws_instance.web
  to   = module.compute.aws_instance.web
}
```

## Verification Workflow

Always follow this workflow when using moved blocks:

```bash
# Step 1: Make the code changes and add moved blocks
# Step 2: Run plan to verify
terraform plan

# You should see messages like:
# aws_instance.web_server has moved to aws_instance.application
# No changes. Your infrastructure matches the configuration.

# Step 3: Apply
terraform apply

# Step 4: Verify state
terraform state list
```

If the plan shows any resource being destroyed or created, stop and check your moved blocks. The addresses must match exactly.

## How Long to Keep moved Blocks

After applying, the moved blocks have done their job. But do not remove them immediately. Consider these scenarios:

- Other team members who have not pulled the latest code
- CI/CD pipelines running against different branches
- Multiple workspaces using the same configuration

Keep moved blocks for at least one release cycle or until you are confident that all state files have been updated. A good rule of thumb is to remove them when you increment the major version of a module.

## Limitations

There are a few things the `moved` block cannot do:

**Cross-state moves.** You cannot move resources between separate state files. For that, you still need `terraform state mv` with the `-state` flag or `terraform import`.

**Moving between different resource types.** You cannot move an `aws_instance` to become an `aws_launch_template`. The resource type must match.

**Conditional moves.** There is no way to conditionally apply a moved block. They always apply.

**Nested module moves within for_each.** Moving resources in and out of modules that use `for_each` requires careful attention to the full address path.

## moved vs terraform state mv

Here is when to use each approach:

Use `moved` blocks when:
- Refactoring within the same state
- Working on a team (changes are tracked in version control)
- The move is part of a normal code change

Use `terraform state mv` when:
- Moving resources between different state files
- Doing one-off fixes to state
- Migrating from one backend to another

## Chaining Moves

You can chain moved blocks when a resource has been moved multiple times:

```hcl
# First refactoring (v1 -> v2)
moved {
  from = aws_instance.web
  to   = aws_instance.application
}

# Second refactoring (v2 -> v3)
moved {
  from = aws_instance.application
  to   = module.compute.aws_instance.this
}
```

Terraform resolves the chain, so someone upgrading from v1 directly to v3 will still have their state updated correctly.

## Summary

The `moved` block is the right tool for any Terraform refactoring that changes resource addresses. It is declarative, reviewable, and automatic. Use it whenever you rename resources, extract modules, rename modules, or convert between `count` and `for_each`.

For the broader refactoring process, see [how to refactor Terraform code into modules](https://oneuptime.com/blog/post/2026-02-23-refactor-terraform-code-into-modules/view).
