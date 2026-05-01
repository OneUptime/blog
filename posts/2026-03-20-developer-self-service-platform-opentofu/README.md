# How to Build a Developer Self-Service Platform with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Self-Service, Platform Engineering, Developer Experience, Infrastructure as Code

Description: Learn how to build a developer self-service infrastructure platform with OpenTofu, allowing developers to provision environments and services through standardized modules.

## Introduction

A developer self-service platform allows developers to provision infrastructure themselves through opinionated modules and automated workflows - without needing to understand the underlying cloud complexity. Platform engineers build the modules; developers call them. This guide shows how to structure the platform.

## The Platform Module Architecture

```text
platform-modules/           (Platform team owns)
├── environments/           # Create complete environments
│   ├── dev-environment/
│   └── pr-environment/
├── services/               # Deploy individual services
│   ├── web-api/
│   ├── background-worker/
│   └── static-frontend/
└── shared/                 # Shared infrastructure components
    ├── database/
    ├── cache/
    └── message-queue/

developer-repos/            (Dev teams own)
└── my-service/
    └── infra/
        └── main.tf         # Only calls platform modules
```

## Developer-Facing Service Module

Platform team builds opinionated modules that hide complexity.

```hcl
# platform-modules/services/web-api/main.tf

# This module is what developers call - they don't see the ECS/ALB complexity

variable "service_name" {
  type        = string
  description = "Name of the service (lowercase, hyphens)"
}

variable "container_image" {
  type        = string
  description = "Full container image URI with tag"
}

variable "environment" {
  type        = string
  description = "Environment name (for example dev or pr-123)"
}

variable "environment_variables" {
  type        = map(string)
  description = "Non-sensitive environment variables"
  default     = {}
}

variable "cpu" {
  type        = number
  description = "CPU units (for example 256, 512, 1024, 2048)"
  default     = 256
}

variable "memory" {
  type        = number
  description = "Memory in MB (valid values depend on CPU; for example 512, 1024, 2048, 4096)"
  default     = 512
}

variable "min_replicas" {
  type    = number
  default = 1
}

variable "max_replicas" {
  type    = number
  default = 10
}

variable "health_check_path" {
  type    = string
  default = "/health"
}
```

## What the Platform Module Creates Internally

```hcl
# platform-modules/services/web-api/internal.tf
# Developers don't interact with this - it's all internal platform logic

data "aws_ssm_parameter" "cluster_arn" {
  name = "/platform/${var.environment}/ecs/cluster-arn"
}

data "aws_ssm_parameter" "private_subnets" {
  name = "/platform/${var.environment}/networking/private-subnet-ids"
}

data "aws_ssm_parameter" "vpc_id" {
  name = "/platform/${var.environment}/networking/vpc-id"
}

resource "aws_ecs_task_definition" "service" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = data.aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name        = var.service_name
    image       = var.container_image
    environment = [for k, v in var.environment_variables : { name = k, value = v }]

    portMappings = [{ containerPort = 8080, protocol = "tcp" }]

    healthCheck = {
      command  = ["CMD-SHELL", "curl -f http://localhost:8080${var.health_check_path} || exit 1"]
      interval = 30
      timeout  = 5
      retries  = 3
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/platform/${var.service_name}"
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "service"
      }
    }
  }])
}

# ... ECS Service, ALB Target Group, auto-scaling, etc.
```

## Developer Usage: What It Looks Like

```hcl
# my-service/infra/main.tf
# This is all a developer needs to write!

variable "environment" {
  type = string
}

variable "image_tag" {
  type = string
}

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }

  backend "s3" {
    bucket = "company-tofu-state"
    key    = "services/my-api/${var.environment}/terraform.tfstate"
    region = "us-east-1"
  }
}

module "my_api" {
  source  = "git::https://github.com/my-org/platform-modules.git//services/web-api?ref=v2.1.0"

  environment     = var.environment
  service_name    = "my-api"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-api:${var.image_tag}"

  environment_variables = {
    LOG_LEVEL   = "info"
    API_TIMEOUT = "30"
  }

  cpu          = 512
  memory       = 1024
  min_replicas = 2
  max_replicas = 20
}

output "service_url" {
  value = module.my_api.url
}
```

## Automated Environment Provisioning

Use GitHub Actions to provision PR environments automatically.

```yaml
# .github/workflows/pr-environment.yml
on:
  pull_request:
    types: [opened, synchronize, closed]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: us-east-1

jobs:
  provision:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-opentofu
          aws-region: ${{ env.AWS_REGION }}
      - env:
          TF_VAR_image_tag: ${{ github.event.pull_request.head.sha }}
          TF_VAR_environment: pr-${{ github.event.number }}
        run: |
          tofu init
          tofu workspace select -or-create pr-${{ github.event.number }}
          tofu apply -auto-approve

  destroy:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-opentofu
          aws-region: ${{ env.AWS_REGION }}
      - env:
          TF_VAR_image_tag: ${{ github.event.pull_request.head.sha }}
          TF_VAR_environment: pr-${{ github.event.number }}
        run: |
          tofu init
          tofu workspace select pr-${{ github.event.number }}
          tofu destroy -auto-approve
          tofu workspace select default
          tofu workspace delete pr-${{ github.event.number }}
```

## Summary

A developer self-service platform uses platform engineering principles: platform teams build opinionated, production-grade modules that encapsulate all infrastructure complexity; developers call these modules with a handful of parameters. The key is a clean abstraction layer - developers specify what (service name, image, config) and the module handles how (ECS, ALB, autoscaling, logging). Version and semver your platform modules so developers can pin versions and upgrade on their own schedule.
