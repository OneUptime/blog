# How to Rename Resources Without Destroying Them Using moved Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Moved Blocks, Refactoring, Infrastructure as Code, State Management

Description: Learn how to use OpenTofu moved blocks to rename or move resources in your configuration without destroying and recreating them.

When you rename a resource in your configuration, OpenTofu sees the old name as deleted and the new name as a new resource - unless you tell it the address has moved. The `moved` block records this renaming so OpenTofu updates the state entry rather than destroying and recreating the resource.

## The Problem Without moved

```hcl
# Before: resource named "web"

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
}
```

If you rename it to `"app_server"` without a `moved` block:

```hcl
# After rename - OpenTofu thinks "web" was deleted and "app_server" is new
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = "t3.micro"
}
```

Running `tofu plan` would show a destroy/create change:
```text
- destroy aws_instance.web
+ create  aws_instance.app_server
```

Applying that plan destroys the running instance and creates a new one - not what you want.

## The Solution: moved Block

Add a `moved` block alongside the renamed resource:

```hcl
# The moved block records the old-to-new address mapping
moved {
  from = aws_instance.web
  to   = aws_instance.app_server
}

# The resource with its new name
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = "t3.micro"
}
```

Running `tofu plan` now shows:

```text
# aws_instance.web has moved to aws_instance.app_server
```

No destruction, no recreation - on apply, OpenTofu updates the state entry instead.

## Multiple Renames in One Apply

You can include multiple `moved` blocks in a single configuration file:

```hcl
# Rename the instance
moved {
  from = aws_instance.web
  to   = aws_instance.app_server
}

# Rename the security group
moved {
  from = aws_security_group.web_sg
  to   = aws_security_group.app_server_sg
}

# Rename the Elastic IP
moved {
  from = aws_eip.web_ip
  to   = aws_eip.app_server_ip
}
```

## Renaming count-Based Resources

If both addresses refer to the resource as a whole, OpenTofu applies the move to all instances created by `count`:

```hcl
# Old: count-based
# resource "aws_instance" "server" { count = 3 }

# New: still count-based but renamed
moved {
  from = aws_instance.server
  to   = aws_instance.app
}

resource "aws_instance" "app" {
  count         = 3
  ami           = var.ami_id
  instance_type = "t3.micro"
}
```

## Where to Put moved Blocks

Put `moved` blocks in any top-level `.tf` or `.tofu` file in the configuration directory. A common practice is to use a dedicated `moved.tf` file:

```text
infra/
├── main.tf
├── variables.tf
├── outputs.tf
└── moved.tf    ← all moved blocks here
```

## Cleaning Up moved Blocks

`moved` blocks are often only needed once for a given state, but removing them later is a breaking change for anyone still upgrading from the old address. If you are certain all existing state files have been updated by an apply that included the block, you can remove it. Otherwise, leaving old `moved` blocks in place is harmless and serves as documentation of the rename history.

## Conclusion

The `moved` block is the safe way to rename resources in OpenTofu. Always add a `moved` block when renaming a resource to avoid an unnecessary destroy-and-recreate cycle. Use a dedicated `moved.tf` file to keep refactoring history organized.
