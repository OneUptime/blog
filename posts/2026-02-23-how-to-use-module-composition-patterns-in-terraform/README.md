# How to Use Module Composition Patterns in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Composition, Design Patterns, Infrastructure as Code

Description: Explore practical module composition patterns in Terraform including layered architecture, facade modules, and hub-and-spoke designs for scalable infrastructure.

---

Module composition is how you build complex infrastructure from simple, reusable building blocks. The pattern you choose determines how flexible, testable, and maintainable your Terraform code will be. This guide walks through the most useful composition patterns with real examples you can adapt for your own projects.

## What Is Module Composition?

Module composition is the practice of combining smaller, focused modules into larger configurations. Instead of one monolithic configuration that creates everything, you build a hierarchy of modules that each handle one responsibility and pass data between them through inputs and outputs.

The key principle is that modules should be loosely coupled - they communicate through well-defined interfaces rather than by sharing state or reaching into each other's internals.

## Pattern 1: Layered Architecture

The layered pattern organizes modules by infrastructure layers, where each layer builds on top of the one below it.

```hcl
# Layer 1: Foundation (networking, DNS, shared resources)
module "foundation" {
  source = "./modules/foundation"

  environment = var.environment
  region      = var.aws_region
  vpc_cidr    = var.vpc_cidr
}

# Layer 2: Data (databases, caches, message queues)
module "data" {
  source = "./modules/data"

  environment = var.environment
  vpc_id      = module.foundation.vpc_id
  subnet_ids  = module.foundation.data_subnet_ids
}

# Layer 3: Application (compute, load balancers, services)
module "application" {
  source = "./modules/application"

  environment   = var.environment
  vpc_id        = module.foundation.vpc_id
  subnet_ids    = module.foundation.app_subnet_ids
  db_endpoint   = module.data.db_endpoint
  cache_endpoint = module.data.cache_endpoint
}

# Layer 4: Edge (CDN, WAF, API gateways)
module "edge" {
  source = "./modules/edge"

  environment      = var.environment
  alb_arn          = module.application.alb_arn
  domain_name      = var.domain_name
  hosted_zone_id   = module.foundation.hosted_zone_id
}
```

The layers form a clear dependency chain: edge depends on application, application depends on data, and data depends on foundation. This makes the deployment order obvious and prevents circular dependencies.

## Pattern 2: Facade Module

A facade module wraps multiple lower-level modules behind a simple interface. This is useful when you want to hide complexity from consumers.

```hcl
# modules/web-application/main.tf
# This facade module creates a complete web application stack
# Consumers only need to provide a few high-level inputs

variable "name" {
  description = "Application name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "container_image" {
  description = "Docker image for the application"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

# Internally, the facade composes multiple modules
module "networking" {
  source = "../networking"

  name        = var.name
  environment = var.environment
  vpc_cidr    = "10.0.0.0/16"
}

module "database" {
  source = "../database"

  name        = var.name
  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.private_subnet_ids
}

module "compute" {
  source = "../compute"

  name            = var.name
  environment     = var.environment
  container_image = var.container_image
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  db_endpoint     = module.database.endpoint
}

module "load_balancer" {
  source = "../load-balancer"

  name        = var.name
  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.public_subnet_ids
  target_arn  = module.compute.target_group_arn
  domain_name = var.domain_name
}

# Simple outputs hide the internal complexity
output "url" {
  value = "https://${var.domain_name}"
}

output "database_endpoint" {
  value     = module.database.endpoint
  sensitive = true
}
```

From the consumer's perspective, the facade is simple:

```hcl
# Using the facade - clean and straightforward
module "my_app" {
  source = "./modules/web-application"

  name            = "my-api"
  environment     = "production"
  container_image = "my-api:v1.2.3"
  domain_name     = "api.example.com"
}
```

## Pattern 3: Hub and Spoke

The hub-and-spoke pattern has a central "hub" module that provides shared resources, with "spoke" modules that consume those resources independently.

```hcl
# Hub: Shared infrastructure
module "hub" {
  source = "./modules/hub"

  environment = var.environment
  vpc_cidr    = "10.0.0.0/16"
}

# Spoke 1: API service
module "api_service" {
  source = "./modules/service"

  name             = "api"
  vpc_id           = module.hub.vpc_id
  subnet_ids       = module.hub.private_subnet_ids
  service_registry = module.hub.service_registry_arn
  log_group        = module.hub.log_group_name
}

# Spoke 2: Worker service
module "worker_service" {
  source = "./modules/service"

  name             = "worker"
  vpc_id           = module.hub.vpc_id
  subnet_ids       = module.hub.private_subnet_ids
  service_registry = module.hub.service_registry_arn
  log_group        = module.hub.log_group_name
}

# Spoke 3: Scheduler service
module "scheduler_service" {
  source = "./modules/service"

  name             = "scheduler"
  vpc_id           = module.hub.vpc_id
  subnet_ids       = module.hub.private_subnet_ids
  service_registry = module.hub.service_registry_arn
  log_group        = module.hub.log_group_name
}
```

This pattern is particularly useful for microservice architectures where each service has the same basic needs but runs independently.

## Pattern 4: Conditional Composition

Use conditional logic to include or exclude modules based on configuration.

```hcl
# Toggle modules based on feature flags
variable "enable_monitoring" {
  description = "Whether to deploy monitoring infrastructure"
  type        = bool
  default     = true
}

variable "enable_cdn" {
  description = "Whether to deploy a CDN in front of the application"
  type        = bool
  default     = false
}

module "monitoring" {
  source = "./modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  alb_arn     = module.application.alb_arn
}

module "cdn" {
  source = "./modules/cdn"
  count  = var.enable_cdn ? 1 : 0

  domain_name    = var.domain_name
  origin_dns     = module.application.alb_dns_name
  certificate_arn = var.certificate_arn
}

# When referencing conditional modules, handle the case where they do not exist
output "monitoring_dashboard_url" {
  value = var.enable_monitoring ? module.monitoring[0].dashboard_url : "Monitoring not enabled"
}
```

## Pattern 5: Factory Pattern with for_each

Create multiple similar resources using a single module definition with `for_each`.

```hcl
# Define multiple services with a map
variable "services" {
  description = "Map of services to deploy"
  type = map(object({
    image        = string
    cpu          = number
    memory       = number
    port         = number
    replicas     = number
    health_path  = string
  }))
}

# Factory: Create one module instance per service
module "services" {
  source   = "./modules/ecs-service"
  for_each = var.services

  name         = each.key
  environment  = var.environment
  image        = each.value.image
  cpu          = each.value.cpu
  memory       = each.value.memory
  port         = each.value.port
  replicas     = each.value.replicas
  health_path  = each.value.health_path
  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.private_subnet_ids
  cluster_id   = module.cluster.id
}
```

```hcl
# terraform.tfvars - Define the services
services = {
  api = {
    image       = "myapp/api:v1.0.0"
    cpu         = 512
    memory      = 1024
    port        = 8080
    replicas    = 3
    health_path = "/health"
  }
  web = {
    image       = "myapp/web:v1.0.0"
    cpu         = 256
    memory      = 512
    port        = 3000
    replicas    = 2
    health_path = "/"
  }
  worker = {
    image       = "myapp/worker:v1.0.0"
    cpu         = 1024
    memory      = 2048
    port        = 9090
    replicas    = 2
    health_path = "/ready"
  }
}
```

## Pattern 6: Data Source Composition

Sometimes modules need to look up existing resources rather than creating them. Use data sources within modules to connect to resources managed elsewhere.

```hcl
# modules/app-on-existing-infra/main.tf
# This module deploys an app onto existing infrastructure
# It looks up shared resources by tags or names

data "aws_vpc" "selected" {
  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Use the discovered resources
resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn

  network_configuration {
    subnets = data.aws_subnets.private.ids
  }
}
```

## Choosing the Right Pattern

There is no single best pattern. Here is a quick guide:

- **Layered**: Best for traditional three-tier applications with clear dependencies
- **Facade**: Best when you want to simplify a complex stack for consumers
- **Hub and Spoke**: Best for microservices that share common infrastructure
- **Conditional**: Best when infrastructure varies by environment or feature flags
- **Factory**: Best when you have many similar resources with different configurations
- **Data Source**: Best when deploying into existing infrastructure managed by another team

Most real-world projects use a combination. You might have a layered architecture at the top level, with facade modules for each layer, and factory patterns within those facades for deploying multiple instances of the same service.

## Conclusion

Good module composition makes Terraform codebases manageable even at scale. Start simple with the layered pattern, and introduce more sophisticated patterns as your needs grow. The goal is always clarity - anyone looking at your root module should be able to understand the overall architecture within a few minutes.

For more on this topic, check out our guides on [how to organize child modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-child-modules-in-terraform/view) and [how to create Terraform modules for multi-cloud](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-multi-cloud/view).
