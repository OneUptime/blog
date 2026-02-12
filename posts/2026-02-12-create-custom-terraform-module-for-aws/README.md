# How to Create a Custom Terraform Module for AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Modules, Infrastructure

Description: Step-by-step guide to building, testing, versioning, and publishing your own reusable Terraform modules for AWS infrastructure.

---

Community modules from the Terraform Registry are great starting points, but eventually you'll need something tailored to your organization's standards. Custom modules let you encode your company's best practices, naming conventions, tagging policies, and security requirements into reusable packages.

This guide walks through creating a production-quality Terraform module from scratch, including validation, testing, documentation, and publishing.

## Planning Your Module

Before writing code, answer these questions:

- What resources does this module manage?
- What should be configurable vs. hardcoded?
- What outputs will callers need?
- What are the security defaults?

Let's build a module for an AWS application stack - a common pattern that creates an ALB, ECS service, and related security groups with sensible defaults.

## Directory Structure

```
terraform-aws-app-service/
  main.tf              # Core resources
  variables.tf         # Input variables
  outputs.tf           # Outputs
  versions.tf          # Provider and Terraform version constraints
  locals.tf            # Local values and computed data
  data.tf              # Data sources
  README.md            # Usage documentation
  examples/
    simple/
      main.tf          # Simple usage example
    complete/
      main.tf          # Full-featured usage example
  test/
    app_service_test.go  # Terratest tests
```

## Version Constraints

Start with the provider requirements.

```hcl
# versions.tf

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

Use a range for the AWS provider version. Pinning to an exact version forces all consumers to use that same version, which causes conflicts.

## Input Variables

Good variables have descriptions, types, defaults, and validation.

```hcl
# variables.tf

variable "name" {
  description = "Name of the application service. Used as a prefix for all resources."
  type        = string

  validation {
    condition     = length(var.name) <= 28
    error_message = "Name must be 28 characters or fewer (ALB name limit is 32)."
  }
}

variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ALB and ECS tasks"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnets in different AZs are required for the ALB."
  }
}

variable "container_image" {
  description = "Docker image for the ECS task (e.g., nginx:latest or 123456789.dkr.ecr.us-east-1.amazonaws.com/app:v1)"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 80
}

variable "cpu" {
  description = "CPU units for the Fargate task (256, 512, 1024, 2048, or 4096)"
  type        = number
  default     = 256

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "memory" {
  description = "Memory in MB for the Fargate task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 2
}

variable "health_check_path" {
  description = "Path for ALB health checks"
  type        = string
  default     = "/health"
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "enable_autoscaling" {
  description = "Whether to enable auto-scaling"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks when auto-scaling is enabled"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of tasks when auto-scaling is enabled"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

## Local Values

Use locals for computed values and to keep the resource definitions clean.

```hcl
# locals.tf

locals {
  # Merge user tags with mandatory tags
  common_tags = merge(var.tags, {
    ManagedBy = "terraform"
    Module    = "app-service"
    Service   = var.name
  })

  # Convert environment variables map to the ECS format
  container_environment = [
    for key, value in var.environment_variables : {
      name  = key
      value = value
    }
  ]
}
```

## Main Resource Definitions

```hcl
# main.tf

# Security group for the ALB
resource "aws_security_group" "alb" {
  name_prefix = "${var.name}-alb-"
  description = "Security group for ${var.name} ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Security group for ECS tasks
resource "aws_security_group" "ecs" {
  name_prefix = "${var.name}-ecs-"
  description = "Security group for ${var.name} ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-ecs-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Application Load Balancer
resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids

  tags = local.common_tags
}

resource "aws_lb_target_group" "this" {
  name_prefix = substr(var.name, 0, 6)
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "this" {
  name = var.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name}"
  retention_in_days = 30
  tags              = local.common_tags
}

# ECS Task Definition
resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = var.name
    image     = var.container_image
    essential = true

    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]

    environment = local.container_environment

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.this.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = local.common_tags
}
```

## Data Sources

```hcl
# data.tf

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
```

## Outputs

```hcl
# outputs.tf

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.this.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.this.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.this.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.this.name
}

output "security_group_ids" {
  description = "Map of security group IDs"
  value = {
    alb = aws_security_group.alb.id
    ecs = aws_security_group.ecs.id
  }
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.name
}
```

## Creating an Example

Every module should have a working example.

```hcl
# examples/simple/main.tf

provider "aws" {
  region = "us-east-1"
}

module "app" {
  source = "../../"

  name            = "my-web-app"
  vpc_id          = "vpc-12345"
  subnet_ids      = ["subnet-aaa", "subnet-bbb"]
  container_image = "nginx:alpine"
  container_port  = 80

  environment_variables = {
    APP_ENV = "production"
  }

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

output "url" {
  value = "http://${module.app.alb_dns_name}"
}
```

## Versioning and Publishing

Tag releases in Git for version control.

```bash
# Tag a release
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Consumers reference the tag
# source = "github.com/myorg/terraform-aws-app-service?ref=v1.0.0"
```

Follow semantic versioning: major for breaking changes, minor for new features, patch for bug fixes.

## Wrapping Up

Building custom Terraform modules takes more upfront effort than inline resources, but it pays off quickly as your infrastructure grows. Encode your organization's standards into modules, validate inputs aggressively, write examples, and version everything. Your future self and your teammates will appreciate the consistency.

For using well-maintained community modules, see our guides on the [Terraform AWS VPC module](https://oneuptime.com/blog/post/terraform-aws-vpc-module/view) and [Terraform AWS RDS module](https://oneuptime.com/blog/post/terraform-aws-rds-module/view).
