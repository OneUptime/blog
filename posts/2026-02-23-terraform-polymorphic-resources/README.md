# How to Handle Polymorphic Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Design Pattern, Dynamic Blocks, Modules, Infrastructure as Code

Description: Learn how to handle polymorphic resources in Terraform where the same logical concept maps to different resource types or configurations based on input parameters.

---

Polymorphism in programming means one interface, many implementations. In Terraform, you hit this when the same logical concept - say, "a database" or "a notification channel" - maps to different resource types depending on the situation. A database might be RDS PostgreSQL, Aurora, or DynamoDB. A notification channel might be Slack, email, or PagerDuty. Your configuration needs to handle these variations cleanly.

This guide covers practical patterns for handling polymorphic resources without creating a mess of conditional blocks.

## The Problem

Say you have a module that deploys an application, and it needs a database. But different applications need different database types:

```hcl
# This is what we want to avoid - separate resources with conditions everywhere
resource "aws_db_instance" "rds" {
  count = var.database_type == "rds" ? 1 : 0
  # ... rds config
}

resource "aws_dynamodb_table" "dynamo" {
  count = var.database_type == "dynamodb" ? 1 : 0
  # ... dynamodb config
}

resource "aws_elasticache_replication_group" "redis" {
  count = var.database_type == "redis" ? 1 : 0
  # ... redis config
}

# Then every consumer needs conditional references
locals {
  db_endpoint = (
    var.database_type == "rds" ? aws_db_instance.rds[0].endpoint :
    var.database_type == "dynamodb" ? aws_dynamodb_table.dynamo[0].id :
    aws_elasticache_replication_group.redis[0].primary_endpoint_address
  )
}
```

This gets unmanageable quickly. Each new database type adds more conditionals throughout the codebase.

## Pattern 1: Type-Specific Modules with a Common Interface

Create separate modules for each variant, all sharing the same output interface:

```hcl
# modules/database/rds/outputs.tf
output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "port" {
  value = aws_db_instance.main.port
}

output "connection_string" {
  value = "postgresql://${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${var.database_name}"
}

output "type" {
  value = "rds"
}
```

```hcl
# modules/database/dynamodb/outputs.tf
output "endpoint" {
  # DynamoDB does not have a traditional endpoint
  value = aws_dynamodb_table.main.id
}

output "port" {
  value = 443
}

output "connection_string" {
  value = "dynamodb://${data.aws_region.current.name}/${aws_dynamodb_table.main.id}"
}

output "type" {
  value = "dynamodb"
}
```

```hcl
# modules/database/redis/outputs.tf
output "endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  value = aws_elasticache_replication_group.main.port
}

output "connection_string" {
  value = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
}

output "type" {
  value = "redis"
}
```

Now the root module selects the right implementation:

```hcl
# main.tf

module "database_rds" {
  source = "./modules/database/rds"
  count  = var.database_type == "rds" ? 1 : 0

  name          = var.app_name
  instance_class = var.db_instance_class
  engine_version = var.db_engine_version
  vpc_id        = var.vpc_id
  subnet_ids    = var.subnet_ids
}

module "database_dynamodb" {
  source = "./modules/database/dynamodb"
  count  = var.database_type == "dynamodb" ? 1 : 0

  table_name = var.app_name
  hash_key   = var.dynamodb_hash_key
}

module "database_redis" {
  source = "./modules/database/redis"
  count  = var.database_type == "redis" ? 1 : 0

  name       = var.app_name
  node_type  = var.redis_node_type
  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids
}

# Single output regardless of type
locals {
  database = (
    var.database_type == "rds" ? module.database_rds[0] :
    var.database_type == "dynamodb" ? module.database_dynamodb[0] :
    module.database_redis[0]
  )
}

output "database_endpoint" {
  value = local.database.endpoint
}

output "database_connection_string" {
  value = local.database.connection_string
}
```

The conditional logic exists in exactly one place - the module selection in the root. Consumers just use `local.database.endpoint` without caring about the type.

## Pattern 2: The Dispatcher Module

Wrap the type selection inside a single module that dispatches to the right implementation:

```hcl
# modules/database/variables.tf

variable "type" {
  description = "Database type: rds, dynamodb, or redis"
  type        = string

  validation {
    condition     = contains(["rds", "dynamodb", "redis"], var.type)
    error_message = "Database type must be rds, dynamodb, or redis."
  }
}

variable "name" {
  type = string
}

# Type-specific variables with defaults
variable "rds_config" {
  type = object({
    instance_class = string
    engine         = string
    engine_version = string
  })
  default = null
}

variable "dynamodb_config" {
  type = object({
    hash_key  = string
    range_key = optional(string)
    billing_mode = optional(string, "PAY_PER_REQUEST")
  })
  default = null
}

variable "redis_config" {
  type = object({
    node_type       = string
    num_cache_nodes = optional(number, 1)
  })
  default = null
}
```

```hcl
# modules/database/main.tf

module "rds" {
  source = "./rds"
  count  = var.type == "rds" ? 1 : 0

  name           = var.name
  instance_class = var.rds_config.instance_class
  engine         = var.rds_config.engine
  engine_version = var.rds_config.engine_version
}

module "dynamodb" {
  source = "./dynamodb"
  count  = var.type == "dynamodb" ? 1 : 0

  table_name = var.name
  hash_key   = var.dynamodb_config.hash_key
  range_key  = var.dynamodb_config.range_key
}

module "redis" {
  source = "./redis"
  count  = var.type == "redis" ? 1 : 0

  name      = var.name
  node_type = var.redis_config.node_type
}

locals {
  # Unified output from whichever module was created
  result = (
    var.type == "rds" ? {
      endpoint          = module.rds[0].endpoint
      port              = module.rds[0].port
      connection_string = module.rds[0].connection_string
    } :
    var.type == "dynamodb" ? {
      endpoint          = module.dynamodb[0].endpoint
      port              = module.dynamodb[0].port
      connection_string = module.dynamodb[0].connection_string
    } : {
      endpoint          = module.redis[0].endpoint
      port              = module.redis[0].port
      connection_string = module.redis[0].connection_string
    }
  )
}

output "endpoint" {
  value = local.result.endpoint
}

output "port" {
  value = local.result.port
}

output "connection_string" {
  value = local.result.connection_string
}
```

Now the caller just uses one module:

```hcl
module "database" {
  source = "./modules/database"

  type = "rds"
  name = "myapp"

  rds_config = {
    instance_class = "db.t3.medium"
    engine         = "postgres"
    engine_version = "15"
  }
}

# Clean, single reference
resource "aws_ssm_parameter" "db_url" {
  name  = "/myapp/database_url"
  type  = "SecureString"
  value = module.database.connection_string
}
```

## Pattern 3: Dynamic Blocks for Polymorphic Attributes

Sometimes polymorphism exists within a single resource type. For example, an AWS CloudWatch alarm can monitor different metrics:

```hcl
variable "alarms" {
  description = "Map of alarms to create"
  type = map(object({
    metric_type = string   # "cpu", "memory", "disk", "custom"
    threshold   = number
    period      = optional(number, 300)
    namespace   = optional(string)
    metric_name = optional(string)
    dimensions  = optional(map(string), {})
  }))
}

locals {
  # Map metric types to their actual CloudWatch definitions
  metric_definitions = {
    cpu = {
      namespace   = "AWS/EC2"
      metric_name = "CPUUtilization"
    }
    memory = {
      namespace   = "CWAgent"
      metric_name = "mem_used_percent"
    }
    disk = {
      namespace   = "CWAgent"
      metric_name = "disk_used_percent"
    }
  }

  # Resolve the actual metric for each alarm
  resolved_alarms = {
    for name, alarm in var.alarms : name => {
      namespace   = alarm.metric_type == "custom" ? alarm.namespace : local.metric_definitions[alarm.metric_type].namespace
      metric_name = alarm.metric_type == "custom" ? alarm.metric_name : local.metric_definitions[alarm.metric_type].metric_name
      threshold   = alarm.threshold
      period      = alarm.period
      dimensions  = alarm.dimensions
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "alarms" {
  for_each = local.resolved_alarms

  alarm_name          = "${var.app_name}-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = "Average"
  threshold           = each.value.threshold
  alarm_actions       = [var.sns_topic_arn]

  dimensions = each.value.dimensions
}
```

## Pattern 4: Notification Channels

A practical example where polymorphism shows up frequently - notification routing:

```hcl
variable "notification_channels" {
  type = map(object({
    type    = string  # "slack", "email", "pagerduty", "webhook"
    target  = string  # channel URL, email address, service key, or webhook URL
  }))
}

# SNS topics for email notifications
resource "aws_sns_topic" "email" {
  for_each = {
    for name, channel in var.notification_channels :
    name => channel if channel.type == "email"
  }

  name = "notify-${each.key}"
}

resource "aws_sns_topic_subscription" "email" {
  for_each = {
    for name, channel in var.notification_channels :
    name => channel if channel.type == "email"
  }

  topic_arn = aws_sns_topic.email[each.key].arn
  protocol  = "email"
  endpoint  = each.value.target
}

# Chatbot for Slack notifications
resource "aws_chatbot_slack_channel_configuration" "slack" {
  for_each = {
    for name, channel in var.notification_channels :
    name => channel if channel.type == "slack"
  }

  configuration_name = "notify-${each.key}"
  slack_channel_id   = each.value.target
  slack_team_id      = var.slack_team_id
  iam_role_arn       = aws_iam_role.chatbot.arn
  sns_topic_arns     = [aws_sns_topic.slack[each.key].arn]
}
```

## Tips for Polymorphic Patterns

1. Always define a consistent output interface. Every variant should expose the same set of outputs, even if some values are not meaningful for that type.

2. Use validation blocks to restrict the type variable to known values. This catches configuration errors early.

3. Keep type-specific configuration in dedicated variables (like `rds_config`, `dynamodb_config`) rather than cramming everything into one variable. This makes it clear which fields apply to which type.

4. Document the available types and their required configuration in variable descriptions.

5. Consider whether you actually need polymorphism. If you only have two types and they are unlikely to grow, separate resources with simple conditions might be clearer than an elaborate pattern.

## Wrapping Up

Polymorphic resources in Terraform require explicit patterns because HCL does not have built-in polymorphism. The dispatcher module pattern is the cleanest approach for most cases - it centralizes the type selection logic and presents a uniform interface to consumers. For simpler cases, type-specific modules with shared output contracts work well. The key is keeping the conditional logic contained rather than letting it spread across your entire configuration. Pick a pattern, commit to it, and your polymorphic resources will stay manageable as the number of variants grows.
