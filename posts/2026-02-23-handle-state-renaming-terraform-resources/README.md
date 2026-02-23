# How to Handle State When Renaming Terraform Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Refactoring, Infrastructure as Code, DevOps

Description: Learn how to rename Terraform resources without destroying and recreating them by using terraform state mv and the moved block.

---

You named a resource `aws_instance.web` six months ago. Now it makes more sense to call it `aws_instance.api_server`. If you just change the name in your `.tf` file and run `terraform plan`, Terraform will want to destroy the old resource and create a new one. That's rarely what you want, especially if that resource is a production database or a running application.

Here's how to rename resources safely without any downtime or recreation.

## The Problem with Simple Renames

When you change a resource name in your configuration:

```hcl
# Before
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}

# After
resource "aws_instance" "api_server" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}
```

Terraform sees this as two separate changes:
1. `aws_instance.web` exists in state but not in configuration - destroy it.
2. `aws_instance.api_server` exists in configuration but not in state - create it.

The result: your running instance gets terminated and a new one gets created. Not ideal.

## Method 1: terraform state mv

The classic approach is to move the resource in state to match the new name:

```bash
# Rename the resource in state to match the new configuration name
terraform state mv aws_instance.web aws_instance.api_server
```

After running this command, the state knows the resource as `aws_instance.api_server`, which matches your updated configuration. Running `terraform plan` should show no changes.

### Step-by-Step Process

```bash
# Step 1: Check the current state
terraform state list | grep aws_instance
# aws_instance.web

# Step 2: Update the resource name in your .tf files
# (Change "web" to "api_server" in the resource block)

# Step 3: Move the resource in state
terraform state mv aws_instance.web aws_instance.api_server
# Move "aws_instance.web" to "aws_instance.api_server"
# Successfully moved 1 object(s).

# Step 4: Verify with a plan
terraform plan
# No changes. Your infrastructure matches the configuration.
```

### Renaming Resources with count

If the resource uses `count`, you need to move each index:

```bash
# If you're renaming a counted resource
terraform state mv 'aws_instance.web[0]' 'aws_instance.api_server[0]'
terraform state mv 'aws_instance.web[1]' 'aws_instance.api_server[1]'
terraform state mv 'aws_instance.web[2]' 'aws_instance.api_server[2]'
```

### Renaming Resources with for_each

For `for_each` resources, move each key:

```bash
# If you're renaming a for_each resource
terraform state mv 'aws_instance.web["app-1"]' 'aws_instance.api_server["app-1"]'
terraform state mv 'aws_instance.web["app-2"]' 'aws_instance.api_server["app-2"]'
```

## Method 2: The moved Block (Terraform 1.1+)

Starting with Terraform 1.1, you can declare renames directly in your configuration using the `moved` block:

```hcl
# Add a moved block to tell Terraform about the rename
moved {
  from = aws_instance.web
  to   = aws_instance.api_server
}

# The resource with its new name
resource "aws_instance" "api_server" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}
```

When you run `terraform plan`, Terraform sees the `moved` block and automatically updates the state:

```
Terraform will perform the following actions:

  # aws_instance.web has moved to aws_instance.api_server
    resource "aws_instance" "api_server" {
        id            = "i-0abc123def456"
        # (all attributes unchanged)
    }

Plan: 0 to add, 0 to change, 0 to destroy.
```

### Why moved Is Better

The `moved` block has several advantages over `terraform state mv`:

1. **It's declarative.** The rename is tracked in your configuration, visible in code review.
2. **It's safe for teams.** Every team member who pulls the updated code gets the rename applied automatically on their next `terraform plan`.
3. **It works with remote backends.** No need to run manual state commands.
4. **It's part of the normal plan/apply workflow.** No special steps required.

### Chaining moved Blocks

You can chain multiple renames if a resource has been renamed more than once:

```hcl
# First rename: web -> api_server
moved {
  from = aws_instance.web
  to   = aws_instance.api_server
}

# Second rename: api_server -> backend_server
moved {
  from = aws_instance.api_server
  to   = aws_instance.backend_server
}

resource "aws_instance" "backend_server" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}
```

### Cleaning Up moved Blocks

After everyone on the team has applied the rename (and any CI/CD pipelines have run), you can safely remove the `moved` block. It's only needed during the transition period.

## Renaming Resources Inside Modules

### Renaming a Resource Within a Module

If you're renaming a resource inside a module:

```bash
# Using state mv
terraform state mv module.compute.aws_instance.web module.compute.aws_instance.api_server
```

Or with a `moved` block inside the module:

```hcl
# Inside modules/compute/main.tf
moved {
  from = aws_instance.web
  to   = aws_instance.api_server
}

resource "aws_instance" "api_server" {
  ami           = var.ami_id
  instance_type = var.instance_type
}
```

### Renaming the Module Itself

If you're renaming the module call:

```hcl
# Before
module "web_servers" {
  source = "./modules/compute"
}

# After
module "api_servers" {
  source = "./modules/compute"
}

# Add a moved block for the module rename
moved {
  from = module.web_servers
  to   = module.api_servers
}
```

This moves all resources inside the module at once. You don't need to move each resource individually.

```bash
# Alternatively, using state mv
terraform state mv module.web_servers module.api_servers
# This moves all resources within the module
```

## Renaming with count to for_each Migration

A common refactoring is switching from `count` to `for_each`. This is technically a rename of each resource instance:

```hcl
# Before: using count
resource "aws_instance" "app" {
  count         = 3
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}

# After: using for_each
resource "aws_instance" "app" {
  for_each      = toset(["web", "api", "worker"])
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}

# moved blocks for the migration
moved {
  from = aws_instance.app[0]
  to   = aws_instance.app["web"]
}

moved {
  from = aws_instance.app[1]
  to   = aws_instance.app["api"]
}

moved {
  from = aws_instance.app[2]
  to   = aws_instance.app["worker"]
}
```

Or using `state mv`:

```bash
terraform state mv 'aws_instance.app[0]' 'aws_instance.app["web"]'
terraform state mv 'aws_instance.app[1]' 'aws_instance.app["api"]'
terraform state mv 'aws_instance.app[2]' 'aws_instance.app["worker"]'
```

## Updating References

After renaming a resource, remember to update all references throughout your configuration:

```hcl
# Before
output "web_ip" {
  value = aws_instance.web.public_ip
}

resource "aws_route53_record" "web" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "web"
  type    = "A"
  ttl     = 300
  records = [aws_instance.web.public_ip]
}

# After - update all references to use the new name
output "api_server_ip" {
  value = aws_instance.api_server.public_ip
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api"
  type    = "A"
  ttl     = 300
  records = [aws_instance.api_server.public_ip]
}
```

Missing a reference will cause a plan error, so Terraform will catch these for you.

## Handling Dependent Resources

If other resources depend on the renamed resource, they may show as changed in the plan even though nothing is actually different. This happens when the dependency is via a reference:

```bash
# After renaming aws_instance.web to aws_instance.api_server
terraform plan
# aws_security_group_rule.allow_web may show as needing update
# because its source_security_group_id referenced the old name
```

The plan should show in-place updates, not recreations. Review the plan carefully to make sure no resources are being destroyed.

## Wrapping Up

Renaming Terraform resources is a routine refactoring task that should never cause infrastructure changes. Use `moved` blocks (Terraform 1.1+) for the cleanest approach - they're declarative, team-friendly, and work within the normal plan/apply workflow. Fall back to `terraform state mv` for older Terraform versions or when you need immediate state changes.

Always run `terraform plan` after a rename to verify that no unexpected changes are planned. If the plan shows creates and destroys instead of just the rename, something went wrong and you should investigate before applying.

For related topics, see our posts on [moving resources between modules](https://oneuptime.com/blog/post/2026-02-23-handle-state-moving-resources-between-modules/view) and [handling state when changing resource types](https://oneuptime.com/blog/post/2026-02-23-handle-state-changing-resource-types-terraform/view).
