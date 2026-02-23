# How to Use Dynamic Blocks for Repeating Nested Blocks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, HCL, Infrastructure as Code, DRY

Description: Learn how to use Terraform dynamic blocks to generate repeating nested configuration blocks from variables and data structures.

---

Terraform resources often require nested blocks - things like ingress rules in a security group, settings in a load balancer, or tags in an auto scaling group. When you need multiple instances of the same nested block, writing them out by hand gets repetitive and hard to maintain. Dynamic blocks solve this by generating nested blocks from a data structure, keeping your configuration clean and driven by data rather than copy-paste.

## The Problem Dynamic Blocks Solve

Consider a security group with multiple ingress rules. Without dynamic blocks, you write each rule as a separate block:

```hcl
# Without dynamic blocks - repetitive and hard to maintain
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "SSH from internal"
  }

  # Adding a new rule means adding another block
  # Removing a rule means deleting a block
  # No way to conditionally include rules
}
```

With dynamic blocks, the rules come from a variable:

```hcl
# With dynamic blocks - data-driven and maintainable
variable "ingress_rules" {
  description = "List of ingress rules"
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    },
    {
      port        = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "SSH from internal"
    }
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  # Generate one ingress block for each rule in the variable
  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
}
```

## How Dynamic Blocks Work

A dynamic block has three parts:

1. The label after `dynamic` - this is the name of the nested block to generate (e.g., "ingress")
2. `for_each` - the collection to iterate over
3. `content` - the template for each generated block

```hcl
dynamic "BLOCK_NAME" {
  for_each = COLLECTION

  content {
    # Use BLOCK_NAME.value to access the current item
    # Use BLOCK_NAME.key to access the current key/index
    attribute = BLOCK_NAME.value.some_field
  }
}
```

The iterator variable defaults to the block name. You can change it with the `iterator` argument:

```hcl
dynamic "ingress" {
  for_each = var.rules
  iterator = rule  # Use "rule" instead of "ingress" inside content

  content {
    from_port = rule.value.port
    to_port   = rule.value.port
    protocol  = rule.value.protocol
  }
}
```

## Using Maps with Dynamic Blocks

Maps give you named entries, which can make your configuration more readable:

```hcl
variable "listeners" {
  description = "ALB listener configurations"
  type = map(object({
    port            = number
    protocol        = string
    certificate_arn = optional(string)
    default_action  = string
  }))
  default = {
    http = {
      port           = 80
      protocol       = "HTTP"
      default_action = "redirect"
    }
    https = {
      port            = 443
      protocol        = "HTTPS"
      certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc-123"
      default_action  = "forward"
    }
  }
}

resource "aws_lb" "main" {
  name               = "main-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
}

# Generate a listener for each entry in the map
resource "aws_lb_listener" "main" {
  for_each = var.listeners

  load_balancer_arn = aws_lb.main.arn
  port              = each.value.port
  protocol          = each.value.protocol
  certificate_arn   = each.value.certificate_arn

  default_action {
    type             = each.value.default_action
    target_group_arn = each.value.default_action == "forward" ? aws_lb_target_group.main.arn : null

    dynamic "redirect" {
      for_each = each.value.default_action == "redirect" ? [1] : []

      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}
```

## Nested Dynamic Blocks

You can nest dynamic blocks inside other dynamic blocks when dealing with multi-level nested structures:

```hcl
variable "storage_configs" {
  description = "ECS task storage configurations"
  type = list(object({
    name = string
    volumes = list(object({
      name      = string
      host_path = optional(string)
      efs_config = optional(object({
        file_system_id = string
        root_directory = optional(string, "/")
      }))
    }))
  }))
}

resource "aws_ecs_task_definition" "app" {
  family = "app"

  # Outer dynamic block for volumes
  dynamic "volume" {
    for_each = flatten([
      for config in var.storage_configs : config.volumes
    ])

    content {
      name      = volume.value.name
      host_path = volume.value.host_path

      # Nested dynamic block for EFS configuration
      dynamic "efs_volume_configuration" {
        for_each = volume.value.efs_config != null ? [volume.value.efs_config] : []

        content {
          file_system_id = efs_volume_configuration.value.file_system_id
          root_directory = efs_volume_configuration.value.root_directory
        }
      }
    }
  }

  container_definitions = jsonencode([])
}
```

## Conditional Dynamic Blocks

Sometimes you want a nested block to appear only under certain conditions. Use an empty collection to skip it:

```hcl
variable "enable_logging" {
  description = "Whether to enable access logging"
  type        = bool
  default     = true
}

variable "log_bucket" {
  description = "S3 bucket for access logs"
  type        = string
  default     = ""
}

resource "aws_lb" "main" {
  name               = "main-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id

  # This block only appears if logging is enabled
  dynamic "access_logs" {
    for_each = var.enable_logging && var.log_bucket != "" ? [1] : []

    content {
      bucket  = var.log_bucket
      prefix  = "alb-logs"
      enabled = true
    }
  }
}
```

## Transforming Data for Dynamic Blocks

Often your input data does not match the exact structure the dynamic block needs. Use locals to transform it:

```hcl
variable "port_ranges" {
  description = "Port ranges to allow"
  type = list(object({
    from = number
    to   = number
  }))
  default = [
    { from = 80, to = 80 },
    { from = 443, to = 443 },
    { from = 8000, to = 8100 }
  ]
}

locals {
  # Transform port ranges into full rule objects
  ingress_rules = [
    for range in var.port_ranges : {
      from_port   = range.from
      to_port     = range.to
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Ports ${range.from}-${range.to}"
    }
  ]
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.ingress_rules

    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
}
```

## Real-World Example: AWS WAF Rules

WAF rules are a perfect use case for dynamic blocks because they have deeply nested structures:

```hcl
variable "waf_ip_rules" {
  description = "IP-based WAF rules"
  type = list(object({
    name     = string
    priority = number
    action   = string
    ip_set_arn = string
  }))
  default = [
    {
      name       = "block-known-bad-ips"
      priority   = 1
      action     = "block"
      ip_set_arn = "arn:aws:wafv2:us-east-1:123456789:regional/ipset/bad-ips/abc123"
    },
    {
      name       = "allow-office-ips"
      priority   = 2
      action     = "allow"
      ip_set_arn = "arn:aws:wafv2:us-east-1:123456789:regional/ipset/office-ips/def456"
    }
  ]
}

resource "aws_wafv2_web_acl" "main" {
  name  = "main-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Generate a rule for each IP rule
  dynamic "rule" {
    for_each = var.waf_ip_rules

    content {
      name     = rule.value.name
      priority = rule.value.priority

      action {
        dynamic "allow" {
          for_each = rule.value.action == "allow" ? [1] : []
          content {}
        }
        dynamic "block" {
          for_each = rule.value.action == "block" ? [1] : []
          content {}
        }
      }

      statement {
        ip_set_reference_statement {
          arn = rule.value.ip_set_arn
        }
      }

      visibility_config {
        sampled_requests_enabled   = true
        cloudwatch_metrics_enabled = true
        metric_name                = rule.value.name
      }
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "main-waf"
  }
}
```

## When Not to Use Dynamic Blocks

Dynamic blocks add complexity. If you only have two or three instances of a nested block and they are unlikely to change, writing them out explicitly is simpler and easier to read. Use dynamic blocks when:

- The number of blocks varies based on input
- You have more than a handful of similar blocks
- The blocks need to be configurable per environment
- You want to keep configuration DRY

## Summary

Dynamic blocks turn repetitive nested configurations into data-driven templates. Define your data in variables or locals, then let the dynamic block generate the nested blocks. This approach scales better, is easier to maintain, and makes your configuration adaptable to different environments. For more specific examples, check out our posts on [dynamic blocks for security group rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-security-group-rules/view) and [dynamic blocks with for_each](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-with-for-each-in-terraform/view).
