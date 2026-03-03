# How to Use terraform plan -target for Faster Feedback

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, Planning, Targeted Operations, DevOps

Description: Learn when and how to use terraform plan -target effectively to get faster feedback during development without introducing state drift.

---

When you are working on a large Terraform project and need to test a change to a single resource, waiting for a full plan across hundreds of resources is painful. The `-target` flag lets you tell Terraform to only plan changes for specific resources or modules, dramatically cutting feedback time.

But `-target` comes with real risks if misused. This post covers how to use it effectively and when to avoid it.

## Basic Usage

The `-target` flag accepts a resource address and limits the plan to that resource and its dependencies:

```bash
# Target a specific resource
terraform plan -target=aws_instance.web_server

# Target a resource with an index
terraform plan -target='aws_instance.web_server[0]'

# Target a module
terraform plan -target=module.database

# Target a resource inside a module
terraform plan -target=module.networking.aws_subnet.private

# Multiple targets
terraform plan -target=aws_instance.web_server -target=aws_security_group.web
```

The same flag works with `terraform apply`:

```bash
terraform apply -target=aws_instance.web_server
```

## How -target Works Internally

When you use `-target`, Terraform does not simply ignore everything else. Here is what happens:

1. Terraform reads the full configuration
2. It builds the complete dependency graph
3. It identifies the targeted resource and all resources it depends on
4. It only refreshes and plans those resources
5. It ignores resources that depend on the target (downstream dependencies)

This means if your target resource depends on a VPC, the VPC will be refreshed too. But resources that use the target (like a load balancer pointing to an instance) will not be refreshed.

```hcl
# If you target aws_instance.web, Terraform will also refresh:
# - aws_subnet.web (dependency)
# - aws_security_group.web (dependency)
# But NOT:
# - aws_lb_target_group_attachment.web (depends on the target)

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.web.id
  vpc_security_group_ids = [aws_security_group.web.id]
}

resource "aws_lb_target_group_attachment" "web" {
  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web.id
}
```

## When to Use -target

### During Development Iterations

You are tweaking an EC2 instance configuration and want quick feedback:

```bash
# Quick iteration cycle
terraform plan -target=aws_instance.app_server
# Review output, make changes, repeat
terraform plan -target=aws_instance.app_server
# Satisfied with the result, now do a full plan
terraform plan
```

### When Debugging a Specific Resource

A resource is behaving unexpectedly and you want to see what Terraform thinks about it without waiting for the full plan:

```bash
# Check just the problematic resource
terraform plan -target=aws_ecs_service.api

# See the full detail with refresh
terraform plan -target=aws_ecs_service.api -refresh-only
```

### When Applying an Emergency Fix

Production is down and you need to change one security group rule immediately. A full plan might take 10 minutes. A targeted apply takes seconds:

```bash
# Emergency fix - update a single security group rule
terraform apply -target=aws_security_group_rule.allow_https
```

### When Testing a New Module

You just added a new module and want to verify it plans correctly without touching existing infrastructure:

```bash
terraform plan -target=module.new_monitoring_stack
```

## When NOT to Use -target

### As Your Default Workflow

If you always use `-target` and never do full plans, you will miss drift and dependency issues. Resources that were changed outside of Terraform will not be detected. Dependencies between resources might be broken without you knowing.

### For Production Applies (Normally)

Regular production applies should always be full plans. The whole point of Terraform is to converge your infrastructure to the desired state. Using `-target` skips that convergence for everything except the target.

### When Resources Have Complex Dependencies

If a resource has many downstream dependencies, applying just the resource without its dependents can leave things in an inconsistent state:

```bash
# Dangerous: changing a subnet without updating instances in it
terraform apply -target=aws_subnet.private

# The instances in this subnet might need to be updated too
# but -target will not catch that
```

## Combining -target with -refresh=false

For the fastest possible feedback, combine both flags:

```bash
# Fastest possible plan for a single resource
terraform plan -target=aws_instance.web -refresh=false
```

This skips both the refresh of non-targeted resources and the refresh of the target itself. Terraform just compares the configuration against the cached state. Use this only when you are certain the target's actual state matches what is in the state file.

## Targeting Modules

Targeting entire modules is often more useful than targeting individual resources:

```bash
# Plan changes for the entire API module
terraform plan -target=module.api

# For nested modules
terraform plan -target=module.app.module.api
```

This is great when your project is organized into modules by service. You can get a focused plan for just the service you are working on.

## Using -target in CI/CD

Some teams use `-target` in CI/CD to speed up PR plans, running a targeted plan for the resources affected by the PR:

```bash
#!/bin/bash
# targeted-plan.sh
# Detect changed resources and plan only those

# Get list of changed .tf files
CHANGED_FILES=$(git diff --name-only origin/main -- '*.tf')

# Extract resource names from changed files (simplified)
TARGETS=""
for file in $CHANGED_FILES; do
  resources=$(grep -E '^resource ' "$file" | \
    sed 's/resource "\([^"]*\)" "\([^"]*\)".*/\1.\2/' )
  for resource in $resources; do
    TARGETS="$TARGETS -target=$resource"
  done
done

if [ -n "$TARGETS" ]; then
  echo "Planning targets: $TARGETS"
  terraform plan $TARGETS
else
  echo "No resource changes detected, running full plan"
  terraform plan
fi
```

This is a rough approach and misses cases like variable changes that affect many resources. But it can be useful for quick feedback on PRs.

## Safety Practices

### Always Do a Full Plan Before Merging

Make `-target` part of your development loop, not your deployment loop:

```text
Development:
  1. Make change
  2. terraform plan -target=<changed_resource>  (fast feedback)
  3. Iterate
  4. terraform plan  (full validation before committing)

CI/CD:
  1. PR opened -> full terraform plan
  2. PR merged -> full terraform apply
```

### Check the Warning

Terraform prints a warning when you use `-target`:

```text
Warning: Resource targeting is in effect

You are creating a plan with the -target option, which means that the result
of this plan may not represent all of the changes needed to reach desired state.
```

Do not ignore this. It is a reminder that you might be missing changes.

### Use -target for Plan, Not Apply (Usually)

It is safer to use `-target` with `plan` than with `apply`. A targeted plan is informational. A targeted apply can leave your infrastructure in a partial state.

## Performance Comparison

Here are typical numbers from a project with 800 resources:

| Command | Time |
|---------|------|
| `terraform plan` | 7 minutes |
| `terraform plan -target=module.api` (50 resources) | 45 seconds |
| `terraform plan -target=aws_instance.web` | 15 seconds |
| `terraform plan -target=aws_instance.web -refresh=false` | 3 seconds |

The speedup is dramatic, especially for single-resource targets.

## Summary

The `-target` flag is a powerful tool for faster Terraform feedback during development. Use it to iterate quickly on individual resources or modules. But always follow up with a full plan before committing changes, and never rely on targeted applies for production deployments. Think of `-target` as a development accelerator, not a deployment strategy.

For monitoring the infrastructure resources you deploy and manage with Terraform, [OneUptime](https://oneuptime.com) provides real-time uptime tracking and alerting across your entire stack.
