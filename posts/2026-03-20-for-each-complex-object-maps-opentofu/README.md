# How to Use for_each with Complex Object Maps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, for_each, Object, Map, HCL, Advanced

Description: Learn how to use for_each with maps of complex objects in OpenTofu to create richly configured resources with per-instance settings from structured variable data.

## Introduction

When resources need significantly different configuration per instance, a map of complex objects is the right data structure. Each map entry becomes one resource instance, with `each.value` giving access to all the nested configuration for that instance.

## Complex Object Map with Nested Objects

```hcl
variable "microservices" {
  description = "Complete configuration for each microservice"
  type = map(object({
    image_tag      = string
    cpu            = number
    memory         = number
    desired_count  = number
    port           = number
    health_path    = string
    public         = bool
    environment_vars = map(string)
    secrets = list(object({
      name      = string
      ssm_path  = string
    }))
    autoscaling = object({
      enabled       = bool
      min_capacity  = number
      max_capacity  = number
      cpu_target    = number
    })
  }))
}

resource "aws_ecs_service" "services" {
  for_each = var.microservices

  name            = each.key
  cluster         = var.ecs_cluster_arn
  launch_type     = "FARGATE"
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired_count

  load_balancer {
    target_group_arn = aws_lb_target_group.services[each.key].arn
    container_name   = each.key
    container_port   = each.value.port
  }

  network_configuration {
    subnets         = each.value.public ? var.public_subnet_ids : var.private_subnet_ids
    security_groups = [aws_security_group.services[each.key].id]
    assign_public_ip = each.value.public
  }
}

resource "aws_appautoscaling_target" "services" {
  for_each = {
    for name, svc in var.microservices : name => svc
    if svc.autoscaling.enabled
  }

  service_namespace  = "ecs"
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = each.value.autoscaling.min_capacity
  max_capacity       = each.value.autoscaling.max_capacity
}
```

## Nested Resource Creation from Object Map

```hcl
variable "databases" {
  type = map(object({
    engine         = string
    engine_version = string
    parameter_group_family = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
    read_replicas  = number
    parameters = list(object({
      name         = string
      value        = string
      apply_method = string
    }))
  }))
}

resource "aws_db_instance" "databases" {
  for_each = var.databases

  identifier     = "db-${each.key}"
  engine         = each.value.engine
  engine_version = each.value.engine_version
  instance_class = each.value.instance_class
  allocated_storage = each.value.storage_gb
  multi_az       = each.value.multi_az
  parameter_group_name = aws_db_parameter_group.databases[each.key].name

  username = var.db_username
  password = var.db_password
}

resource "aws_db_parameter_group" "databases" {
  for_each = var.databases

  name   = "pg-${each.key}"
  family = each.value.parameter_group_family

  dynamic "parameter" {
    for_each = each.value.parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }
}
```

## Accessing Deeply Nested Values

```hcl
locals {
  # Extract just the autoscaling configs for services that have it enabled
  autoscaling_configs = {
    for name, svc in var.microservices :
    name => svc.autoscaling
    if svc.autoscaling.enabled
  }
}

output "service_endpoints" {
  value = {
    for name, svc in var.microservices :
    name => "${name}.${var.domain}:${svc.port}"
    if svc.public
  }
}
```

## Conclusion

Maps of complex objects are the most powerful `for_each` pattern. They allow per-resource configuration that goes far beyond simple attribute differences. Keep object schemas well-defined with clear types to catch configuration errors at plan time rather than apply time. Use nested `dynamic` blocks to handle the variable-length lists within each object.
