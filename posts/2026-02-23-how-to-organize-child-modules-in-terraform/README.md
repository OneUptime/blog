# How to Organize Child Modules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Organization, Infrastructure as Code, Best Practices

Description: Learn effective strategies for organizing Terraform child modules with clear directory structures, naming conventions, and dependency management patterns.

---

As your Terraform codebase grows, the way you organize child modules determines whether new team members can contribute quickly or spend days trying to understand the code. Poor organization leads to duplicated logic, tangled dependencies, and modules that nobody dares to touch. This guide covers practical strategies for keeping child modules clean and discoverable.

## What Are Child Modules?

In Terraform, a child module is any module called from another module using a `module` block. The calling module is the parent, and the called module is the child. Your root module calls child modules, and those child modules can in turn call other child modules.

```hcl
# Root module calling a child module
module "networking" {
  source = "./modules/networking"

  vpc_cidr           = "10.0.0.0/16"
  environment        = "production"
  availability_zones = ["us-east-1a", "us-east-1b"]
}
```

## Directory Structure Options

There are three main approaches to organizing child modules, and the right choice depends on your team size and project scope.

### Option 1: Flat Modules Directory

Best for small to medium projects with fewer than 15 modules.

```text
project/
  main.tf
  variables.tf
  outputs.tf
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
    monitoring/
      main.tf
      variables.tf
      outputs.tf
```

### Option 2: Grouped by Domain

Better for larger projects where related modules should be grouped together.

```text
project/
  main.tf
  modules/
    network/
      vpc/
        main.tf
        variables.tf
        outputs.tf
      subnets/
        main.tf
        variables.tf
        outputs.tf
      security-groups/
        main.tf
        variables.tf
        outputs.tf
    compute/
      ecs-cluster/
        main.tf
        variables.tf
        outputs.tf
      ecs-service/
        main.tf
        variables.tf
        outputs.tf
    data/
      rds/
        main.tf
        variables.tf
        outputs.tf
      elasticache/
        main.tf
        variables.tf
        outputs.tf
```

### Option 3: Separate Repositories

Best for modules shared across multiple projects or teams.

```text
# Each module in its own repository
github.com/myorg/terraform-aws-vpc
github.com/myorg/terraform-aws-ecs-cluster
github.com/myorg/terraform-aws-rds
```

## Standard File Layout for Each Module

Every child module should follow the same file layout. Consistency makes it easy to navigate any module without thinking about where things are.

```hcl
# modules/compute/
#   main.tf       - Primary resource definitions
#   variables.tf  - Input variable declarations
#   outputs.tf    - Output declarations
#   locals.tf     - Local values and computed expressions
#   data.tf       - Data source lookups
#   versions.tf   - Required provider versions (optional for child modules)
#   README.md     - Module documentation

# variables.tf - Declare all inputs with descriptions and types
variable "name" {
  description = "Name prefix for all resources created by this module"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the compute resources"
  type        = list(string)
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# locals.tf - Computed values used throughout the module
locals {
  # Merge user-provided tags with module defaults
  common_tags = merge(var.tags, {
    Module = "compute"
  })

  # Derive names from the base name
  cluster_name = "${var.name}-cluster"
  service_name = "${var.name}-service"
}
```

```hcl
# outputs.tf - Expose values that other modules need
output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.this.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.this.arn
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.this.name
}
```

## Naming Conventions

Good naming conventions prevent confusion as your module library grows.

```text
# Module directory naming
# Use lowercase with hyphens
modules/security-groups/     # Good
modules/SecurityGroups/      # Bad - mixed case
modules/security_groups/     # Acceptable but inconsistent with Terraform conventions

# Resource naming inside modules
# Use "this" for the primary resource when a module creates one main thing
resource "aws_ecs_cluster" "this" {
  name = local.cluster_name
}

# Use descriptive names when a module creates multiple resources of the same type
resource "aws_security_group" "alb" {
  name_prefix = "${var.name}-alb-"
  vpc_id      = var.vpc_id
}

resource "aws_security_group" "app" {
  name_prefix = "${var.name}-app-"
  vpc_id      = var.vpc_id
}
```

## Managing Dependencies Between Child Modules

Child modules should communicate through their inputs and outputs, never by reaching into each other's internals.

```hcl
# Root module wiring - the right way
module "networking" {
  source = "./modules/networking"
  name   = "myapp"
}

module "database" {
  source = "./modules/database"
  name   = "myapp"

  # Explicit dependency through outputs
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}

module "compute" {
  source = "./modules/compute"
  name   = "myapp"

  # Wire outputs from networking and database
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  database_host   = module.database.endpoint
  security_groups = [module.networking.app_security_group_id]
}
```

## Keeping Modules Focused

Each module should do one thing well. A common mistake is creating "god modules" that try to provision everything.

```hcl
# Bad - a module that does too much
module "everything" {
  source = "./modules/application"

  # This module creates VPC, subnets, RDS, ECS, ALB, CloudWatch alarms,
  # Route53 records, ACM certificates... all in one module.
  # This is hard to test, hard to reuse, and hard to modify.
}

# Good - separate concerns into focused modules
module "networking" {
  source = "./modules/networking"
  # Just VPC, subnets, route tables, NAT gateways
}

module "database" {
  source = "./modules/database"
  # Just RDS instance, parameter groups, security groups
}

module "compute" {
  source = "./modules/compute"
  # Just ECS cluster, task definitions, service
}

module "load_balancer" {
  source = "./modules/load-balancer"
  # Just ALB, target groups, listeners
}
```

## Using Internal Helper Modules

Sometimes a child module needs to encapsulate repeated logic that does not make sense as a standalone module. Internal helper modules work well for this.

```text
modules/
  compute/
    main.tf
    variables.tf
    outputs.tf
    modules/          # Internal helper modules
      task-definition/
        main.tf
        variables.tf
        outputs.tf
      service-discovery/
        main.tf
        variables.tf
        outputs.tf
```

```hcl
# modules/compute/main.tf - Using an internal helper module
module "task_definition" {
  source = "./modules/task-definition"

  name          = var.name
  image         = var.container_image
  cpu           = var.cpu
  memory        = var.memory
  port_mappings = var.port_mappings
}

resource "aws_ecs_service" "this" {
  name            = local.service_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = module.task_definition.arn
  desired_count   = var.desired_count
}
```

## Documentation for Each Module

Every child module should have a README that covers its purpose, inputs, outputs, and an example.

```markdown
# Compute Module

Creates an ECS cluster and service for running containerized applications.

## Usage

module "compute" {
  source = "./modules/compute"

  name          = "my-api"
  vpc_id        = module.networking.vpc_id
  subnet_ids    = module.networking.private_subnet_ids
  instance_type = "t3.medium"
}

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Name prefix for resources | string | n/a | yes |
| vpc_id | VPC ID | string | n/a | yes |
| subnet_ids | List of subnet IDs | list(string) | n/a | yes |
| instance_type | EC2 instance type | string | "t3.medium" | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | ID of the ECS cluster |
| service_name | Name of the ECS service |
```

## Conclusion

The key to organizing child modules is consistency. Pick a directory structure, naming convention, and file layout - then stick with it across your entire codebase. Keep modules focused on a single concern, communicate between modules through outputs, and document everything. As your infrastructure grows, this discipline pays off in maintainability and team velocity.

For more on this topic, check out our guides on [how to create Terraform root modules for deployments](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-root-modules-for-deployments/view) and [how to use module composition patterns in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-composition-patterns-in-terraform/view).
