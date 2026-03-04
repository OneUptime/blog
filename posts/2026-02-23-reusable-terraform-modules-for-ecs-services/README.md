# How to Create Reusable Terraform Modules for ECS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, ECS, Containers

Description: Build a reusable Terraform module for ECS Fargate services with task definitions, auto-scaling, load balancer integration, and CloudWatch logging.

---

Running containers on ECS involves a surprising amount of Terraform configuration. You need a task definition, a service, an IAM execution role, a task role, CloudWatch log groups, security groups, and optionally load balancer target group attachments and auto-scaling policies. Each new microservice needs all of these, and getting them right every time is challenging.

A reusable ECS service module packages all of this into a single module call that takes the essentials - container image, CPU, memory, and desired count - and handles the rest.

## Module Scope

This module focuses on ECS Fargate services. It creates:

- Task definition with container definitions
- ECS service with deployment configuration
- IAM execution role (for pulling images and writing logs)
- IAM task role (for application-level permissions)
- CloudWatch log group
- Optional ALB target group attachment
- Optional auto-scaling

It does not create the ECS cluster, VPC, ALB, or security groups. Those come from other modules.

## Module Structure

```text
modules/ecs-service/
  main.tf
  iam.tf
  autoscaling.tf
  variables.tf
  outputs.tf
  versions.tf
```

## Variables

```hcl
# modules/ecs-service/variables.tf

variable "name" {
  description = "Name of the ECS service"
  type        = string
}

variable "cluster_id" {
  description = "ECS cluster ID"
  type        = string
}

variable "container_image" {
  description = "Docker image for the container"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MB for the task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of running tasks"
  type        = number
  default     = 2
}

variable "subnet_ids" {
  description = "Subnet IDs for the tasks"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the tasks"
  type        = list(string)
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "Secrets from SSM or Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

# Load balancer integration
variable "target_group_arn" {
  description = "ALB target group ARN. Set to null for no load balancer."
  type        = string
  default     = null
}

# Auto-scaling
variable "enable_autoscaling" {
  description = "Enable auto-scaling for the service"
  type        = bool
  default     = false
}

variable "autoscaling_min" {
  description = "Minimum number of tasks"
  type        = number
  default     = 2
}

variable "autoscaling_max" {
  description = "Maximum number of tasks"
  type        = number
  default     = 10
}

variable "autoscaling_cpu_target" {
  description = "Target CPU utilization percentage for auto-scaling"
  type        = number
  default     = 70
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "additional_task_role_policies" {
  description = "Additional IAM policy ARNs to attach to the task role"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## IAM Roles

```hcl
# modules/ecs-service/iam.tf

# Execution role - used by ECS agent to pull images and write logs
data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role - used by the application running in the container
resource "aws_iam_role" "task" {
  name               = "${var.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
  tags               = var.tags
}

# Attach additional policies to the task role
resource "aws_iam_role_policy_attachment" "task_additional" {
  for_each = toset(var.additional_task_role_policies)

  role       = aws_iam_role.task.name
  policy_arn = each.value
}
```

## Main Resources

```hcl
# modules/ecs-service/main.tf

# CloudWatch log group for the container
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

# Task definition
resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.name
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = var.environment_variables
      secrets     = var.secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = var.tags
}

data "aws_region" "current" {}

# ECS service
resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  # Load balancer attachment (optional)
  dynamic "load_balancer" {
    for_each = var.target_group_arn != null ? [1] : []

    content {
      target_group_arn = var.target_group_arn
      container_name   = var.name
      container_port   = var.container_port
    }
  }

  # Rolling deployment
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  # Allow external changes to desired_count when autoscaling is enabled
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}
```

## Auto-Scaling

```hcl
# modules/ecs-service/autoscaling.tf

resource "aws_appautoscaling_target" "this" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max
  min_capacity       = var.autoscaling_min
  resource_id        = "service/${split("/", var.cluster_id)[1]}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale based on CPU utilization
resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[0].resource_id
  scalable_dimension = aws_appautoscaling_target.this[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.autoscaling_cpu_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Outputs

```hcl
# modules/ecs-service/outputs.tf

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.this.arn
}

output "task_role_arn" {
  description = "ARN of the task IAM role"
  value       = aws_iam_role.task.arn
}

output "execution_role_arn" {
  description = "ARN of the execution IAM role"
  value       = aws_iam_role.execution.arn
}
```

## Usage Example

```hcl
module "user_service" {
  source = "./modules/ecs-service"

  name            = "user-service"
  cluster_id      = aws_ecs_cluster.main.id
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/user-service:v1.2.3"
  container_port  = 8080

  cpu    = 512
  memory = 1024

  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.service_sg.id]

  target_group_arn = module.api_alb.target_group_arns[0]

  environment_variables = [
    { name = "SERVICE_NAME", value = "user-service" },
    { name = "LOG_LEVEL", value = "info" },
  ]

  secrets = [
    { name = "DB_PASSWORD", valueFrom = "arn:aws:ssm:us-east-1:123456789012:parameter/prod/db-password" },
  ]

  enable_autoscaling     = true
  autoscaling_min        = 2
  autoscaling_max        = 20
  autoscaling_cpu_target = 65

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

This module works well alongside the [load balancer module](https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-load-balancers/view) and the [security group module](https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-security-groups/view) for building complete container deployments.
