# How to Generate Random Integers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Random Provider, Random Integer, Infrastructure as Code, Configuration

Description: Learn how to generate random integers with Terraform using the random_integer resource for port assignments, shard selection, instance counts, and configuration values.

---

The random_integer resource in Terraform generates a random integer within a specified range. While it may seem simple, this resource is incredibly useful for scenarios like assigning unique port numbers, selecting availability zones, distributing workloads across shards, and creating varied configurations for testing environments.

In this guide, we will explore the random_integer resource thoroughly. We will cover basic usage, practical examples, keeper-based regeneration, and real-world scenarios where random integers solve common infrastructure challenges.

## Understanding random_integer

The random_integer resource produces a single random integer between a minimum and maximum value (inclusive). Like all resources in the random provider, the value is generated once and stored in Terraform state. It only changes when the resource is tainted, destroyed and recreated, or when its keepers change.

## Basic Setup

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Generating a Basic Random Integer

```hcl
# basic.tf - Simple random integer generation
resource "random_integer" "example" {
  min = 1
  max = 100
}

output "random_number" {
  description = "A random number between 1 and 100"
  value       = random_integer.example.result
}
```

## Assigning Random Port Numbers

A common use case is assigning unique port numbers to services in development environments:

```hcl
# ports.tf - Assign random ports to development services
variable "dev_services" {
  type    = list(string)
  default = ["api", "frontend", "admin", "worker"]
}

resource "random_integer" "service_port" {
  for_each = toset(var.dev_services)

  min = 8000
  max = 9999

  # Regenerate when the service name changes
  keepers = {
    service = each.value
  }
}

# Use the random ports in ECS task definitions
resource "aws_ecs_task_definition" "dev_service" {
  for_each = toset(var.dev_services)

  family                   = "${each.value}-dev"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([{
    name  = each.value
    image = "app/${each.value}:latest"
    portMappings = [{
      containerPort = random_integer.service_port[each.value].result
      protocol      = "tcp"
    }]
  }])
}

output "service_ports" {
  description = "Assigned ports for each service"
  value = {
    for k, v in random_integer.service_port : k => v.result
  }
}
```

## Selecting Random Availability Zones

Use random integers to distribute resources across availability zones:

```hcl
# az-selection.tf - Randomly select availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_integer" "az_index" {
  min = 0
  max = length(data.aws_availability_zones.available.names) - 1

  keepers = {
    # Regenerate when the environment changes
    environment = var.environment
  }
}

variable "environment" {
  type    = string
  default = "staging"
}

locals {
  selected_az = data.aws_availability_zones.available.names[random_integer.az_index.result]
}

resource "aws_instance" "app" {
  ami               = "ami-12345678"
  instance_type     = "t3.medium"
  availability_zone = local.selected_az

  tags = {
    Name = "app-${var.environment}"
    AZ   = local.selected_az
  }
}

output "selected_az" {
  value = local.selected_az
}
```

## Generating Random Delays for Staggered Operations

Stagger cron job schedules to avoid thundering herd problems:

```hcl
# stagger.tf - Random offsets for cron schedules
variable "cron_jobs" {
  type    = list(string)
  default = ["backup", "cleanup", "report", "sync"]
}

# Generate a random minute offset for each cron job
resource "random_integer" "cron_minute" {
  for_each = toset(var.cron_jobs)

  min = 0
  max = 59

  keepers = {
    job_name = each.value
  }
}

# Generate a random second within the minute
resource "random_integer" "cron_second" {
  for_each = toset(var.cron_jobs)

  min = 0
  max = 59

  keepers = {
    job_name = each.value
  }
}

# Create CloudWatch Event rules with staggered schedules
resource "aws_cloudwatch_event_rule" "cron" {
  for_each = toset(var.cron_jobs)

  name                = "${each.value}-schedule"
  description         = "Staggered schedule for ${each.value}"
  schedule_expression = "cron(${random_integer.cron_minute[each.value].result} * * * ? *)"
}

output "cron_schedules" {
  description = "Staggered cron minutes for each job"
  value = {
    for k, v in random_integer.cron_minute : k => "minute ${v.result} of every hour"
  }
}
```

## Random Shard Assignment

Distribute data across shards using random integers:

```hcl
# sharding.tf - Assign resources to random shards
variable "num_shards" {
  description = "Number of database shards"
  type        = number
  default     = 8
}

variable "tenants" {
  description = "List of tenant identifiers"
  type        = list(string)
  default     = ["tenant-a", "tenant-b", "tenant-c", "tenant-d", "tenant-e"]
}

resource "random_integer" "shard_assignment" {
  for_each = toset(var.tenants)

  min = 0
  max = var.num_shards - 1

  keepers = {
    tenant    = each.value
    num_shards = var.num_shards
  }
}

# Store shard assignments in SSM
resource "aws_ssm_parameter" "shard_map" {
  name  = "/config/shard-assignments"
  type  = "String"
  value = jsonencode({
    for k, v in random_integer.shard_assignment : k => v.result
  })
}

output "shard_assignments" {
  description = "Tenant to shard mapping"
  value = {
    for k, v in random_integer.shard_assignment : k => "shard-${v.result}"
  }
}
```

## Random Instance Sizing for Testing

Generate varied instance configurations for load testing:

```hcl
# testing.tf - Random configurations for test environments
variable "instance_sizes" {
  type    = list(string)
  default = ["t3.micro", "t3.small", "t3.medium", "t3.large"]
}

resource "random_integer" "instance_size_index" {
  min = 0
  max = length(var.instance_sizes) - 1

  keepers = {
    # Change size on each test run
    test_run = var.test_run_id
  }
}

variable "test_run_id" {
  type    = string
  default = "run-001"
}

resource "random_integer" "instance_count" {
  min = 2
  max = 10

  keepers = {
    test_run = var.test_run_id
  }
}

output "test_config" {
  value = {
    instance_type  = var.instance_sizes[random_integer.instance_size_index.result]
    instance_count = random_integer.instance_count.result
  }
}
```

## Using Keepers Effectively

Keepers determine when the random integer regenerates:

```hcl
# keepers.tf - Different keeper strategies
# Regenerate on every deployment
resource "random_integer" "per_deploy" {
  min = 1000
  max = 9999
  keepers = {
    deploy_time = timestamp()
  }
}

# Regenerate when infrastructure changes
resource "random_integer" "per_change" {
  min = 1
  max = 100
  keepers = {
    vpc_id    = var.vpc_id
    subnet_id = var.subnet_id
  }
}

variable "vpc_id" {
  type    = string
  default = "vpc-12345"
}

variable "subnet_id" {
  type    = string
  default = "subnet-12345"
}

# Never regenerate (no keepers - stays in state forever)
resource "random_integer" "stable" {
  min = 1
  max = 1000
}
```

## Conclusion

The random_integer resource is deceptively powerful. From port assignments to shard distribution to staggered scheduling, random integers solve many common infrastructure challenges. The key to using them effectively is choosing the right range for your use case and using keepers to control when values regenerate. For other types of random values, explore our guides on [random IDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-ids-with-terraform/view) and [random shuffled lists](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-shuffled-lists-with-terraform/view).
