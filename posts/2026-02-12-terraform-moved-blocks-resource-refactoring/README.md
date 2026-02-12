# How to Use Terraform Moved Blocks for Resource Refactoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure as Code, Refactoring

Description: Learn how to use Terraform moved blocks to safely rename, reorganize, and refactor resources without destroying and recreating them.

---

Refactoring Terraform code used to be risky. Rename a resource? Terraform wants to destroy the old one and create a new one. Move a resource into a module? Same thing - destroy and recreate. For a security group or an S3 bucket, that's mildly annoying. For a production database, it's terrifying.

Before Terraform 1.1, the only safe way to refactor was using `terraform state mv` commands. These work, but they're manual, error-prone, and don't live in your version control. Moved blocks fix all of that. They're declarative, tracked in code, and applied automatically during `terraform plan` and `apply`.

## What Moved Blocks Do

A `moved` block tells Terraform that a resource has been renamed or relocated in the configuration, and that the existing state should follow it instead of treating it as a destroy-and-create.

Here's the basic syntax:

```hcl
moved {
  from = aws_s3_bucket.old_name
  to   = aws_s3_bucket.new_name
}
```

When Terraform encounters this during a plan, it updates the state to map the resource at `old_name` to `new_name`. No infrastructure changes, no downtime.

## Renaming a Resource

The simplest use case is renaming. You decided `aws_instance.web` should be `aws_instance.app_server` for clarity.

Before the refactor, your config looks like this:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  # ... other config
}
```

After the refactor, add the moved block alongside the renamed resource:

```hcl
# Tell Terraform this resource was renamed
moved {
  from = aws_instance.web
  to   = aws_instance.app_server
}

resource "aws_instance" "app_server" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  # ... other config
}
```

Run `terraform plan` and you'll see:

```
  # aws_instance.web has moved to aws_instance.app_server
    resource "aws_instance" "app_server" {
        id                                   = "i-0123456789abcdef0"
        # (no changes)
    }
```

No destroy, no create. Just a state update. Apply it and the instance continues running without interruption.

## Moving a Resource Into a Module

This is where moved blocks really shine. Say you're organizing your Terraform code and want to move your database resources into a dedicated module.

Before:

```hcl
# main.tf (root module)
resource "aws_db_instance" "production" {
  identifier     = "myapp-production"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  # ...
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet"
  subnet_ids = var.private_subnet_ids
}
```

After, create the module and add moved blocks:

```hcl
# main.tf (root module)
module "database" {
  source = "./modules/database"
  # ... pass variables
}

moved {
  from = aws_db_instance.production
  to   = module.database.aws_db_instance.this
}

moved {
  from = aws_db_subnet_group.main
  to   = module.database.aws_db_subnet_group.this
}
```

```hcl
# modules/database/main.tf
resource "aws_db_instance" "this" {
  identifier     = "myapp-production"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  # ...
}

resource "aws_db_subnet_group" "this" {
  name       = "main-db-subnet"
  subnet_ids = var.private_subnet_ids
}
```

Terraform will show that both resources moved from the root module into the `database` module. No infrastructure changes.

## Moving Between Modules

You can also move resources from one module to another:

```hcl
moved {
  from = module.old_module.aws_security_group.main
  to   = module.new_module.aws_security_group.app
}
```

## Switching from count to for_each

One of the trickier refactors is migrating from `count` to `for_each`. These use different addressing schemes in state, and moved blocks handle the mapping.

Before (using count):

```hcl
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
}
```

After (using for_each with moved blocks):

```hcl
resource "aws_subnet" "private" {
  for_each          = tomap({
    "a" = { cidr = "10.0.1.0/24", az = "us-east-1a" }
    "b" = { cidr = "10.0.2.0/24", az = "us-east-1b" }
    "c" = { cidr = "10.0.3.0/24", az = "us-east-1c" }
  })

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
}

# Map old count indexes to new for_each keys
moved {
  from = aws_subnet.private[0]
  to   = aws_subnet.private["a"]
}

moved {
  from = aws_subnet.private[1]
  to   = aws_subnet.private["b"]
}

moved {
  from = aws_subnet.private[2]
  to   = aws_subnet.private["c"]
}
```

This is a huge improvement over the old approach of running three separate `terraform state mv` commands.

## Moving Resources with for_each

If you're renaming a resource that uses `for_each`, you need moved blocks for each instance:

```hcl
# Moving each instance of a for_each resource
moved {
  from = aws_iam_role.service["api"]
  to   = aws_iam_role.app["api"]
}

moved {
  from = aws_iam_role.service["worker"]
  to   = aws_iam_role.app["worker"]
}

moved {
  from = aws_iam_role.service["scheduler"]
  to   = aws_iam_role.app["scheduler"]
}
```

## When to Remove Moved Blocks

Moved blocks can stay in your code indefinitely - they're harmless after they've been applied. But they do add clutter. A good practice is to:

1. Add the moved block
2. Apply to all environments (dev, staging, production)
3. Wait for everyone to pull the latest state
4. Remove the moved block in a follow-up PR

If someone runs Terraform after the moved block is removed but before they've applied it, Terraform will see the old address as a new resource and the new address as a deletion. That's why you need to make sure all environments have applied the moved blocks before removing them.

```hcl
# It's safe to leave moved blocks in your code
# They have no effect after the first apply
moved {
  from = aws_instance.web
  to   = aws_instance.app_server
}

# But you can also add a comment about when to remove it
# TODO: Remove after 2026-03-01 once all envs have applied
```

## Moved Blocks vs terraform state mv

Here's why moved blocks are better than `terraform state mv`:

| Feature | moved block | terraform state mv |
|---------|------------|-------------------|
| Tracked in code | Yes | No |
| Reviewable in PR | Yes | No |
| Repeatable | Yes | No |
| Works across environments | Yes | Manual per env |
| Rollback-friendly | Yes | Difficult |
| Requires state access | No | Yes |

The only time you still need `terraform state mv` is when you're splitting or merging state files, which moved blocks don't support.

## Chaining Moves

You can chain moved blocks. If you renamed something once and need to rename it again:

```hcl
# First rename (already applied)
moved {
  from = aws_instance.web
  to   = aws_instance.app
}

# Second rename
moved {
  from = aws_instance.app
  to   = aws_instance.app_server
}
```

Terraform follows the chain from the original name to the final destination.

## Handling State Conflicts

For details on handling state issues that might come up during refactoring, see our post on [Terraform state conflicts and locking issues](https://oneuptime.com/blog/post/terraform-state-conflicts-locking-issues/view).

## Wrapping Up

Moved blocks made Terraform refactoring safe and practical. Before them, reorganizing code meant risky state manipulation commands. Now you can rename resources, move them into modules, switch from count to for_each, and reorganize your entire codebase - all without touching a single piece of infrastructure. The key is to apply moved blocks to all environments before removing them from code, and to always verify with `terraform plan` before applying.
