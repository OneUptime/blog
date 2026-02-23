# How to Use Locals to Simplify Complex Expressions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Locals, Infrastructure as Code, Best Practices

Description: Learn how to use Terraform locals to break down complex expressions into readable, named components that make your infrastructure code easier to understand and maintain.

---

Terraform configurations can get messy fast. When you start nesting functions, conditionals, and string interpolations inside resource blocks, the code becomes hard to read and harder to debug. Locals give you a way to break complex expressions into smaller, named pieces that are easier to understand.

This post shows practical patterns for using locals to tame complex Terraform expressions.

## The Problem with Inline Complex Expressions

Consider this resource definition where everything is computed inline:

```hcl
# This works, but it is hard to read
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.environment == "production" ? "m5.xlarge" : (var.environment == "staging" ? "m5.large" : "t3.micro")
  subnet_id     = var.is_public ? element(aws_subnet.public[*].id, count.index % length(aws_subnet.public)) : element(aws_subnet.private[*].id, count.index % length(aws_subnet.private))

  tags = merge(
    { for k, v in var.default_tags : k => v },
    {
      Name        = "${var.project}-${var.environment}-app-${format("%02d", count.index + 1)}"
      Environment = var.environment
      Role        = "application"
      CostCenter  = lookup(var.cost_centers, var.environment, "unknown")
    }
  )
}
```

Every time you look at this resource, you have to mentally parse each expression. Now multiply that across 20 resources in your configuration.

## Breaking It Down with Locals

Here is the same configuration refactored using locals:

```hcl
locals {
  # Map environment names to instance types
  instance_type_map = {
    production = "m5.xlarge"
    staging    = "m5.large"
    dev        = "t3.micro"
  }

  # Look up the instance type for the current environment
  instance_type = lookup(local.instance_type_map, var.environment, "t3.micro")

  # Select the correct subnet list based on public/private
  target_subnets = var.is_public ? aws_subnet.public[*].id : aws_subnet.private[*].id

  # Build standard tags for all resources
  standard_tags = merge(var.default_tags, {
    Environment = var.environment
    CostCenter  = lookup(var.cost_centers, var.environment, "unknown")
  })
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = local.instance_type
  subnet_id     = element(local.target_subnets, count.index % length(local.target_subnets))

  tags = merge(local.standard_tags, {
    Name = "${var.project}-${var.environment}-app-${format("%02d", count.index + 1)}"
    Role = "application"
  })
}
```

The resource block is now much easier to scan. Each local has a descriptive name that tells you what it represents without needing to decode the expression.

## Simplifying Nested Conditionals

Nested ternary operators are one of the worst offenders for readability. Here is a common pattern where you pick different configurations based on environment:

```hcl
# Hard to read nested ternary
resource "aws_rds_instance" "db" {
  instance_class    = var.environment == "production" ? "db.r5.2xlarge" : (var.environment == "staging" ? "db.r5.large" : "db.t3.medium")
  allocated_storage = var.environment == "production" ? 500 : (var.environment == "staging" ? 100 : 20)
  multi_az          = var.environment == "production" ? true : false
  # ...
}
```

Replace with a map lookup:

```hcl
locals {
  # Define environment-specific database configurations
  db_config = {
    production = {
      instance_class    = "db.r5.2xlarge"
      allocated_storage = 500
      multi_az          = true
    }
    staging = {
      instance_class    = "db.r5.large"
      allocated_storage = 100
      multi_az          = false
    }
    dev = {
      instance_class    = "db.t3.medium"
      allocated_storage = 20
      multi_az          = false
    }
  }

  # Select the config for the current environment
  current_db_config = local.db_config[var.environment]
}

resource "aws_rds_instance" "db" {
  instance_class    = local.current_db_config.instance_class
  allocated_storage = local.current_db_config.allocated_storage
  multi_az          = local.current_db_config.multi_az
  # ...
}
```

This is not just more readable - it is also easier to add a new environment. You just add another entry to the map.

## Simplifying Complex String Construction

Building ARNs, URLs, and other structured strings can produce long, error-prone expressions. Locals let you build them in steps.

```hcl
locals {
  # Account and region info
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Build ARN components separately
  s3_bucket_name = "${var.project}-${var.environment}-data"
  s3_bucket_arn  = "arn:aws:s3:::${local.s3_bucket_name}"
  s3_objects_arn = "${local.s3_bucket_arn}/*"

  # Build the KMS key ARN
  kms_key_arn = "arn:aws:kms:${local.region}:${local.account_id}:key/${var.kms_key_id}"

  # Build the SNS topic ARN
  sns_topic_name = "${var.project}-${var.environment}-alerts"
  sns_topic_arn  = "arn:aws:sns:${local.region}:${local.account_id}:${local.sns_topic_name}"
}

# Now the IAM policy is clean and easy to read
resource "aws_iam_policy" "app" {
  name = "${var.project}-${var.environment}-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject"]
        Resource = [local.s3_objects_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [local.kms_key_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [local.sns_topic_arn]
      }
    ]
  })
}
```

Without locals, that policy document would be full of inline string interpolations that make it hard to spot mistakes.

## Simplifying Data Transformations

Terraform's `for` expressions are powerful but can be difficult to parse when embedded directly in resource arguments. Locals give these transformations a name.

```hcl
variable "users" {
  description = "Map of users and their roles"
  type = map(object({
    email = string
    role  = string
    teams = list(string)
  }))
}

locals {
  # Extract just the admin users
  admin_users = {
    for name, user in var.users : name => user
    if user.role == "admin"
  }

  # Build a flat list of all team memberships
  team_memberships = flatten([
    for name, user in var.users : [
      for team in user.teams : {
        user_name = name
        team_name = team
        email     = user.email
      }
    ]
  ])

  # Create a map keyed by "user-team" for use with for_each
  team_membership_map = {
    for membership in local.team_memberships :
    "${membership.user_name}-${membership.team_name}" => membership
  }
}

# Create admin IAM users
resource "aws_iam_user" "admins" {
  for_each = local.admin_users
  name     = each.key

  tags = {
    Email = each.value.email
    Role  = each.value.role
  }
}

# Create team group memberships
resource "aws_iam_group_membership" "teams" {
  for_each = local.team_membership_map

  name  = each.key
  group = each.value.team_name
  users = [each.value.user_name]
}
```

Each transformation step has a clear name. If something goes wrong, you can output individual locals to debug them.

## Simplifying Merge and Lookup Chains

When you merge multiple maps or chain lookups, locals prevent the nesting from getting out of hand.

```hcl
locals {
  # Start with default settings
  default_alb_config = {
    internal            = false
    idle_timeout        = 60
    deletion_protection = false
    access_logs_enabled = false
  }

  # Environment-specific overrides
  env_alb_overrides = {
    production = {
      idle_timeout        = 120
      deletion_protection = true
      access_logs_enabled = true
    }
    staging = {
      idle_timeout = 90
    }
  }

  # Merge defaults with environment overrides
  alb_config = merge(
    local.default_alb_config,
    lookup(local.env_alb_overrides, var.environment, {})
  )
}

resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = local.alb_config.internal
  load_balancer_type = "application"
  idle_timeout       = local.alb_config.idle_timeout

  enable_deletion_protection = local.alb_config.deletion_protection
}
```

## When Not to Use Locals for Simplification

Not every expression needs a local. Here are cases where inline is fine:

```hcl
# Simple reference - no need for a local
resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id  # Just use the reference directly
}

# Simple conditional - readable enough inline
resource "aws_instance" "app" {
  monitoring = var.environment == "production" ? true : false
}

# Single-use value - a local just adds indirection
resource "aws_s3_bucket" "logs" {
  bucket = "${var.project}-logs"  # Only used once, keep it inline
}
```

The rule of thumb: if an expression is used more than once, or if it is complex enough that you need to pause and think about what it does, put it in a local. Otherwise, leave it inline.

## Summary

Locals are your primary tool for managing complexity in Terraform configurations. Use them to replace nested conditionals with map lookups, break long string constructions into steps, name data transformations for clarity, and separate merge logic from resource definitions. The goal is always the same - make each resource block easy to read at a glance so that anyone on your team can understand what is being provisioned without decoding complex expressions.

For more on local values, see our guide on [defining local values in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-define-local-values-in-terraform/view).
