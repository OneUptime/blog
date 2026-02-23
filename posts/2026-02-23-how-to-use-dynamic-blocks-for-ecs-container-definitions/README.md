# How to Use Dynamic Blocks for ECS Container Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, ECS, AWS, Containers, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to build flexible ECS task definitions with variable-driven container configurations.

---

ECS task definitions have some of the most complex nested configurations in AWS Terraform. Each task can have multiple containers, and each container has its own ports, environment variables, volumes, log configuration, and health checks. Dynamic blocks help you manage this complexity by generating container configurations from structured data rather than repeating blocks.

## The Structure of ECS Task Definitions

An ECS task definition in Terraform uses `container_definitions` as a JSON-encoded string, but the task definition resource itself has several nested blocks that benefit from dynamic generation: volumes, placement constraints, and proxy configurations. Let me show you patterns for both approaches.

## Dynamic Container Definitions with jsonencode

The most flexible approach uses `jsonencode` with `for` expressions to build container definitions:

```hcl
variable "containers" {
  description = "Container definitions for the ECS task"
  type = map(object({
    image          = string
    cpu            = number
    memory         = number
    essential      = bool
    port_mappings  = optional(list(object({
      containerPort = number
      hostPort      = optional(number)
      protocol      = optional(string, "tcp")
    })), [])
    environment    = optional(map(string), {})
    secrets        = optional(map(string), {})
    health_check   = optional(object({
      command     = list(string)
      interval    = number
      timeout     = number
      retries     = number
      startPeriod = number
    }))
    mount_points   = optional(list(object({
      sourceVolume  = string
      containerPath = string
      readOnly      = optional(bool, false)
    })), [])
    depends_on_containers = optional(list(object({
      containerName = string
      condition     = string
    })), [])
    command        = optional(list(string))
  }))
}
```

Here is how you define containers using this variable:

```hcl
# terraform.tfvars or locals
containers = {
  app = {
    image     = "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest"
    cpu       = 512
    memory    = 1024
    essential = true
    port_mappings = [
      { containerPort = 8080 }
    ]
    environment = {
      NODE_ENV     = "production"
      PORT         = "8080"
      LOG_LEVEL    = "info"
    }
    secrets = {
      DATABASE_URL = "arn:aws:secretsmanager:us-east-1:123456789:secret:db-url"
      API_KEY      = "arn:aws:secretsmanager:us-east-1:123456789:secret:api-key"
    }
    health_check = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    mount_points = [
      {
        sourceVolume  = "app-data"
        containerPath = "/app/data"
      }
    ]
  }

  sidecar_logger = {
    image     = "123456789.dkr.ecr.us-east-1.amazonaws.com/log-agent:latest"
    cpu       = 128
    memory    = 256
    essential = false
    environment = {
      LOG_DESTINATION = "cloudwatch"
    }
    depends_on_containers = [
      {
        containerName = "app"
        condition     = "START"
      }
    ]
  }

  nginx = {
    image     = "nginx:1.25"
    cpu       = 256
    memory    = 512
    essential = true
    port_mappings = [
      { containerPort = 80 },
      { containerPort = 443 }
    ]
    depends_on_containers = [
      {
        containerName = "app"
        condition     = "HEALTHY"
      }
    ]
    mount_points = [
      {
        sourceVolume  = "nginx-config"
        containerPath = "/etc/nginx/conf.d"
        readOnly      = true
      }
    ]
  }
}
```

Now generate the task definition:

```hcl
# task_definition.tf
locals {
  # Build container definitions from the variable
  container_definitions = [
    for name, container in var.containers : merge(
      {
        name      = name
        image     = container.image
        cpu       = container.cpu
        memory    = container.memory
        essential = container.essential

        # Convert environment map to the format ECS expects
        environment = [
          for key, value in container.environment : {
            name  = key
            value = value
          }
        ]

        # Convert secrets map to the format ECS expects
        secrets = [
          for key, arn in container.secrets : {
            name      = key
            valueFrom = arn
          }
        ]

        # Port mappings
        portMappings = [
          for pm in container.port_mappings : {
            containerPort = pm.containerPort
            hostPort      = pm.hostPort != null ? pm.hostPort : pm.containerPort
            protocol      = pm.protocol
          }
        ]

        # Mount points
        mountPoints = container.mount_points

        # Container dependencies
        dependsOn = container.depends_on_containers

        # CloudWatch log configuration
        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = "/ecs/${terraform.workspace}/${name}"
            "awslogs-region"        = data.aws_region.current.name
            "awslogs-stream-prefix" = "ecs"
          }
        }
      },
      # Only include healthCheck if defined
      container.health_check != null ? {
        healthCheck = container.health_check
      } : {},
      # Only include command if defined
      container.command != null ? {
        command = container.command
      } : {}
    )
  ]
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${terraform.workspace}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = sum([for c in var.containers : c.cpu])
  memory                   = sum([for c in var.containers : c.memory])
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode(local.container_definitions)

  # Dynamic volume blocks
  dynamic "volume" {
    for_each = var.volumes

    content {
      name = volume.value.name

      dynamic "efs_volume_configuration" {
        for_each = volume.value.efs_config != null ? [volume.value.efs_config] : []

        content {
          file_system_id     = efs_volume_configuration.value.file_system_id
          root_directory     = efs_volume_configuration.value.root_directory
          transit_encryption = "ENABLED"
        }
      }
    }
  }

  tags = {
    Environment = terraform.workspace
  }
}
```

## Dynamic Volumes

Volumes on ECS task definitions are a perfect fit for dynamic blocks:

```hcl
variable "volumes" {
  description = "Volumes for the ECS task"
  type = list(object({
    name = string
    efs_config = optional(object({
      file_system_id = string
      root_directory = optional(string, "/")
    }))
    docker_volume_config = optional(object({
      scope         = optional(string, "task")
      driver        = optional(string, "local")
      driver_opts   = optional(map(string), {})
      labels        = optional(map(string), {})
    }))
  }))
  default = [
    {
      name = "app-data"
      efs_config = {
        file_system_id = "fs-abc123"
        root_directory = "/app-data"
      }
    },
    {
      name = "nginx-config"
      efs_config = {
        file_system_id = "fs-abc123"
        root_directory = "/nginx-config"
      }
    },
    {
      name = "tmp"
      # No EFS - this is a local docker volume
    }
  ]
}

resource "aws_ecs_task_definition" "with_volumes" {
  family                   = "${terraform.workspace}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode(local.container_definitions)

  # Generate volume blocks dynamically
  dynamic "volume" {
    for_each = var.volumes

    content {
      name = volume.value.name

      # EFS volume configuration (conditional)
      dynamic "efs_volume_configuration" {
        for_each = volume.value.efs_config != null ? [volume.value.efs_config] : []

        content {
          file_system_id     = efs_volume_configuration.value.file_system_id
          root_directory     = efs_volume_configuration.value.root_directory
          transit_encryption = "ENABLED"

          authorization_config {
            iam = "ENABLED"
          }
        }
      }

      # Docker volume configuration (conditional)
      dynamic "docker_volume_configuration" {
        for_each = volume.value.docker_volume_config != null ? [volume.value.docker_volume_config] : []

        content {
          scope         = docker_volume_configuration.value.scope
          driver        = docker_volume_configuration.value.driver
          driver_opts   = docker_volume_configuration.value.driver_opts
          labels        = docker_volume_configuration.value.labels
        }
      }
    }
  }
}
```

## Dynamic Placement Constraints

For EC2 launch type, you might need dynamic placement constraints:

```hcl
variable "placement_constraints" {
  description = "Placement constraints for ECS tasks"
  type = list(object({
    type       = string
    expression = optional(string)
  }))
  default = [
    {
      type       = "memberOf"
      expression = "attribute:ecs.instance-type =~ t3.*"
    }
  ]
}

resource "aws_ecs_task_definition" "with_placement" {
  family                   = "${terraform.workspace}-app"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]

  container_definitions = jsonencode(local.container_definitions)

  dynamic "placement_constraints" {
    for_each = var.placement_constraints

    content {
      type       = placement_constraints.value.type
      expression = placement_constraints.value.expression
    }
  }
}
```

## Creating Log Groups Dynamically

Each container needs a CloudWatch log group. Generate them from the same container variable:

```hcl
# Create a log group for each container
resource "aws_cloudwatch_log_group" "containers" {
  for_each = var.containers

  name              = "/ecs/${terraform.workspace}/${each.key}"
  retention_in_days = terraform.workspace == "prod" ? 90 : 14

  tags = {
    Container   = each.key
    Environment = terraform.workspace
  }
}
```

## Environment-Specific Container Configurations

Adjust container configurations per environment:

```hcl
locals {
  # Environment-specific overrides
  env_overrides = {
    dev = {
      app = {
        cpu    = 256
        memory = 512
        environment = {
          LOG_LEVEL    = "debug"
          ENABLE_TRACE = "true"
        }
      }
    }
    prod = {
      app = {
        cpu    = 1024
        memory = 2048
        environment = {
          LOG_LEVEL    = "warn"
          ENABLE_TRACE = "false"
        }
      }
    }
  }

  # Merge base config with environment overrides
  effective_containers = {
    for name, container in var.containers : name => merge(
      container,
      lookup(lookup(local.env_overrides, terraform.workspace, {}), name, {}),
      {
        environment = merge(
          container.environment,
          lookup(lookup(lookup(local.env_overrides, terraform.workspace, {}), name, {}), "environment", {})
        )
      }
    )
  }
}
```

## Complete ECS Service with Dynamic Blocks

Putting it all together with the ECS service:

```hcl
resource "aws_ecs_service" "app" {
  name            = "${terraform.workspace}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  # Dynamic load balancer configuration
  dynamic "load_balancer" {
    for_each = {
      for name, container in var.containers : name => container
      if length(container.port_mappings) > 0 && container.essential
    }

    content {
      target_group_arn = aws_lb_target_group.service[load_balancer.key].arn
      container_name   = load_balancer.key
      container_port   = load_balancer.value.port_mappings[0].containerPort
    }
  }

  # Dynamic service registries for service discovery
  dynamic "service_registries" {
    for_each = var.enable_service_discovery ? [1] : []

    content {
      registry_arn = aws_service_discovery_service.app.arn
    }
  }

  tags = {
    Environment = terraform.workspace
  }
}
```

## Summary

ECS container definitions are inherently complex, with multiple containers, volumes, port mappings, and environment variables that vary by deployment. Using dynamic blocks and `jsonencode` with `for` expressions lets you define all this configuration as structured data in variables, making it easy to adjust per environment and reuse across services. The pattern keeps your code DRY while giving you full control over every aspect of the task definition. For more dynamic block examples, see our post on [dynamic blocks for repeating nested blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-repeating-nested-blocks/view).
