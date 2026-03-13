# How to Handle ECS Task Definition Revisions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Task Definition, Revisions, Deployments, Infrastructure as Code

Description: Learn how to manage ECS task definition revisions with Terraform including strategies for updating containers, handling rollbacks, and managing revision history.

---

Every time you update an ECS task definition, AWS creates a new revision while keeping the previous ones intact. This versioning system is powerful for rollbacks and audit trails, but it can create challenges when using Terraform. Understanding how Terraform interacts with task definition revisions is essential for smooth deployments. This guide covers strategies for managing task definition revisions effectively with Terraform.

## How Task Definition Revisions Work

An ECS task definition is immutable once created. When you make any change, such as updating the container image, environment variables, or resource limits, AWS creates a new revision. Each revision gets an incrementing number appended to the family name (e.g., `my-app:1`, `my-app:2`, `my-app:3`). ECS services reference a specific task definition revision and need to be updated to use a new one.

When Terraform updates a task definition, it creates a new revision and updates the service to use it. However, if external tools (like CI/CD pipelines) also create revisions, this can cause conflicts.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- Understanding of ECS task definitions and services

## Basic Task Definition Management

Here is a straightforward task definition setup.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Task execution role
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/my-app"
  retention_in_days = 30
}

# Task definition - each change creates a new revision
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "APP_VERSION"
          value = var.image_tag
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])

  tags = {
    Name    = "my-app"
    Version = var.image_tag
  }
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}
```

## Strategy 1: Let Terraform Manage All Revisions

The simplest approach is letting Terraform fully manage task definition revisions. Every `terraform apply` that changes the task definition creates a new revision.

```hcl
# ECS Service that always uses the latest Terraform-managed revision
resource "aws_ecs_service" "app" {
  name            = "my-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn  # Uses the latest revision
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  deployment_configuration {
    minimum_healthy_percent = 50
    maximum_percent         = 200
  }

  # With this approach, Terraform always controls the task definition
  # No lifecycle ignore_changes needed
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Strategy 2: External Deployments with ignore_changes

If your CI/CD pipeline updates the task definition outside of Terraform, use `ignore_changes` to prevent Terraform from reverting the deployment.

```hcl
# Service that ignores task_definition changes from external tools
resource "aws_ecs_service" "app_external_deploy" {
  name            = "my-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Ignore task definition changes made by CI/CD
  lifecycle {
    ignore_changes = [task_definition]
  }
}
```

The downside of this approach is that Terraform cannot manage the task definition at all. If you need to change something in the task definition through Terraform (like adding a new environment variable), you would need to temporarily remove the `ignore_changes` block.

## Strategy 3: Data Source for Latest Revision

Use a data source to reference the latest active revision, regardless of how it was created.

```hcl
# Get the latest active revision of the task definition
data "aws_ecs_task_definition" "latest" {
  task_definition = aws_ecs_task_definition.app.family

  depends_on = [aws_ecs_task_definition.app]
}

# Service uses whichever revision is latest
resource "aws_ecs_service" "app_latest" {
  name    = "my-app"
  cluster = aws_ecs_cluster.main.id

  # Use the latest revision, whether created by Terraform or CI/CD
  task_definition = "${data.aws_ecs_task_definition.latest.family}:${data.aws_ecs_task_definition.latest.revision}"
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
}
```

## Strategy 4: Variable-Driven Image Tags

The most common pattern for managing revisions is using Terraform variables for the image tag. Your CI/CD pipeline updates the variable, which triggers a new revision.

```hcl
# Use a tfvars file or CI/CD variable for the image tag
variable "app_image_tag" {
  description = "Docker image tag to deploy"
  type        = string
}

# Task definition with variable-driven image tag
resource "aws_ecs_task_definition" "app_versioned" {
  family                   = "my-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.app_image_tag}"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])

  tags = {
    ImageTag = var.app_image_tag
  }
}
```

In your CI/CD pipeline, you would run:

```bash
# Deploy a new version by changing the image tag
terraform apply -var="app_image_tag=v2.1.0"
```

## Cleaning Up Old Revisions

ECS task definition revisions accumulate over time. While they do not incur charges, cleaning them up keeps things organized.

```hcl
# Local-exec provisioner to deregister old revisions
# Run this periodically or as part of your cleanup process
resource "null_resource" "cleanup_old_revisions" {
  triggers = {
    task_definition_arn = aws_ecs_task_definition.app.arn
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Get all revisions of the task family
      REVISIONS=$(aws ecs list-task-definitions \
        --family-prefix my-app \
        --status ACTIVE \
        --sort DESC \
        --query 'taskDefinitionArns' \
        --output text)

      # Keep the latest 5 revisions, deregister the rest
      COUNT=0
      for REV in $REVISIONS; do
        COUNT=$((COUNT + 1))
        if [ $COUNT -gt 5 ]; then
          echo "Deregistering: $REV"
          aws ecs deregister-task-definition --task-definition "$REV" > /dev/null
        fi
      done
    EOT
  }
}
```

## Rolling Back to a Previous Revision

To roll back, you can reference a specific revision number.

```hcl
variable "rollback_revision" {
  description = "Set to a specific revision number to rollback, or 0 for latest"
  type        = number
  default     = 0
}

# Service with optional rollback
resource "aws_ecs_service" "app_with_rollback" {
  name    = "my-app"
  cluster = aws_ecs_cluster.main.id

  # If rollback_revision is set, use that specific revision
  # Otherwise use the latest Terraform-managed revision
  task_definition = var.rollback_revision > 0 ? "my-app:${var.rollback_revision}" : aws_ecs_task_definition.app.arn

  desired_count = 3
  launch_type   = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  deployment_configuration {
    minimum_healthy_percent = 50
    maximum_percent         = 200
  }

  # Circuit breaker for automatic rollback on failed deployments
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

Roll back using:

```bash
# Roll back to revision 5
terraform apply -var="rollback_revision=5"

# Return to latest
terraform apply -var="rollback_revision=0"
```

## Deployment Circuit Breaker

ECS deployment circuit breaker automatically rolls back failed deployments.

```hcl
# Service with deployment circuit breaker
resource "aws_ecs_service" "app_circuit_breaker" {
  name            = "my-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  deployment_configuration {
    minimum_healthy_percent = 50
    maximum_percent         = 200
  }

  # Automatically roll back if new tasks fail to stabilize
  deployment_circuit_breaker {
    enable   = true
    rollback = true  # Auto-rollback to the previous stable revision
  }
}
```

## Outputs

```hcl
output "task_definition_arn" {
  description = "ARN of the current task definition"
  value       = aws_ecs_task_definition.app.arn
}

output "task_definition_revision" {
  description = "Current revision number"
  value       = aws_ecs_task_definition.app.revision
}

output "task_family" {
  description = "Task definition family name"
  value       = aws_ecs_task_definition.app.family
}
```

## Best Practices

When managing task definition revisions with Terraform, choose one strategy and stick with it. Mixing Terraform-managed and externally-managed revisions leads to confusion. If using CI/CD for deployments, the variable-driven image tag approach gives you the best of both worlds. Always enable the deployment circuit breaker for automatic rollback on failed deployments. Tag your task definitions with version information for easy identification. Clean up old revisions periodically to keep your task definition list manageable. Use the deployment configuration with minimum_healthy_percent and maximum_percent to control the rollout speed.

## Monitoring with OneUptime

Failed deployments and task definition issues can cause service disruptions. Use [OneUptime](https://oneuptime.com) to monitor your ECS service health and get alerted when deployments cause problems, complementing the deployment circuit breaker with external observability.

## Conclusion

Managing ECS task definition revisions with Terraform requires a clear strategy that fits your deployment workflow. Whether Terraform fully manages revisions, or your CI/CD pipeline handles deployments with Terraform managing the infrastructure, the key is consistency. By using variable-driven image tags, deployment circuit breakers, and proper revision cleanup, you can maintain a clean, auditable history of your container deployments while enabling smooth rollbacks when needed.

For more ECS deployment topics, see our guides on [ECS blue-green deployment](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-blue-green-deployment-in-terraform/view) and [ECS Execute Command](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-execute-command-configuration-in-terraform/view).
