# How to Use the anytrue Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the anytrue function in Terraform to check if at least one element in a list is true, with practical examples and real-world patterns.

---

When writing Terraform configurations, you often need to check whether at least one condition out of many is satisfied. The `anytrue` function does exactly that - it takes a list of boolean values and returns `true` if any one of them is `true`. This makes it a natural fit for optional feature toggles, fallback logic, and flexible validation rules.

In this guide, we will explore the `anytrue` function in detail, demonstrate its usage with real examples, and show how it complements other Terraform functions.

## What is the anytrue Function?

The `anytrue` function accepts a list of boolean values and returns `true` if at least one element in the list evaluates to `true`. If all elements are `false`, or the list is empty, it returns `false`.

```hcl
# Basic syntax
anytrue(list)
```

This function was introduced in Terraform 0.14 and has been stable since then.

## Basic Usage in Terraform Console

Let us start with some simple examples in the Terraform console to understand the behavior.

```hcl
# At least one element is true
> anytrue([false, false, true])
true

# All elements are false
> anytrue([false, false, false])
false

# All elements are true
> anytrue([true, true, true])
true

# An empty list returns false
> anytrue([])
false

# String coercion works
> anytrue(["false", "true"])
true
```

One important detail: an empty list returns `false`. This is the opposite of `alltrue([])`, which returns `true`. The logic makes sense - if there are no elements, then none of them can be `true`.

## Using anytrue for Feature Flags

A common pattern is to use `anytrue` to check if any of several feature flags are enabled, then take action based on that.

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

variable "enable_logging" {
  type    = bool
  default = false
}

variable "enable_alerting" {
  type    = bool
  default = false
}

locals {
  # If any observability feature is enabled, we need the IAM role
  needs_observability_role = anytrue([
    var.enable_monitoring,
    var.enable_logging,
    var.enable_alerting,
  ])
}

# Only create the IAM role if at least one observability feature is active
resource "aws_iam_role" "observability" {
  count = local.needs_observability_role ? 1 : 0

  name = "observability-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}
```

This avoids creating unnecessary resources when none of the observability features are turned on.

## Using anytrue in Variable Validation

You can use `anytrue` in validation blocks when you need to verify that at least one condition is met across a collection of inputs.

```hcl
variable "subnets" {
  type = list(object({
    cidr_block = string
    is_public  = bool
  }))

  # Ensure at least one subnet is public for the load balancer
  validation {
    condition = anytrue([
      for subnet in var.subnets : subnet.is_public
    ])
    error_message = "At least one subnet must be marked as public for the load balancer."
  }
}
```

This validation ensures that the caller provides at least one public subnet. Without this check, a deployment could silently fail when trying to create an internet-facing load balancer.

## Combining anytrue with for Expressions

The real power of `anytrue` emerges when you combine it with `for` expressions to evaluate complex conditions across a list of objects.

```hcl
variable "team_members" {
  type = list(object({
    name  = string
    role  = string
    admin = bool
  }))
}

locals {
  # Check if at least one team member has admin access
  has_admin = anytrue([
    for member in var.team_members : member.admin
  ])

  # Check if at least one developer is on the team
  has_developer = anytrue([
    for member in var.team_members : member.role == "developer"
  ])
}

# Create the CI/CD pipeline only if there is a developer on the team
resource "aws_codepipeline" "app" {
  count = local.has_developer ? 1 : 0

  name     = "app-pipeline"
  role_arn = aws_iam_role.pipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source"]
      configuration    = {
        ConnectionArn  = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "myorg/myapp"
        BranchName     = "main"
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["source"]
      configuration   = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.app.name
      }
    }
  }
}
```

## anytrue for Environment Detection

Another practical use is determining your deployment context based on multiple signals.

```hcl
variable "environment" {
  type = string
}

variable "tags" {
  type = map(string)
}

locals {
  # Determine if this is a production-like environment through various signals
  is_production_like = anytrue([
    var.environment == "production",
    var.environment == "staging",
    lookup(var.tags, "tier", "") == "critical",
    lookup(var.tags, "pci_compliant", "false") == "true",
  ])
}

# Enable enhanced monitoring for production-like environments
resource "aws_db_instance" "main" {
  identifier     = "app-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = local.is_production_like ? "db.r6g.xlarge" : "db.t3.medium"

  # Turn on enhanced monitoring if any production signal is detected
  monitoring_interval = local.is_production_like ? 30 : 0
  monitoring_role_arn = local.is_production_like ? aws_iam_role.rds_monitoring[0].arn : null

  allocated_storage = 100
  storage_encrypted = true
}
```

## Difference Between anytrue and alltrue

Understanding the distinction between `anytrue` and `alltrue` is important for choosing the right function.

```hcl
# anytrue: at least one must be true
> anytrue([true, false, false])
true

# alltrue: every one must be true
> alltrue([true, false, false])
false

# Edge cases with empty lists
> anytrue([])
false

> alltrue([])
true
```

Use `anytrue` when you want permissive logic - "if any of these conditions hold, do something." Use `alltrue` when you want strict logic - "all of these conditions must hold." For more on `alltrue`, see [How to Use the alltrue Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-alltrue-function-in-terraform/view).

## Error Handling Considerations

A few things to watch for when working with `anytrue`:

- **Empty lists return false**: Unlike `alltrue`, calling `anytrue([])` returns `false`. Plan accordingly if your input list might be empty.
- **Type coercion**: Strings like `"true"` and `"false"` are automatically converted to their boolean equivalents. Other strings cause errors.
- **Null handling**: Null values in the list will cause the function to error out. Filter them before passing data to `anytrue`.

```hcl
locals {
  # Filter out null values before using anytrue
  raw_flags = [true, null, false]
  clean_flags = [for flag in local.raw_flags : flag if flag != null]

  any_enabled = anytrue(local.clean_flags)
}
```

## Real-World Scenario: Multi-Cloud Readiness Check

Here is a more comprehensive example where `anytrue` helps determine if a deployment should proceed based on cloud provider availability checks.

```hcl
variable "cloud_providers" {
  type = list(object({
    name      = string
    enabled   = bool
    region    = string
    healthy   = bool
  }))
}

locals {
  # Proceed if at least one cloud provider is enabled and healthy
  can_deploy = anytrue([
    for provider in var.cloud_providers :
    provider.enabled && provider.healthy
  ])

  # Get the list of usable providers
  usable_providers = [
    for provider in var.cloud_providers :
    provider if provider.enabled && provider.healthy
  ]
}

output "deployment_status" {
  value = local.can_deploy ? "Ready to deploy to ${length(local.usable_providers)} provider(s)" : "No healthy providers available"
}
```

## Summary

The `anytrue` function is essential for writing flexible Terraform configurations that respond to the presence of at least one qualifying condition. It works naturally with `for` expressions and is ideal for feature flag checking, environment detection, and permissive validation.

Key takeaways:

- `anytrue` returns `true` if at least one element in the list is `true`
- Empty lists return `false`
- Pairs well with `for` expressions for evaluating conditions across collections
- Use it for optional features, fallback logic, and flexible validation
- Handle null values by filtering them out before passing to the function

Use `anytrue` whenever your logic needs the flexibility of "at least one" rather than the strictness of "every single one."
