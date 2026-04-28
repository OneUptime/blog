# How to Use Object Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Object, Structural Types, Infrastructure as Code, DevOps

Description: A guide to using object type variables in OpenTofu for structured configuration with named, typed attributes.

## Introduction

Object variables define structured types with named attributes, where each attribute can have its own type. They are used for complex configuration blocks like database configurations, network settings, and server specifications where attributes have different types.

## Declaring Object Variables

```hcl
# Basic object variable

variable "database_config" {
  type = object({
    engine          = string
    engine_version  = string
    instance_class  = string
    allocated_storage = number
    multi_az        = bool
  })
}

# Object with default
variable "server_config" {
  type = object({
    instance_type = string
    disk_size_gb  = number
    monitoring    = bool
  })
  default = {
    instance_type = "t3.micro"
    disk_size_gb  = 20
    monitoring    = false
  }
}

# Object with optional attributes (supported in all OpenTofu versions)
variable "vpc_config" {
  type = object({
    cidr_block           = string
    enable_dns_hostnames = optional(bool, true)
    enable_dns_support   = optional(bool, true)
    tags                 = optional(map(string), {})
  })
  default = {
    cidr_block = "10.0.0.0/16"
  }
}
```

## Using Object Variables

```hcl
variable "rds_config" {
  type = object({
    engine          = string
    engine_version  = string
    instance_class  = string
    storage_gb      = number
    multi_az        = bool
    backup_days     = number
    db_name         = string
  })
  default = {
    engine          = "postgres"
    engine_version  = "15.4"
    instance_class  = "db.t3.micro"
    storage_gb      = 20
    multi_az        = false
    backup_days     = 7
    db_name         = "appdb"
  }
}

resource "aws_db_instance" "main" {
  engine                  = var.rds_config.engine
  engine_version          = var.rds_config.engine_version
  instance_class          = var.rds_config.instance_class
  allocated_storage       = var.rds_config.storage_gb
  multi_az                = var.rds_config.multi_az
  backup_retention_period = var.rds_config.backup_days
  db_name                 = var.rds_config.db_name
  username                = "admin"
  password                = var.db_password
  skip_final_snapshot     = !var.rds_config.multi_az  # Skip snapshot in non-HA
}
```

## Nested Objects

```hcl
variable "application" {
  type = object({
    name    = string
    version = string
    web = object({
      instance_type  = string
      instance_count = number
      port           = number
    })
    database = object({
      engine   = string
      size     = string
      storage  = number
    })
  })
}

# Access nested attributes
resource "aws_instance" "web" {
  count         = var.application.web.instance_count
  instance_type = var.application.web.instance_type
  # ...
}
```

## List of Objects

```hcl
variable "firewall_rules" {
  type = list(object({
    name        = string
    description = string
    port        = number
    protocol    = string
    cidr        = string
  }))
  default = [
    {
      name        = "http"
      description = "HTTP traffic"
      port        = 80
      protocol    = "tcp"
      cidr        = "0.0.0.0/0"
    },
    {
      name        = "https"
      description = "HTTPS traffic"
      port        = 443
      protocol    = "tcp"
      cidr        = "0.0.0.0/0"
    }
  ]
}

resource "aws_security_group_rule" "rules" {
  count = length(var.firewall_rules)

  type              = "ingress"
  security_group_id = aws_security_group.web.id
  description       = var.firewall_rules[count.index].description
  from_port         = var.firewall_rules[count.index].port
  to_port           = var.firewall_rules[count.index].port
  protocol          = var.firewall_rules[count.index].protocol
  cidr_blocks       = [var.firewall_rules[count.index].cidr]
}
```

## Object Validation

```hcl
variable "network_config" {
  type = object({
    vpc_cidr    = string
    subnet_mask = number
  })

  validation {
    condition     = can(cidrhost(var.network_config.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid CIDR block."
  }

  validation {
    condition     = var.network_config.subnet_mask >= 16 && var.network_config.subnet_mask <= 28
    error_message = "subnet_mask must be between 16 and 28."
  }
}
```

## Conclusion

Object variables provide structured configuration that enforces type safety across multiple related attributes. Using objects instead of separate variables for related configuration reduces the number of variables, makes the relationship between values explicit, and enables passing complex configurations to modules as a single value. The `optional()` modifier for object attributes adds flexibility while maintaining type safety.
