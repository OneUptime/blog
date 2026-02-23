# How to Handle Container Image Updates in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Containers, CI/CD, ECS, Kubernetes

Description: Learn strategies for handling container image updates in Terraform, including tag management, digest pinning, and lifecycle policies for reliable deployments.

---

Managing container image updates in Terraform presents a unique challenge. Terraform excels at managing infrastructure state, but container images change frequently as applications are updated. The tension between Terraform's desire for a stable declared state and the dynamic nature of container deployments requires careful strategy. Getting this right means your deployments are predictable, rollbacks are easy, and your CI/CD pipeline works smoothly with Terraform.

This guide covers the various approaches to handling container image updates in Terraform, from simple tag-based strategies to sophisticated digest pinning and automated pipelines.

## The Challenge

When you define a container image in Terraform like this:

```hcl
# This will cause issues when the image is updated
resource "aws_ecs_task_definition" "app" {
  family = "my-app"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.example.com/myapp:latest"
      # ...
    }
  ])
}
```

Using the `latest` tag creates problems because Terraform sees no change in the configuration even when the underlying image changes. Conversely, changing the tag every time forces a new task definition revision, which may not be desired when Terraform runs outside your deployment pipeline.

## Strategy 1: Variable-Based Image Tags

The most straightforward approach uses Terraform variables for image tags:

```hcl
variable "app_image_tag" {
  description = "Docker image tag for the application"
  type        = string
  default     = "v1.0.0"
}

# ECS task definition with variable image tag
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      # Image tag comes from variable, updated during deployment
      image = "myregistry.example.com/myapp:${var.app_image_tag}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])
}

# ECS service referencing the task definition
resource "aws_ecs_service" "app" {
  name            = "my-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
  }
}
```

Deploy with a specific tag:

```bash
# Deploy a new version by updating the image tag
terraform apply -var="app_image_tag=v1.2.0"
```

## Strategy 2: Image Digest Pinning

For maximum reproducibility, pin to the exact image digest:

```hcl
variable "app_image_digest" {
  description = "Docker image digest for exact version pinning"
  type        = string
  # Example: sha256:abc123def456...
}

# Task definition with digest-pinned image
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      # Pin to exact digest for reproducible deployments
      image = "myregistry.example.com/myapp@${var.app_image_digest}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Strategy 3: Data Source for Latest Image

Use a data source to automatically discover the latest image:

```hcl
# Look up the latest image from ECR
data "aws_ecr_image" "app" {
  repository_name = "myapp"
  most_recent     = true
}

# Use the discovered image digest
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      # Automatically use the latest image digest
      image = "${aws_ecr_repository.app.repository_url}@${data.aws_ecr_image.app.image_digest}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Strategy 4: Ignore Changes with Lifecycle

When another tool manages deployments, ignore image changes in Terraform:

```hcl
# ECS service that ignores task definition changes
resource "aws_ecs_service" "app" {
  name            = "my-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
  }

  # Ignore changes to task definition when CI/CD manages deployments
  lifecycle {
    ignore_changes = [task_definition]
  }
}

# For Kubernetes deployments
resource "kubernetes_deployment" "app" {
  metadata {
    name = "my-app"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          image = "myregistry.example.com/myapp:${var.app_image_tag}"
          name  = "app"
        }
      }
    }
  }

  # Let kubectl or Argo CD manage the image
  lifecycle {
    ignore_changes = [
      spec[0].template[0].spec[0].container[0].image
    ]
  }
}
```

## Strategy 5: Terraform with CI/CD Integration

Create a complete CI/CD flow that updates images through Terraform:

```hcl
# Store the current image tag in SSM Parameter Store
resource "aws_ssm_parameter" "app_image_tag" {
  name  = "/app/image-tag"
  type  = "String"
  value = var.app_image_tag

  lifecycle {
    ignore_changes = [value]
  }
}

# Read the current image tag from SSM
data "aws_ssm_parameter" "current_image_tag" {
  name = aws_ssm_parameter.app_image_tag.name
}

locals {
  # Use the variable if explicitly set, otherwise use the SSM value
  effective_image_tag = var.app_image_tag != "" ? var.app_image_tag : data.aws_ssm_parameter.current_image_tag.value
}

# Task definition using the effective image tag
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.example.com/myapp:${local.effective_image_tag}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Strategy 6: Multi-Container Image Management

For services with multiple containers, manage all images consistently:

```hcl
variable "image_versions" {
  description = "Map of service names to image versions"
  type        = map(string)
  default = {
    api     = "v2.1.0"
    worker  = "v2.1.0"
    sidecar = "v1.5.0"
  }
}

locals {
  registry = "myregistry.example.com"
}

# Task definition with multiple containers
resource "aws_ecs_task_definition" "multi_container" {
  family                   = "multi-container-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${local.registry}/api:${var.image_versions["api"]}"
      essential = true
      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]
    },
    {
      name  = "worker"
      image = "${local.registry}/worker:${var.image_versions["worker"]}"
      essential = true
    },
    {
      name  = "sidecar"
      image = "${local.registry}/sidecar:${var.image_versions["sidecar"]}"
      essential = false
    }
  ])
}
```

## Handling Rollbacks

Make rollbacks easy with Terraform:

```hcl
# Keep track of previous versions for rollback
variable "previous_image_tag" {
  description = "Previous image tag for rollback"
  type        = string
  default     = ""
}

variable "enable_rollback" {
  description = "Set to true to roll back to previous version"
  type        = bool
  default     = false
}

locals {
  deployed_tag = var.enable_rollback ? var.previous_image_tag : var.app_image_tag
}
```

Rollback with a single command:

```bash
# Roll back to the previous version
terraform apply -var="enable_rollback=true" -var="previous_image_tag=v1.1.0"
```

## Monitoring with OneUptime

Container image updates are a common source of deployment issues. OneUptime helps you monitor the health of your services after image updates, detecting increases in error rates, latency changes, and health check failures that might indicate a bad deployment. Visit [OneUptime](https://oneuptime.com) to set up deployment monitoring.

## Conclusion

Handling container image updates in Terraform requires choosing the right strategy for your workflow. Variable-based tags work well for teams that deploy through Terraform. Digest pinning provides maximum reproducibility. Lifecycle ignore rules suit teams using separate deployment tools. Data sources automate discovery of the latest images. The key is to choose one approach and apply it consistently across your infrastructure. By managing image updates deliberately in Terraform, you maintain the predictability and auditability that infrastructure as code provides.

For more container management topics, see [How to Create Container Registries with Lifecycle Policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-registries-with-lifecycle-policies-in-terraform/view) and [How to Create Container Health Check Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-health-check-configurations-in-terraform/view).
