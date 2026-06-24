# How to Use Dynamic Blocks for Container Definitions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, ECS, Container, Dynamic Blocks, Fargate

Description: Learn how to use dynamic blocks in OpenTofu to build ECS task definition container definitions from structured variable data, supporting sidecars and multi-container tasks.

## Introduction

AWS ECS task definitions support multiple containers - the main application container plus sidecars like log collectors, service mesh proxies, and secret injectors. In OpenTofu, `container_definitions` is a JSON string, so the usual pattern is to build container definitions as native values and serialize them with `jsonencode` rather than maintain a hard-coded JSON blob. Dynamic blocks remain useful for repeatable nested resource blocks such as `volume`.

## Single Container with Dynamic Environment Variables

```hcl
variable "container_environment" {
  description = "Environment variables for the application container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "container_secrets" {
  description = "Secrets from Parameter Store or Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

locals {
  container_definition = {
    name      = "app"
    image     = "${var.ecr_repo_url}:${var.image_tag}"
    essential = true
    portMappings = [
      { containerPort = 8080, protocol = "tcp" }
    ]
    environment = var.container_environment
    secrets     = var.container_secrets
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.service_name}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  # Serialize the container definition to JSON
  container_definitions = jsonencode([local.container_definition])
}
```

## Multi-Container Task with Sidecar Pattern

Use a list of container definitions and `jsonencode` to support sidecars like Datadog, Envoy, or Fluent Bit.

```hcl
variable "sidecar_containers" {
  description = "Sidecar containers to run alongside the main application"
  type = list(object({
    name      = string
    image     = string
    essential = bool
    cpu       = number
    memory    = number
    environment = list(object({
      name  = string
      value = string
    }))
    mountPoints = list(object({
      sourceVolume  = string
      containerPath = string
    }))
  }))
  default = []
}

locals {
  main_container = {
    name      = var.service_name
    image     = "${var.ecr_repo_url}:${var.image_tag}"
    essential = true
    cpu       = var.app_cpu
    memory    = var.app_memory
    portMappings = [{ containerPort = var.app_port }]
    environment = var.app_environment
  }

  # Merge main container with any sidecars
  all_containers = concat([local.main_container], var.sidecar_containers)
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.total_cpu
  memory                   = var.total_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  # All containers are serialized together
  container_definitions = jsonencode(local.all_containers)

  dynamic "volume" {
    for_each = var.task_volumes
    content {
      name = volume.value.name
      efs_volume_configuration {
        file_system_id = volume.value.efs_id
      }
    }
  }
}
```

## Structured Port Mappings

For services that expose multiple ports, define port mappings as structured data. For Fargate tasks using `awsvpc`, only specify `containerPort`.

```hcl
variable "port_mappings" {
  type = list(object({
    containerPort = number
    protocol      = string
  }))
  default = [
    { containerPort = 8080, protocol = "tcp" },
    { containerPort = 8443, protocol = "tcp" }
  ]
}

locals {
  container_def = {
    name         = "app"
    image        = var.image
    essential    = true
    portMappings = var.port_mappings
  }
}
```

## Conclusion

Building ECS container definitions with structured data rather than static JSON strings makes your task definitions versionable, reviewable, and composable. The sidecar pattern is particularly powerful - define the base application container in your module, and let callers inject additional sidecars through variables without modifying the core module logic. Use `jsonencode` for `container_definitions` themselves, and reserve dynamic blocks for repeatable nested task definition blocks like `volume`.
