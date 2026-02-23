# How to Understand Terraform Module Structure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Infrastructure as Code, DevOps, Best Practices

Description: A detailed guide to Terraform module file structure conventions, including how to organize resources, variables, outputs, and supporting files for maintainable modules.

---

When you look at a well-maintained Terraform module, you will notice it follows a consistent file structure. This is not just convention for the sake of convention - it makes modules easier to understand, review, and maintain. Whether you are creating modules for your team or evaluating third-party modules, understanding the standard structure helps you work with them effectively.

This guide covers the standard file layout, what goes in each file, and why certain patterns exist.

## The Standard File Layout

A typical Terraform module looks like this:

```
my-module/
  main.tf          # Primary resource definitions
  variables.tf     # Input variable declarations
  outputs.tf       # Output value declarations
  versions.tf      # Provider and Terraform version constraints
  locals.tf        # Local values (computed intermediate values)
  data.tf          # Data source declarations
  README.md        # Documentation
```

For more complex modules, you might also see:

```
my-module/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  locals.tf
  data.tf
  iam.tf           # IAM resources (policies, roles)
  networking.tf    # Networking resources (subnets, routes)
  security.tf      # Security groups, NACLs
  README.md
  examples/        # Usage examples
    basic/
      main.tf
    complete/
      main.tf
  tests/           # Module tests
    basic_test.go
```

Let us go through each file and its purpose.

## main.tf - The Core Resources

This file contains the primary resources that the module creates. For a simple module, all resources might live here. For a complex module, `main.tf` holds the central resources while related resources get split into separate files.

```hcl
# main.tf - ECS Service module example

# The primary resource this module manages
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener_rule.this]
}

# The task definition - closely related to the service
resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions    = var.container_definitions
}
```

## variables.tf - Input Interface

This file defines every input that the module accepts. The order and grouping of variables matters for readability. A common pattern is to group them by purpose:

```hcl
# variables.tf

# -----------------------------------------------
# Required variables (no defaults)
# -----------------------------------------------

variable "service_name" {
  description = "Name of the ECS service"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.service_name))
    error_message = "Service name must start with a letter and contain only alphanumeric characters and hyphens."
  }
}

variable "cluster_id" {
  description = "ID of the ECS cluster to deploy into"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the service's network configuration"
  type        = list(string)
}

variable "container_definitions" {
  description = "JSON-encoded container definitions for the task"
  type        = string
}

# -----------------------------------------------
# Optional variables (have defaults)
# -----------------------------------------------

variable "desired_count" {
  description = "Number of task instances to run"
  type        = number
  default     = 2
}

variable "cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MiB for the task"
  type        = number
  default     = 512
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "assign_public_ip" {
  description = "Whether to assign a public IP to the task"
  type        = bool
  default     = false
}

# -----------------------------------------------
# Tagging variables
# -----------------------------------------------

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

Notice the pattern: required variables first (no `default`), optional variables second (with `default`), and tagging last. Every variable has a `description` and explicit `type`.

## outputs.tf - The Module's Return Values

Outputs define what information the module makes available to its caller. Think of these as the module's public API for reading values after creation:

```hcl
# outputs.tf

output "service_id" {
  description = "The ID of the ECS service"
  value       = aws_ecs_service.this.id
}

output "service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "The ARN of the task definition"
  value       = aws_ecs_task_definition.this.arn
}

output "task_definition_revision" {
  description = "The revision number of the task definition"
  value       = aws_ecs_task_definition.this.revision
}

output "security_group_id" {
  description = "The ID of the service's security group"
  value       = aws_security_group.service.id
}

output "target_group_arn" {
  description = "The ARN of the load balancer target group"
  value       = aws_lb_target_group.this.arn
}
```

Good outputs expose the identifiers and attributes that downstream resources are likely to need. If another module or resource would need to reference something, it should be an output.

## versions.tf - Version Constraints

This file pins the required Terraform version and provider versions:

```hcl
# versions.tf

terraform {
  # Minimum Terraform version this module supports
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}
```

Separating this into its own file keeps version constraints visible and easy to update. The module should not include a `provider` block - that is the caller's responsibility. The module only declares which providers it needs and what versions are compatible.

## locals.tf - Computed Values

Local values help you avoid repeating computed expressions. They sit between variables (input) and resources (implementation):

```hcl
# locals.tf

locals {
  # Standard tags applied to all resources
  common_tags = merge(
    var.tags,
    {
      Module    = "ecs-service"
      Service   = var.service_name
      ManagedBy = "terraform"
    },
  )

  # Compute the container name from the service name if not explicitly provided
  container_name = coalesce(var.container_name, var.service_name)

  # Build the log group name following naming convention
  log_group_name = "/ecs/${var.cluster_name}/${var.service_name}"
}
```

## data.tf - Data Sources

Data sources query existing infrastructure. Separating them makes it clear what the module reads versus what it creates:

```hcl
# data.tf

# Look up the current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Look up the VPC that the subnets belong to
data "aws_subnet" "first" {
  id = var.subnet_ids[0]
}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  vpc_id     = data.aws_subnet.first.vpc_id
}
```

## Splitting Resources by Purpose

For larger modules, splitting resources across multiple files by purpose improves readability. The file names should describe the category of resources inside:

```hcl
# iam.tf - IAM roles and policies for the ECS service

resource "aws_iam_role" "execution" {
  name = "${var.service_name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags = local.common_tags
}

resource "aws_iam_role" "task" {
  name = "${var.service_name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags = local.common_tags
}
```

```hcl
# networking.tf - Load balancer and security group resources

resource "aws_security_group" "service" {
  name_prefix = "${var.service_name}-"
  vpc_id      = local.vpc_id
  tags        = local.common_tags
}

resource "aws_lb_target_group" "this" {
  name_prefix = substr(var.service_name, 0, 6)
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    path = var.health_check_path
  }

  tags = local.common_tags
}
```

## The examples/ Directory

Good modules include usage examples. These serve as both documentation and test fixtures:

```
examples/
  basic/
    main.tf       # Minimal configuration
    outputs.tf    # Show key outputs
  complete/
    main.tf       # Full configuration with all options
    outputs.tf
```

```hcl
# examples/basic/main.tf

module "web_service" {
  source = "../../"

  service_name          = "web-app"
  cluster_id            = "arn:aws:ecs:us-east-1:123456789:cluster/main"
  subnet_ids            = ["subnet-abc", "subnet-def"]
  container_definitions = file("container-def.json")
}
```

## What NOT to Put in a Module

A few things that should stay out of module code:

- **Provider configuration blocks** - The caller configures providers, not the module.
- **Backend configuration** - Only the root module configures state backends.
- **Hardcoded account IDs or regions** - These should be variables or data sources.
- **`terraform` blocks with backend settings** - Modules should only have `required_providers` in their terraform block.

## The Naming Convention for Resources

Inside a module, use `this` as the resource name when there is only one resource of a given type:

```hcl
# Good - clear and conventional
resource "aws_s3_bucket" "this" { ... }

# Less good - redundant naming
resource "aws_s3_bucket" "bucket" { ... }
resource "aws_s3_bucket" "s3_bucket" { ... }
```

When a module creates multiple resources of the same type, use descriptive names:

```hcl
resource "aws_security_group" "service" { ... }
resource "aws_security_group" "alb" { ... }
```

## Summary

Terraform module structure follows conventions that make modules predictable and easy to navigate. Split your code across `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `locals.tf`, and `data.tf` as a baseline. For complex modules, split resources into additional files by purpose (iam.tf, networking.tf, etc.). Include examples and documentation. Keep provider configuration out of modules. Following these patterns means anyone familiar with Terraform can pick up your module and understand it quickly.

For building your first module from scratch, see [How to Create Your First Terraform Module](https://oneuptime.com/blog/post/2026-02-23-how-to-create-your-first-terraform-module/view). To learn about module inputs and outputs, check out [How to Pass Input Variables to Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-input-variables-to-terraform-modules/view) and [How to Return Output Values from Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-return-output-values-from-terraform-modules/view).
