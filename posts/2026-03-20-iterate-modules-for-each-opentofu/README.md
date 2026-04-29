# How to Iterate Over Modules with for_each in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Module, for_each, HCL, Module Composition

Description: Learn how to use for_each on module blocks in OpenTofu to create multiple instances of a module from a map of configurations, enabling DRY multi-environment and multi-service deployments.

## Introduction

Just like resource blocks, module blocks support `for_each`. This lets you instantiate a module multiple times with different configurations, creating entire stacks of infrastructure for multiple environments, regions, or services from a single module call.

## Basic Module for_each

```hcl
variable "environments" {
  type = map(object({
    vpc_cidr      = string
    instance_type = string
    min_size      = number
    max_size      = number
  }))
  default = {
    "dev" = {
      vpc_cidr      = "10.10.0.0/16"
      instance_type = "t3.micro"
      min_size      = 1
      max_size      = 3
    }
    "prod" = {
      vpc_cidr      = "10.0.0.0/16"
      instance_type = "m5.large"
      min_size      = 3
      max_size      = 15
    }
  }
}

# Create one complete application stack per environment

module "app_stack" {
  for_each = var.environments
  source   = "./modules/app-stack"

  environment   = each.key
  vpc_cidr      = each.value.vpc_cidr
  instance_type = each.value.instance_type
  min_size      = each.value.min_size
  max_size      = each.value.max_size

  aws_region    = var.aws_region
  project_name  = var.project_name
}
```

## Accessing Module Outputs from for_each

```hcl
# Collect outputs from all module instances
output "vpc_ids" {
  description = "VPC ID for each environment"
  value = {
    for env, stack in module.app_stack : env => stack.vpc_id
  }
}

output "load_balancer_dns_names" {
  value = {
    for env, stack in module.app_stack : env => stack.lb_dns_name
  }
}

# Reference a specific environment's output
output "prod_vpc_id" {
  value = module.app_stack["prod"].vpc_id
}
```

## Multi-Region Module Instantiation

```hcl
variable "regional_configs" {
  type = map(object({
    enabled       = bool
    primary       = bool
    instance_type = string
  }))
  default = {
    "us-east-1"    = { enabled = true,  primary = true,  instance_type = "m5.large" }
    "eu-west-1"    = { enabled = true,  primary = false, instance_type = "t3.large" }
    "ap-southeast-1" = { enabled = false, primary = false, instance_type = "t3.medium" }
  }
}

provider "aws" {
  alias    = "regional"
  for_each = var.regional_configs
  region   = each.key
}

module "regional_deployment" {
  for_each = {
    # Only create module instances for enabled regions
    for region, config in var.regional_configs : region => config
    if config.enabled
  }

  source = "./modules/regional-stack"
  providers = {
    aws = aws.regional[each.key]
  }

  region        = each.key
  is_primary    = each.value.primary
  instance_type = each.value.instance_type
}
```

## Microservices with Shared Module

```hcl
variable "services" {
  type = map(object({
    port          = number
    cpu           = number
    memory        = number
    image_tag     = string
    desired_count = number
  }))
  default = {
    "api"       = { port = 8080, cpu = 512,  memory = 1024, image_tag = "v1.2.0", desired_count = 3 }
    "worker"    = { port = 9090, cpu = 1024, memory = 2048, image_tag = "v1.2.0", desired_count = 2 }
    "scheduler" = { port = 9091, cpu = 256,  memory = 512,  image_tag = "v1.2.0", desired_count = 1 }
  }
}

module "ecs_service" {
  for_each = var.services
  source   = "./modules/ecs-service"

  service_name    = each.key
  cluster_arn     = aws_ecs_cluster.main.arn
  port            = each.value.port
  cpu             = each.value.cpu
  memory          = each.value.memory
  image           = "${var.ecr_url}/${each.key}:${each.value.image_tag}"
  desired_count   = each.value.desired_count

  vpc_id          = aws_vpc.main.id
  subnet_ids      = aws_subnet.private[*].id
  lb_listener_arn = aws_lb_listener.https.arn
}
```

## Conclusion

Module `for_each` is the most powerful DRY pattern in OpenTofu - it lets you define infrastructure once as a module and instantiate it as many times as needed from a structured data map. Combined with output collection using `for` expressions, this pattern scales elegantly from two environments to dozens without any code changes to the module itself.
