# How to Use Terraform Dynamic Blocks for Repeated Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure, HCL

Description: Master Terraform dynamic blocks to generate repeated nested configuration like security group rules, IAM policies, and listener rules without code duplication.

---

Terraform resources often contain repeated nested blocks - security group ingress rules, IAM policy statements, load balancer listener rules, DynamoDB GSIs. Without dynamic blocks, you'd copy-paste the same block structure dozens of times, making your configurations long and hard to maintain.

Dynamic blocks solve this by generating nested blocks from a collection. Think of them as a `for` loop, but for configuration blocks instead of resources.

## The Problem

Consider a security group with multiple ingress rules. The static approach repeats the same structure.

```hcl
# Repetitive - each rule is a separate block

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Imagine 20 more rules...
}
```

This works but doesn't scale. Every new rule means another copy-pasted block.

## The Dynamic Block Solution

Dynamic blocks generate nested blocks from a variable or local value.

Note: The AWS provider currently recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for production security group rules. The inline rule examples here focus on showing how dynamic blocks generate repeatable nested blocks.

```hcl
# Define rules as data
variable "ingress_rules" {
  description = "List of ingress rules for the security group"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow HTTP"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow HTTPS"
    },
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "Allow SSH from internal"
    },
  ]
}

# Generate blocks dynamically
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

The `dynamic` block iterates over `var.ingress_rules` and generates one `ingress` block per item. The `ingress.value` inside `content` refers to the current item in the iteration.

## Anatomy of a Dynamic Block

Let's break down the syntax.

```hcl
dynamic "BLOCK_LABEL" {
  for_each = COLLECTION      # What to iterate over
  iterator = CUSTOM_NAME     # Optional: rename the iterator (defaults to BLOCK_LABEL)
  content {
    # Block content using CUSTOM_NAME.value or BLOCK_LABEL.value
    argument = CUSTOM_NAME.value.attribute
    # CUSTOM_NAME.key is the map key or list index
  }
}
```

The block label must match the nested block type you're generating. For an `ingress` block inside a security group, the label is `ingress`.

## Using Maps Instead of Lists

Maps give you named entries, which makes the configuration more readable.

```hcl
variable "ingress_rules" {
  type = map(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = {
    http = {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    https = {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    ssh = {
      port        = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
    }
  }
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = "Allow ${ingress.key}"  # Uses the map key as description
    }
  }
}
```

The `ingress.key` gives you the map key ("http", "https", "ssh"), which is useful for descriptions and naming.

## Conditional Dynamic Blocks

Generate blocks only when a condition is met by filtering the collection.

```hcl
variable "enable_ssh" {
  type    = bool
  default = false
}

locals {
  base_rules = {
    http = {
      port        = 80
      cidr_blocks = ["0.0.0.0/0"]
    }
    https = {
      port        = 443
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  ssh_rule = var.enable_ssh ? {
    ssh = {
      port        = 22
      cidr_blocks = ["10.0.0.0/8"]
    }
  } : {}

  # Merge base rules with conditional rules
  all_rules = merge(local.base_rules, local.ssh_rule)
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = local.all_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.key
    }
  }
}
```

## Real-World Examples

### IAM Policy with Dynamic Statements

```hcl
variable "s3_buckets" {
  description = "Map of bucket names to allowed actions"
  type = map(list(string))
  default = {
    "logs-bucket"   = ["s3:GetObject", "s3:ListBucket"]
    "assets-bucket" = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    "backup-bucket" = ["s3:GetObject"]
  }
}

data "aws_iam_policy_document" "s3_access" {
  dynamic "statement" {
    for_each = var.s3_buckets
    content {
      sid       = "Access${replace(title(statement.key), "-", "")}"
      effect    = "Allow"
      actions   = statement.value
      resources = [
        "arn:aws:s3:::${statement.key}",
        "arn:aws:s3:::${statement.key}/*",
      ]
    }
  }
}
```

### ALB Listener Rules

```hcl
variable "routing_rules" {
  type = map(object({
    priority     = number
    host_header  = string
    target_group = string
  }))
  default = {
    api = {
      priority     = 100
      host_header  = "api.example.com"
      target_group = "api-tg"
    }
    web = {
      priority     = 200
      host_header  = "www.example.com"
      target_group = "web-tg"
    }
  }
}

resource "aws_lb_listener_rule" "routing" {
  for_each = var.routing_rules

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.groups[each.value.target_group].arn
  }

  condition {
    host_header {
      values = [each.value.host_header]
    }
  }
}
```

### DynamoDB Global Secondary Indexes

```hcl
variable "gsi_config" {
  type = map(object({
    hash_key       = string
    range_key      = string
    projection_type = string
  }))
  default = {
    StatusIndex = {
      hash_key        = "status"
      range_key       = "createdAt"
      projection_type = "ALL"
    }
    EmailIndex = {
      hash_key        = "email"
      range_key       = ""
      projection_type = "KEYS_ONLY"
    }
  }
}

resource "aws_dynamodb_table" "main" {
  name         = "items"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Additional attributes needed by GSIs
  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  dynamic "global_secondary_index" {
    for_each = var.gsi_config
    content {
      name = global_secondary_index.key

      key_schema {
        attribute_name = global_secondary_index.value.hash_key
        key_type       = "HASH"
      }

      dynamic "key_schema" {
        for_each = global_secondary_index.value.range_key != "" ? [global_secondary_index.value.range_key] : []
        content {
          attribute_name = key_schema.value
          key_type       = "RANGE"
        }
      }

      projection_type = global_secondary_index.value.projection_type
    }
  }
}
```

## Nested Dynamic Blocks

You can nest dynamic blocks, though it gets harder to read quickly.

```hcl
resource "aws_lb_listener_rule" "advanced_routing" {
  for_each = var.advanced_routing_rules

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.groups[each.value.target_group].arn
  }

  dynamic "condition" {
    for_each = each.value.conditions
    content {
      dynamic "host_header" {
        for_each = condition.value.type == "host_header" ? [condition.value.values] : []
        content {
          values = host_header.value
        }
      }

      dynamic "path_pattern" {
        for_each = condition.value.type == "path_pattern" ? [condition.value.values] : []
        content {
          values = path_pattern.value
        }
      }
    }
  }
}
```

## When Not to Use Dynamic Blocks

Dynamic blocks add complexity. Don't use them when you have a fixed, small number of blocks that won't change. Three static ingress rules are easier to read than a dynamic block generating three rules.

Use dynamic blocks when:
- The number of blocks varies per environment
- You're building a reusable module where callers define the blocks
- You have more than 5-6 similar blocks

## Wrapping Up

Dynamic blocks turn data into configuration. Define your rules, policies, or settings as variables, and let dynamic blocks generate the repetitive HCL for you. They're especially powerful in modules where callers need to customize nested block counts. Just don't overuse them - readability matters more than DRY-ness for simple cases.

For more Terraform patterns, check out our guides on [local values and variables](https://oneuptime.com/blog/post/2026-02-12-terraform-local-values-and-variables/view) and [reusable modules](https://oneuptime.com/blog/post/2026-02-12-terraform-modules-for-reusable-aws-infrastructure/view).
