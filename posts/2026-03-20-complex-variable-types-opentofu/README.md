# How to Handle Complex Variable Types in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Complex Types, HCL, Infrastructure as Code, DevOps

Description: A guide to working with complex nested variable types in OpenTofu including objects, lists of objects, and maps of objects.

## Introduction

Real-world infrastructure configurations often require complex, nested variable structures. OpenTofu supports rich type constraints that enable you to define exactly the structure of data your configuration expects. This guide covers patterns for handling complex variable types.

## Nested Objects

```hcl
variable "application" {
  type = object({
    name    = string
    version = string
    web = object({
      instance_type  = string
      count          = number
      health_check = object({
        path     = string
        interval = number
        timeout  = number
      })
    })
    database = object({
      engine        = string
      instance_class = string
      storage_gb    = number
      backup_days   = number
    })
  })
}
```

```hcl
# Example value in terraform.tfvars

application = {
  name    = "myapp"
  version = "2.0"
  web = {
    instance_type = "t3.small"
    count         = 3
    health_check = {
      path     = "/health"
      interval = 30
      timeout  = 10
    }
  }
  database = {
    engine         = "postgres"
    instance_class = "db.t3.medium"
    storage_gb     = 100
    backup_days    = 7
  }
}
```

## List of Objects Pattern

```hcl
variable "microservices" {
  type = list(object({
    name          = string
    container_port = number
    cpu           = number
    memory        = number
    environment   = map(string)
    health_check  = string
  }))
  default = []
}
```

```hcl
# terraform.tfvars
microservices = [
  {
    name           = "api-server"
    container_port = 8080
    cpu            = 256
    memory         = 512
    environment    = { NODE_ENV = "production", LOG_LEVEL = "info" }
    health_check   = "/api/health"
  },
  {
    name           = "worker"
    container_port = 8081
    cpu            = 512
    memory         = 1024
    environment    = { WORKER_CONCURRENCY = "4" }
    health_check   = "/worker/health"
  }
]
```

```hcl
# Using list of objects with for_each
resource "aws_ecs_task_definition" "service" {
  for_each = { for svc in var.microservices : svc.name => svc }

  family = each.value.name

  container_definitions = jsonencode([{
    name  = each.value.name
    image = "${var.ecr_registry}/${each.value.name}:${var.image_tag}"
    portMappings = [{
      containerPort = each.value.container_port
      protocol      = "tcp"
    }]
    cpu    = each.value.cpu
    memory = each.value.memory
    environment = [
      for k, v in each.value.environment : { name = k, value = v }
    ]
    healthCheck = {
      command = ["CMD-SHELL", "curl -f http://localhost:${each.value.container_port}${each.value.health_check} || exit 1"]
    }
  }])
}
```

## Map of Objects Pattern

```hcl
variable "environments" {
  type = map(object({
    instance_type = string
    count         = number
    region        = string
    multi_az      = bool
  }))
  default = {
    dev = {
      instance_type = "t3.micro"
      count         = 1
      region        = "us-east-1"
      multi_az      = false
    }
    prod = {
      instance_type = "t3.large"
      count         = 3
      region        = "us-east-1"
      multi_az      = true
    }
  }
}

variable "environment" {
  type = string
}

# Access specific environment config
locals {
  env_config = var.environments[var.environment]
}

resource "aws_instance" "app" {
  count         = local.env_config.count
  instance_type = local.env_config.instance_type
  # ...
}
```

## Optional Attributes in Objects

```hcl
variable "server" {
  type = object({
    instance_type = string
    count         = optional(number, 1)          # Default 1 if not provided
    disk_size_gb  = optional(number, 20)         # Default 20 if not provided
    monitoring    = optional(bool, false)         # Default false
    tags          = optional(map(string), {})    # Default empty map
    eip           = optional(bool, null)          # Default null
  })
}

# Can be used with partial specification
# server = { instance_type = "t3.micro" }
# Other fields use their defaults
```

## Validation of Complex Types

```hcl
variable "firewall_rules" {
  type = list(object({
    name     = string
    port     = number
    protocol = string
    cidr     = string
  }))

  validation {
    condition = alltrue([
      for rule in var.firewall_rules :
      contains(["tcp", "udp"], rule.protocol)
    ])
    error_message = "Each firewall rule protocol must be tcp or udp."
  }

  validation {
    condition = alltrue([
      for rule in var.firewall_rules :
      rule.port >= 0 && rule.port <= 65535
    ])
    error_message = "All firewall rule ports must be between 0 and 65535."
  }
}
```

## Conclusion

Complex variable types are essential for building expressive, reusable OpenTofu modules. Using `list(object(...))` for repeating configurations, `map(object(...))` for environment-specific settings, and nested `object()` types for related configuration groups results in cleaner, more type-safe module interfaces. The `optional()` modifier for object attributes reduces the required input while maintaining type safety, making modules easier to use without sacrificing validation.
