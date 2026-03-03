# How to Fix Terraform Moved Block Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, State Management

Description: Fix Terraform moved block errors including invalid references, conflicting moves, and common mistakes when refactoring resource addresses.

---

Terraform 1.1 introduced `moved` blocks as a declarative way to refactor your configuration without destroying and recreating resources. They replace the manual `terraform state mv` workflow with something that lives in your code and can be reviewed in pull requests. But getting them wrong produces confusing errors. This guide covers the most common moved block errors and how to fix them.

## What Moved Blocks Do

A `moved` block tells Terraform that a resource has been renamed or relocated in your configuration:

```hcl
moved {
  from = aws_instance.web
  to   = aws_instance.application
}

resource "aws_instance" "application" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

When you run `terraform plan`, Terraform recognizes that the existing `aws_instance.web` in state should now be tracked as `aws_instance.application`. No destroy/create cycle needed.

## Error 1: Invalid Source Address

```text
Error: Invalid moved object address

  on main.tf line 2, in moved:
   2:   from = aws_instance.web[0]

The source address must refer to a resource instance or a module
instance.
```

The `from` address must match exactly what is in your state file. Common mistakes:

```hcl
# Wrong - using the resource type without the name
moved {
  from = aws_instance
  to   = aws_instance.web
}

# Wrong - using module path syntax incorrectly
moved {
  from = module.vpc.aws_subnet
  to   = module.networking.aws_subnet.main
}

# Right - full resource address
moved {
  from = aws_instance.old_name
  to   = aws_instance.new_name
}

# Right - with index for count-based resources
moved {
  from = aws_instance.web[0]
  to   = aws_instance.web["primary"]
}

# Right - module moves
moved {
  from = module.old_vpc
  to   = module.networking
}
```

Check your state file to find the exact current address:

```bash
terraform state list | grep aws_instance
```

## Error 2: Destination Already Exists

```text
Error: Moved object still exists

  on main.tf line 1, in moved:
   1: moved {

The move statement would move aws_instance.old to aws_instance.new,
but there is already a resource instance at aws_instance.new in the
current configuration.
```

This happens when both the source and destination exist in the state. You cannot move a resource to an address that is already occupied.

**Fix:** Either remove the conflicting resource first or choose a different destination:

```bash
# Check what is at each address
terraform state show aws_instance.old
terraform state show aws_instance.new

# If the destination is a duplicate, remove it from state
terraform state rm aws_instance.new

# Then the moved block will work
```

## Error 3: Conflicting Moved Blocks

You cannot have multiple moved blocks that reference the same source or create a chain that conflicts:

```hcl
# Wrong - same source moved to two different destinations
moved {
  from = aws_instance.web
  to   = aws_instance.app
}

moved {
  from = aws_instance.web
  to   = aws_instance.server
}
```

```text
Error: Ambiguous move statements

The resource aws_instance.web has been moved to both
aws_instance.app and aws_instance.server.
```

**Fix:** Keep only one moved block per source address:

```hcl
moved {
  from = aws_instance.web
  to   = aws_instance.app
}
```

## Error 4: Chained Moves

If you need to rename something that was already renamed, chain the moves correctly:

```hcl
# First rename (from a previous change)
moved {
  from = aws_instance.web
  to   = aws_instance.app
}

# Second rename (new change)
moved {
  from = aws_instance.app
  to   = aws_instance.application
}
```

This works - Terraform processes the chain. But a cycle does not:

```hcl
# Wrong - circular reference
moved {
  from = aws_instance.a
  to   = aws_instance.b
}

moved {
  from = aws_instance.b
  to   = aws_instance.a
}
```

## Error 5: Moving Between Resource Types

You cannot move a resource from one type to another:

```hcl
# Wrong - different resource types
moved {
  from = aws_instance.web
  to   = aws_ec2_instance.web
}
```

Moved blocks only support renaming within the same resource type. If you need to change the resource type, you have to import and remove or use `terraform state rm` and `terraform import`.

## Error 6: Moving count to for_each Instances

This is one of the most useful applications of moved blocks, but the syntax needs to be exact:

```hcl
# Before - using count
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

# After - using for_each
resource "aws_subnet" "private" {
  for_each          = toset(["us-east-1a", "us-east-1b", "us-east-1c"])
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, index(["us-east-1a", "us-east-1b", "us-east-1c"], each.key) + 10)
  availability_zone = each.key
}

# Moved blocks to map indexes to keys
moved {
  from = aws_subnet.private[0]
  to   = aws_subnet.private["us-east-1a"]
}

moved {
  from = aws_subnet.private[1]
  to   = aws_subnet.private["us-east-1b"]
}

moved {
  from = aws_subnet.private[2]
  to   = aws_subnet.private["us-east-1c"]
}
```

## Error 7: Moving Resources Into or Out of Modules

Moving resources between modules requires the full module path:

```hcl
# Moving a resource into a module
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

# Moving a resource out of a module
moved {
  from = module.networking.aws_vpc.main
  to   = aws_vpc.main
}

# Moving between modules
moved {
  from = module.old_network.aws_vpc.main
  to   = module.new_network.aws_vpc.main
}
```

The moved block should be placed in the configuration that contains the `to` address.

## Error 8: Moved Block in Wrong File

Moved blocks must be in the same module where the `to` resource is defined. Placing them elsewhere causes errors:

```text
Error: Moved object not in configuration

The object aws_instance.new is not declared in the current
configuration.
```

If you are moving a resource into `module.networking`, the moved block goes in the root module (where the module is called), not inside the child module:

```hcl
# root/main.tf
module "networking" {
  source = "./modules/networking"
}

# This moved block belongs in root/main.tf
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}
```

## Cleaning Up Moved Blocks

Moved blocks are meant to be temporary. After all team members and environments have applied the move, you can safely remove the moved blocks:

```hcl
# Keep for a few weeks/months, then remove
# moved {
#   from = aws_instance.web
#   to   = aws_instance.application
# }
```

Removing a moved block that has already been applied has no effect. Terraform just stops tracking the historical rename.

## Verifying Moves Before Applying

Always run `terraform plan` after adding moved blocks to verify the behavior:

```bash
terraform plan
```

You should see output like:

```text
  # aws_instance.web has moved to aws_instance.application
    resource "aws_instance" "application" {
        id            = "i-abc123"
        # (no changes)
    }
```

If you see any destroy/create actions instead of moves, something is wrong with your moved block addresses.

## Best Practices

1. **Use moved blocks instead of terraform state mv** - They are version-controlled, reviewable, and repeatable across environments.
2. **Plan before apply** - Always verify the move produces no destroy/create actions.
3. **One logical change per PR** - Do not mix refactoring (moves) with functional changes.
4. **Clean up old moved blocks** - Remove them after all environments have been updated.
5. **Document the reason** - Add a comment explaining why the move was needed.

## Conclusion

Moved blocks are a powerful refactoring tool, but they require exact address matching between your state and your configuration. Most errors come from incorrect addresses, conflicting moves, or placing the block in the wrong module. Always check your state with `terraform state list` to confirm the current addresses, write your moved blocks carefully, and verify with `terraform plan` before applying.
