# How to Use Module for_each in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, for_each, Infrastructure as Code, DevOps, Dynamic Configuration

Description: Learn how to use the for_each meta-argument with Terraform modules to create multiple instances of a module from maps and sets with stable resource addressing.

---

The `for_each` meta-argument on module blocks lets you create multiple instances of the same module from a map or set. Each instance gets its own set of resources, its own state entries, and its own outputs. This is the recommended way to create multiple copies of a module because it gives you stable, predictable resource addresses based on map keys rather than numeric indices.

This guide covers the syntax, patterns, and real-world examples for using `for_each` with modules.

## Basic Syntax

The `for_each` argument accepts a map or a set of strings:

```hcl
# Using a map
module "vpc" {
  source   = "./modules/vpc"
  for_each = {
    dev     = { cidr = "10.0.0.0/16", az_count = 2 }
    staging = { cidr = "10.1.0.0/16", az_count = 2 }
    prod    = { cidr = "10.2.0.0/16", az_count = 3 }
  }

  vpc_cidr    = each.value.cidr
  az_count    = each.value.az_count
  environment = each.key
}
```

Inside the module block, `each.key` gives you the map key and `each.value` gives you the corresponding value.

## Using a Set of Strings

```hcl
# Create the same module for each region
module "monitoring" {
  source   = "./modules/monitoring"
  for_each = toset(["us-east-1", "us-west-2", "eu-west-1"])

  region = each.key  # For sets, each.key and each.value are the same
}
```

## Using a Variable Map

The most common pattern is to define the map in a variable:

```hcl
# variables.tf
variable "services" {
  description = "Map of service configurations"
  type = map(object({
    image         = string
    port          = number
    cpu           = number
    memory        = number
    desired_count = number
  }))
}

# terraform.tfvars
services = {
  api = {
    image         = "myapp/api:v2.1"
    port          = 8080
    cpu           = 512
    memory        = 1024
    desired_count = 3
  }
  web = {
    image         = "myapp/web:v1.8"
    port          = 3000
    cpu           = 256
    memory        = 512
    desired_count = 2
  }
  worker = {
    image         = "myapp/worker:v2.1"
    port          = 0
    cpu           = 1024
    memory        = 2048
    desired_count = 1
  }
}
```

```hcl
# main.tf
module "service" {
  source   = "./modules/ecs-service"
  for_each = var.services

  service_name  = each.key
  image         = each.value.image
  port          = each.value.port
  cpu           = each.value.cpu
  memory        = each.value.memory
  desired_count = each.value.desired_count

  cluster_id = aws_ecs_cluster.main.id
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Accessing Outputs from for_each Modules

When a module uses `for_each`, its outputs become a map keyed by the same keys:

```hcl
# Access a specific instance's output
output "api_service_url" {
  value = module.service["api"].service_url
}

# Access all instances' outputs as a map
output "all_service_urls" {
  value = { for name, svc in module.service : name => svc.service_url }
}

# Use an output from one instance in another resource
resource "aws_route53_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  type    = "CNAME"
  ttl     = 300
  records = [module.service["api"].load_balancer_dns]
}
```

## Filtering with for_each

You can filter which items to create modules for using a `for` expression:

```hcl
# Only create modules for services that have a port (skip workers)
module "load_balanced_service" {
  source   = "./modules/ecs-service-with-alb"
  for_each = { for name, svc in var.services : name => svc if svc.port > 0 }

  service_name = each.key
  port         = each.value.port
  # ...
}
```

## Multi-Environment Pattern

One of the most powerful uses is deploying the same infrastructure across multiple environments:

```hcl
variable "environments" {
  default = {
    dev = {
      instance_type = "t3.small"
      min_size      = 1
      max_size      = 2
      cidr          = "10.0.0.0/16"
    }
    staging = {
      instance_type = "t3.medium"
      min_size      = 2
      max_size      = 4
      cidr          = "10.1.0.0/16"
    }
    prod = {
      instance_type = "t3.large"
      min_size      = 3
      max_size      = 10
      cidr          = "10.2.0.0/16"
    }
  }
}

module "environment" {
  source   = "./modules/full-environment"
  for_each = var.environments

  environment   = each.key
  instance_type = each.value.instance_type
  min_size      = each.value.min_size
  max_size      = each.value.max_size
  vpc_cidr      = each.value.cidr
}

# Outputs for each environment
output "environment_endpoints" {
  value = { for env, mod in module.environment : env => mod.endpoint }
}
```

## State Addresses with for_each

Resources inside a `for_each` module have addresses that include the map key:

```
module.service["api"].aws_ecs_service.this
module.service["web"].aws_ecs_service.this
module.service["worker"].aws_ecs_service.this
```

This is why `for_each` is preferred over `count` for modules. If you remove the "web" service, Terraform only destroys the web resources. With `count`, removing an item from the middle of a list would cause index shifting and potentially destroy and recreate resources.

## Converting Existing Resources to for_each

If you have multiple separate module blocks that you want to consolidate:

```hcl
# Before: separate module blocks
module "vpc_dev" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}

module "vpc_staging" {
  source = "./modules/vpc"
  cidr   = "10.1.0.0/16"
}

# After: single module block with for_each
module "vpc" {
  source   = "./modules/vpc"
  for_each = {
    dev     = "10.0.0.0/16"
    staging = "10.1.0.0/16"
  }

  cidr = each.value
}
```

To migrate without destroying resources, use `moved` blocks:

```hcl
moved {
  from = module.vpc_dev
  to   = module.vpc["dev"]
}

moved {
  from = module.vpc_staging
  to   = module.vpc["staging"]
}
```

## Limitations

**Keys must be known at plan time.** The map or set you pass to `for_each` must be fully known before Terraform creates resources. You cannot use values that are "known after apply" as keys:

```hcl
# This will NOT work if instance IDs are not known yet
module "monitoring" {
  for_each = { for inst in aws_instance.servers : inst.id => inst }
  # Error: for_each keys include values not known until after apply
}
```

Workaround: use a value that is known at plan time as the key:

```hcl
# Use the index or a static key instead
module "monitoring" {
  for_each = { for idx, inst in var.server_configs : inst.name => inst }
}
```

**All instances share the same provider.** You cannot dynamically assign different providers to different `for_each` instances.

**All instances use the same source.** Every instance of the module uses the same source and version.

## Combining for_each with Conditional Logic

```hcl
# Create modules only for environments that are enabled
variable "environments" {
  type = map(object({
    enabled       = bool
    instance_type = string
  }))
}

module "env" {
  source   = "./modules/environment"
  for_each = { for k, v in var.environments : k => v if v.enabled }

  name          = each.key
  instance_type = each.value.instance_type
}
```

## Nested for_each

You can use `for_each` at multiple levels, but the keys at each level must be independent:

```hcl
# Outer module: one per environment
module "env" {
  source   = "./modules/environment"
  for_each = var.environments

  environment = each.key
  vpc_cidr    = each.value.cidr
}

# Inner module (inside ./modules/environment): one service per environment
# modules/environment/main.tf
module "service" {
  source   = "./modules/ecs-service"
  for_each = var.services

  service_name = each.key
  vpc_id       = aws_vpc.this.id
}
```

## Summary

Module `for_each` is the standard way to create multiple instances of a module in Terraform. Use maps for structured data (where each instance needs different configuration) and sets for simple lists (where only the name varies). The map keys become part of the resource address in state, making additions and removals safe. Access outputs from specific instances with `module.name["key"].output_name`, or iterate over all instances with a `for` expression. Remember that keys must be known at plan time, and use `moved` blocks when migrating from separate module blocks to `for_each`.

For the alternative approach, see [How to Use Module count in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-count-in-terraform/view). For dependency management, check out [How to Use Module depends_on in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-depends-on-in-terraform/view).
