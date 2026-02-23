# How to Use Dynamic Blocks with Nested Objects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Nested Objects, HCL, Data Structures, Infrastructure as Code

Description: Learn how to work with nested object variables and dynamic blocks in Terraform for resources that need hierarchical configuration structures.

---

Many Terraform resources have nested block structures that map to hierarchical data. When your input variables contain nested objects - objects within objects, lists of objects within objects - you need to understand how to thread that data through dynamic blocks correctly.

## Understanding the Data Shape

Before writing dynamic blocks, you need to understand what shape your data takes and what shape the resource expects. Consider an ECS service with multiple containers, each having their own environment variables and port mappings:

```hcl
variable "containers" {
  type = list(object({
    name      = string
    image     = string
    cpu       = number
    memory    = number
    essential = bool
    ports = list(object({
      container_port = number
      host_port      = number
      protocol       = string
    }))
    environment = map(string)
    mount_points = list(object({
      source_volume  = string
      container_path = string
      read_only      = bool
    }))
  }))
}
```

This is three levels deep: the container list, the ports/mount_points lists within each container, and the individual fields within those lists.

## Accessing Nested Fields in Dynamic Blocks

When the iterator gives you a nested object, you access nested fields with dot notation:

```hcl
variable "alb_targets" {
  type = list(object({
    name = string
    target_group = object({
      port     = number
      protocol = string
      health_check = object({
        path     = string
        interval = number
        timeout  = number
      })
    })
  }))
}

resource "aws_lb_target_group" "main" {
  for_each = { for idx, target in var.alb_targets : target.name => target }

  name        = each.value.name
  port        = each.value.target_group.port
  protocol    = each.value.target_group.protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    # Accessing nested object fields through dot notation
    path     = each.value.target_group.health_check.path
    interval = each.value.target_group.health_check.interval
    timeout  = each.value.target_group.health_check.timeout
    matcher  = "200-299"
  }
}
```

## Dynamic Blocks with Lists of Nested Objects

When a nested field is a list of objects and maps to repeated blocks in the resource, use a dynamic block:

```hcl
variable "notification_configs" {
  type = list(object({
    name = string
    channels = list(object({
      type     = string  # "email", "slack", "pagerduty"
      endpoint = string
      severity = list(string)
    }))
    filters = list(object({
      field    = string
      operator = string
      value    = string
    }))
  }))
}

resource "aws_cloudwatch_metric_alarm" "alerts" {
  for_each = { for cfg in var.notification_configs : cfg.name => cfg }

  alarm_name          = each.value.name
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "Custom"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  # The channels list maps to alarm_actions
  alarm_actions = [
    for ch in each.value.channels : lookup(local.channel_arns, "${ch.type}-${ch.endpoint}", "")
  ]

  # Dynamic dimensions from the filters nested list
  dimensions = {
    for filter in each.value.filters : filter.field => filter.value
  }
}
```

## Flattening Nested Objects for Dynamic Blocks

Sometimes the nesting in your data does not match the nesting the resource expects. You need to flatten:

```hcl
variable "vpc_subnets" {
  type = map(object({
    cidr = string
    az   = string
    routes = list(object({
      destination = string
      target_type = string  # "igw", "nat", "transit"
      target_id   = string
    }))
    tags = map(string)
  }))
}

locals {
  # Flatten: each subnet-route combination becomes its own entry
  all_routes = flatten([
    for subnet_name, subnet in var.vpc_subnets : [
      for route_idx, route in subnet.routes : {
        key         = "${subnet_name}-route-${route_idx}"
        subnet_name = subnet_name
        destination = route.destination
        target_type = route.target_type
        target_id   = route.target_id
      }
    ]
  ])

  routes_by_key = { for r in local.all_routes : r.key => r }
}

# Create a route for each flattened entry
resource "aws_route" "custom" {
  for_each = local.routes_by_key

  route_table_id         = aws_route_table.subnets[each.value.subnet_name].id
  destination_cidr_block = each.value.destination

  gateway_id         = each.value.target_type == "igw" ? each.value.target_id : null
  nat_gateway_id     = each.value.target_type == "nat" ? each.value.target_id : null
  transit_gateway_id = each.value.target_type == "transit" ? each.value.target_id : null
}
```

## Nested Objects with Optional Fields

When nested objects have optional fields, use the `optional()` type modifier and handle nulls inside the dynamic block:

```hcl
variable "databases" {
  type = list(object({
    name           = string
    engine         = string
    engine_version = string
    instance_class = string

    # Optional nested configuration
    backup = optional(object({
      retention_period = number
      window           = string
    }))

    monitoring = optional(object({
      interval = number
      role_arn = string
    }))

    encryption = optional(object({
      enabled   = bool
      kms_key_id = string
    }))
  }))
}

resource "aws_db_instance" "main" {
  for_each = { for db in var.databases : db.name => db }

  identifier     = each.value.name
  engine         = each.value.engine
  engine_version = each.value.engine_version
  instance_class = each.value.instance_class

  # Backup settings from nested object, with defaults
  backup_retention_period = each.value.backup != null ? each.value.backup.retention_period : 0
  backup_window           = each.value.backup != null ? each.value.backup.window : null

  # Monitoring from nested object
  monitoring_interval = each.value.monitoring != null ? each.value.monitoring.interval : 0
  monitoring_role_arn = each.value.monitoring != null ? each.value.monitoring.role_arn : null

  # Encryption from nested object
  storage_encrypted = each.value.encryption != null ? each.value.encryption.enabled : false
  kms_key_id        = each.value.encryption != null ? each.value.encryption.kms_key_id : null
}
```

## Deep Nesting - Three Levels and Beyond

When data is deeply nested, locals become essential. Consider a multi-tier application configuration:

```hcl
variable "application" {
  type = object({
    name = string
    tiers = list(object({
      name = string
      instances = list(object({
        size  = string
        az    = string
        disks = list(object({
          size = number
          type = string
          mount = string
        }))
      }))
    }))
  })
}

locals {
  # Flatten three levels into a single map for resource creation
  all_instances = {
    for item in flatten([
      for tier in var.application.tiers : [
        for inst_idx, inst in tier.instances : {
          key   = "${tier.name}-${inst_idx}"
          tier  = tier.name
          size  = inst.size
          az    = inst.az
          disks = inst.disks
        }
      ]
    ]) : item.key => item
  }

  # Further flatten for EBS volumes
  all_disks = {
    for item in flatten([
      for inst_key, inst in local.all_instances : [
        for disk_idx, disk in inst.disks : {
          key       = "${inst_key}-disk-${disk_idx}"
          inst_key  = inst_key
          size      = disk.size
          type      = disk.type
          mount     = disk.mount
          az        = inst.az
        }
      ]
    ]) : item.key => item
  }
}

# Create instances
resource "aws_instance" "app" {
  for_each = local.all_instances

  ami               = var.ami_id
  instance_type     = each.value.size
  availability_zone = each.value.az
  subnet_id         = var.subnet_ids[each.value.az]

  tags = {
    Name = "${var.application.name}-${each.key}"
    Tier = each.value.tier
  }
}

# Create EBS volumes
resource "aws_ebs_volume" "disks" {
  for_each = local.all_disks

  availability_zone = each.value.az
  size              = each.value.size
  type              = each.value.type

  tags = {
    Name       = each.key
    MountPoint = each.value.mount
    Instance   = each.value.inst_key
  }
}

# Attach volumes to instances
resource "aws_volume_attachment" "disks" {
  for_each = local.all_disks

  device_name = each.value.mount
  volume_id   = aws_ebs_volume.disks[each.key].id
  instance_id = aws_instance.app[each.value.inst_key].id
}
```

## Using try() for Safe Nested Access

When accessing deeply nested optional fields, `try()` prevents errors if intermediate levels are null:

```hcl
dynamic "health_check" {
  for_each = try(each.value.target_group.health_check, null) != null ? [each.value.target_group.health_check] : []
  content {
    path     = try(health_check.value.path, "/")
    interval = try(health_check.value.interval, 30)
    timeout  = try(health_check.value.timeout, 5)
    matcher  = try(health_check.value.matcher, "200")
  }
}
```

## Summary

Working with nested objects in dynamic blocks requires understanding the data shape at each level and knowing when to flatten. The key patterns are: dot notation for accessing nested fields, `flatten()` with nested `for` expressions to convert deep hierarchies into flat maps, `optional()` type constraints for fields that might not exist, and `try()` for safe access to potentially null intermediate levels. For more on preprocessing data for dynamic blocks, see our post on [simplifying complex dynamic blocks with locals](https://oneuptime.com/blog/post/2026-02-23-how-to-simplify-complex-dynamic-blocks-with-locals/view).
