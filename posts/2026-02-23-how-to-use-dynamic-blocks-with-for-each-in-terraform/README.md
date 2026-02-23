# How to Use Dynamic Blocks with for_each in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, for_each, HCL, Infrastructure as Code

Description: Master the combination of dynamic blocks and for_each in Terraform to create flexible, data-driven infrastructure configurations.

---

Dynamic blocks and `for_each` are two of Terraform's most useful features, and they work together naturally. While `for_each` at the resource level creates multiple instances of a resource, `dynamic` blocks with `for_each` generate multiple nested blocks within a single resource. Understanding when to use each - and how to combine them - is key to writing clean, flexible Terraform code.

## for_each on Resources vs. Dynamic Blocks

Let me clarify the distinction first, because this is a common source of confusion.

**Resource-level for_each** creates multiple instances of a resource:

```hcl
# Creates one security group per entry in the map
resource "aws_security_group" "services" {
  for_each = {
    web = { port = 80 }
    api = { port = 8080 }
    db  = { port = 5432 }
  }

  name   = "${each.key}-sg"
  vpc_id = aws_vpc.main.id
}

# Result: aws_security_group.services["web"],
#         aws_security_group.services["api"],
#         aws_security_group.services["db"]
```

**Dynamic block for_each** creates multiple nested blocks within one resource:

```hcl
# Creates one security group with multiple ingress rules
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = [80, 443, 8080]

    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

## Combining Both: Resources with Dynamic Nested Blocks

The real power comes when you use both together. Each resource instance gets its own set of dynamic nested blocks:

```hcl
variable "service_configs" {
  description = "Configuration for each service's security group"
  type = map(object({
    description = string
    ingress_rules = list(object({
      port        = number
      protocol    = string
      cidr_blocks = list(string)
      description = string
    }))
    egress_rules = list(object({
      port        = number
      protocol    = string
      cidr_blocks = list(string)
      description = string
    }))
  }))
  default = {
    web = {
      description = "Web server security group"
      ingress_rules = [
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
        }
      ]
      egress_rules = [
        {
          port        = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
          description = "All outbound"
        }
      ]
    }
    api = {
      description = "API server security group"
      ingress_rules = [
        {
          port        = 8080
          protocol    = "tcp"
          cidr_blocks = ["10.0.0.0/8"]
          description = "API from internal"
        },
        {
          port        = 8443
          protocol    = "tcp"
          cidr_blocks = ["10.0.0.0/8"]
          description = "API TLS from internal"
        }
      ]
      egress_rules = [
        {
          port        = 443
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
          description = "HTTPS outbound"
        },
        {
          port        = 5432
          protocol    = "tcp"
          cidr_blocks = ["10.0.0.0/8"]
          description = "PostgreSQL"
        }
      ]
    }
  }
}

# One security group per service, each with its own rules
resource "aws_security_group" "service" {
  for_each = var.service_configs

  name        = "${each.key}-sg"
  description = each.value.description
  vpc_id      = aws_vpc.main.id

  # Dynamic ingress rules for this service
  dynamic "ingress" {
    for_each = each.value.ingress_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  # Dynamic egress rules for this service
  dynamic "egress" {
    for_each = each.value.egress_rules

    content {
      from_port   = egress.value.port
      to_port     = egress.value.port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  tags = {
    Name    = "${each.key}-sg"
    Service = each.key
  }
}
```

## Using for_each with Different Collection Types

### Lists

When using a list with `for_each` in a dynamic block, you get the index as the key:

```hcl
variable "notification_emails" {
  type    = list(string)
  default = ["ops@example.com", "dev@example.com", "security@example.com"]
}

resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "1000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # One notification block per email
  dynamic "notification" {
    for_each = var.notification_emails

    content {
      comparison_operator       = "GREATER_THAN"
      threshold                 = 80
      threshold_type            = "PERCENTAGE"
      notification_type         = "ACTUAL"
      subscriber_email_addresses = [notification.value]
    }
  }
}
```

### Maps

Maps are often better because you get meaningful keys:

```hcl
variable "alarm_configs" {
  description = "CloudWatch alarm configurations"
  type = map(object({
    metric_name         = string
    namespace           = string
    comparison_operator = string
    threshold           = number
    period              = number
    evaluation_periods  = number
    statistic           = string
  }))
  default = {
    high_cpu = {
      metric_name         = "CPUUtilization"
      namespace           = "AWS/EC2"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 80
      period              = 300
      evaluation_periods  = 2
      statistic           = "Average"
    }
    high_memory = {
      metric_name         = "MemoryUtilization"
      namespace           = "CWAgent"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 85
      period              = 300
      evaluation_periods  = 2
      statistic           = "Average"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "app" {
  for_each = var.alarm_configs

  alarm_name          = "${terraform.workspace}-${each.key}"
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold

  alarm_description = "Alarm for ${each.key} in ${terraform.workspace}"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}
```

### Sets

Convert lists to sets with `toset()` when you need unique values:

```hcl
variable "allowed_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "10.0.0.0/8"]
  # Note: "10.0.0.0/8" is duplicated
}

resource "aws_security_group" "internal" {
  name   = "internal-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    # toset removes duplicates
    for_each = toset(var.allowed_cidrs)

    content {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = [ingress.value]
      description = "Allow from ${ingress.value}"
    }
  }
}
```

## Using for Expressions Inside Dynamic Blocks

You can use `for` expressions to transform data before passing it to `for_each`:

```hcl
variable "services" {
  type = map(object({
    port     = number
    protocol = string
    public   = bool
  }))
  default = {
    web   = { port = 80, protocol = "tcp", public = true }
    api   = { port = 8080, protocol = "tcp", public = false }
    admin = { port = 9090, protocol = "tcp", public = false }
  }
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  # Only create ingress rules for public services
  dynamic "ingress" {
    for_each = {
      for name, config in var.services : name => config
      if config.public
    }

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ["0.0.0.0/0"]
      description = "${ingress.key} (public)"
    }
  }

  # Create internal-only rules for non-public services
  dynamic "ingress" {
    for_each = {
      for name, config in var.services : name => config
      if !config.public
    }

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ["10.0.0.0/8"]
      description = "${ingress.key} (internal only)"
    }
  }
}
```

## Flattening Nested Data for Dynamic Blocks

Sometimes your data is nested deeper than the dynamic block expects. Use `flatten` to restructure it:

```hcl
variable "route_tables" {
  description = "Route table configurations"
  type = map(list(object({
    cidr_block     = string
    gateway_id     = optional(string)
    nat_gateway_id = optional(string)
  })))
  default = {
    public = [
      { cidr_block = "0.0.0.0/0", gateway_id = "igw-abc123" }
    ]
    private = [
      { cidr_block = "0.0.0.0/0", nat_gateway_id = "nat-abc123" },
      { cidr_block = "10.1.0.0/16", gateway_id = "vgw-abc123" }
    ]
  }
}

locals {
  # Flatten the nested structure for use with for_each
  all_routes = flatten([
    for table_name, routes in var.route_tables : [
      for idx, route in routes : merge(route, {
        table_name = table_name
        route_key  = "${table_name}-${idx}"
      })
    ]
  ])
}

# Create routes using the flattened data
resource "aws_route" "all" {
  for_each = { for route in local.all_routes : route.route_key => route }

  route_table_id         = aws_route_table.main[each.value.table_name].id
  destination_cidr_block = each.value.cidr_block
  gateway_id             = each.value.gateway_id
  nat_gateway_id         = each.value.nat_gateway_id
}
```

## Debugging Dynamic Blocks

When dynamic blocks produce unexpected results, use `terraform console` to check your data:

```bash
# Start the Terraform console
terraform console

# Check what for_each will iterate over
> var.service_configs
> { for name, config in var.services : name => config if config.public }
> flatten([for table, routes in var.route_tables : [for r in routes : r]])
```

You can also use outputs to inspect what the dynamic block generates:

```hcl
# Debug output to see what the for_each would produce
output "debug_ingress_rules" {
  value = {
    for name, config in var.services : name => config
    if config.public
  }
}
```

## Summary

Dynamic blocks with `for_each` give you the ability to generate nested configuration from data structures. Use lists for ordered collections, maps for named entries, and `for` expressions to filter and transform data before it reaches the dynamic block. Combined with resource-level `for_each`, you can create highly flexible configurations that scale with your needs. For more practical examples, see our post on [dynamic blocks for security group rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-security-group-rules/view).
