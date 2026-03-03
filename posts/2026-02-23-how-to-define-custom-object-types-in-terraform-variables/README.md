# How to Define Custom Object Types in Terraform Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Types, Variables, Objects

Description: Learn how to define custom object types in Terraform variables to create well-structured, validated, and self-documenting infrastructure configurations.

---

When your Terraform variables start getting complex - a server needs a name, an instance type, a list of ports, a flag for monitoring - passing these as separate variables gets messy fast. Custom object types let you bundle related configuration into a single, well-typed variable that Terraform validates for you.

This post walks through defining object types from simple to advanced, including optional attributes, nested objects, and validation patterns.

## Basic Object Type Definition

An object type specifies a set of named attributes, each with its own type:

```hcl
variable "server" {
  type = object({
    name          = string
    instance_type = string
    port          = number
    monitoring    = bool
  })

  description = "Server configuration"

  default = {
    name          = "web-01"
    instance_type = "t3.micro"
    port          = 8080
    monitoring    = true
  }
}
```

When someone provides a value for this variable, Terraform checks that:
- All required attributes are present
- Each attribute has the correct type
- No unknown attributes are included (by default)

```hcl
# In terraform.tfvars or -var flag
server = {
  name          = "api-01"
  instance_type = "t3.small"
  port          = 3000
  monitoring    = true
}
```

If someone passes the wrong type, Terraform catches it immediately:

```text
Error: Invalid value for variable

  on variables.tf line 1:
   1: variable "server" {

The given value is not suitable for variable "server": attribute
"port": a number is required.
```

## Using Object Variables in Resources

```hcl
variable "database" {
  type = object({
    engine            = string
    version           = string
    instance_class    = string
    allocated_storage = number
    multi_az          = bool
    backup_retention  = number
  })
}

resource "aws_db_instance" "main" {
  engine               = var.database.engine
  engine_version       = var.database.version
  instance_class       = var.database.instance_class
  allocated_storage    = var.database.allocated_storage
  multi_az             = var.database.multi_az
  backup_retention_period = var.database.backup_retention

  db_name  = "myapp"
  username = "admin"
  password = var.db_password
}
```

## Optional Attributes

Since Terraform 1.3, you can mark object attributes as optional and provide defaults:

```hcl
variable "server" {
  type = object({
    # Required attributes
    name          = string
    instance_type = string

    # Optional attributes with defaults
    monitoring    = optional(bool, false)
    volume_size   = optional(number, 20)
    volume_type   = optional(string, "gp3")
    tags          = optional(map(string), {})
  })
}
```

Now users only need to provide the required fields:

```hcl
# Minimal configuration - optional fields use defaults
server = {
  name          = "web-01"
  instance_type = "t3.micro"
}
# monitoring = false, volume_size = 20, volume_type = "gp3", tags = {}

# Full configuration - override any defaults
server = {
  name          = "web-01"
  instance_type = "t3.large"
  monitoring    = true
  volume_size   = 100
  volume_type   = "io2"
  tags          = { Team = "platform" }
}
```

### Optional Without Defaults

If you use `optional()` without a default value, the attribute defaults to `null`:

```hcl
variable "server" {
  type = object({
    name     = string
    key_name = optional(string)  # Defaults to null if not provided
  })
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  # key_name will be omitted if null (Terraform skips null arguments)
  key_name = var.server.key_name
}
```

## Nested Object Types

Objects can contain other objects for deeply structured configuration:

```hcl
variable "app_config" {
  type = object({
    name = string

    compute = object({
      instance_type = string
      count         = number
      ami_id        = optional(string)
    })

    networking = object({
      vpc_id             = string
      subnet_ids         = list(string)
      security_group_ids = list(string)
      assign_public_ip   = optional(bool, false)
    })

    storage = object({
      root_volume = object({
        size = number
        type = optional(string, "gp3")
        iops = optional(number)
      })
      data_volumes = optional(list(object({
        device_name = string
        size        = number
        type        = optional(string, "gp3")
      })), [])
    })

    monitoring = optional(object({
      enabled       = bool
      alarm_email   = optional(string)
      log_retention = optional(number, 30)
    }), {
      enabled       = false
      alarm_email   = null
      log_retention = 30
    })
  })
}
```

Usage:

```hcl
app_config = {
  name = "production-api"

  compute = {
    instance_type = "t3.large"
    count         = 3
  }

  networking = {
    vpc_id             = "vpc-abc123"
    subnet_ids         = ["subnet-111", "subnet-222", "subnet-333"]
    security_group_ids = ["sg-web"]
    assign_public_ip   = true
  }

  storage = {
    root_volume = {
      size = 50
      type = "gp3"
    }
    data_volumes = [
      {
        device_name = "/dev/sdb"
        size        = 200
      }
    ]
  }

  monitoring = {
    enabled     = true
    alarm_email = "ops@example.com"
  }
}
```

## Lists of Custom Objects

One of the most common patterns is a list of objects:

```hcl
variable "security_group_rules" {
  type = list(object({
    description = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))

  default = [
    {
      description = "Allow HTTP"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "Allow HTTPS"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "Allow SSH from office"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["203.0.113.0/24"]
    },
  ]
}

resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.security_group_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

## Maps of Custom Objects

Maps of objects are great for named configurations like per-environment settings:

```hcl
variable "environments" {
  type = map(object({
    instance_type = string
    min_size      = number
    max_size      = number
    desired_size  = number
    enable_ssl    = bool
    domain        = optional(string)
  }))

  default = {
    dev = {
      instance_type = "t3.micro"
      min_size      = 1
      max_size      = 2
      desired_size  = 1
      enable_ssl    = false
    }
    staging = {
      instance_type = "t3.small"
      min_size      = 2
      max_size      = 4
      desired_size  = 2
      enable_ssl    = true
      domain        = "staging.example.com"
    }
    production = {
      instance_type = "t3.large"
      min_size      = 3
      max_size      = 10
      desired_size  = 3
      enable_ssl    = true
      domain        = "api.example.com"
    }
  }
}

# Use with the current workspace
locals {
  env_config = var.environments[terraform.workspace]
}
```

## Adding Validation to Object Variables

```hcl
variable "server" {
  type = object({
    name          = string
    instance_type = string
    port          = number
    environment   = string
  })

  # Validate individual attributes
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]+$", var.server.name))
    error_message = "Server name must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }

  validation {
    condition     = var.server.port >= 1 && var.server.port <= 65535
    error_message = "Port must be between 1 and 65535."
  }

  validation {
    condition     = contains(["dev", "staging", "production"], var.server.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}
```

### Validating Lists of Objects

```hcl
variable "servers" {
  type = list(object({
    name = string
    port = number
  }))

  # Validate that all names are unique
  validation {
    condition     = length(var.servers) == length(distinct([for s in var.servers : s.name]))
    error_message = "All server names must be unique."
  }

  # Validate that all ports are in valid range
  validation {
    condition     = alltrue([for s in var.servers : s.port >= 1 && s.port <= 65535])
    error_message = "All ports must be between 1 and 65535."
  }
}
```

## Object Type Design Patterns

### Configuration Preset Pattern

Define presets that users can reference by name:

```hcl
variable "size" {
  type        = string
  description = "Server size preset: small, medium, or large"
  default     = "small"

  validation {
    condition     = contains(["small", "medium", "large"], var.size)
    error_message = "Size must be small, medium, or large."
  }
}

locals {
  size_presets = {
    small = {
      instance_type = "t3.micro"
      volume_size   = 20
      replicas      = 1
    }
    medium = {
      instance_type = "t3.small"
      volume_size   = 50
      replicas      = 2
    }
    large = {
      instance_type = "t3.large"
      volume_size   = 100
      replicas      = 3
    }
  }

  config = local.size_presets[var.size]
}
```

### Merge Pattern for Defaults

```hcl
variable "custom_config" {
  type = object({
    instance_type = optional(string)
    volume_size   = optional(number)
    monitoring    = optional(bool)
  })
  default = {}
}

locals {
  default_config = {
    instance_type = "t3.micro"
    volume_size   = 20
    monitoring    = false
  }

  # Merge custom values over defaults
  # Custom values take precedence where provided
  final_config = {
    instance_type = coalesce(var.custom_config.instance_type, local.default_config.instance_type)
    volume_size   = coalesce(var.custom_config.volume_size, local.default_config.volume_size)
    monitoring    = coalesce(var.custom_config.monitoring, local.default_config.monitoring)
  }
}
```

### Module Interface Pattern

When building reusable modules, object types serve as the module's API:

```hcl
# modules/web-app/variables.tf

variable "app" {
  type = object({
    name = string

    container = object({
      image = string
      tag   = string
      port  = number
      env   = optional(map(string), {})
    })

    scaling = optional(object({
      min_replicas = number
      max_replicas = number
      cpu_target   = optional(number, 70)
    }), {
      min_replicas = 1
      max_replicas = 3
      cpu_target   = 70
    })

    ingress = optional(object({
      enabled     = bool
      domain      = optional(string)
      annotations = optional(map(string), {})
    }), {
      enabled     = false
      domain      = null
      annotations = {}
    })
  })

  description = "Application configuration"
}
```

Calling the module:

```hcl
module "api" {
  source = "./modules/web-app"

  app = {
    name = "api"

    container = {
      image = "myapp/api"
      tag   = "v1.2.3"
      port  = 8080
      env = {
        DATABASE_URL = local.database_url
      }
    }

    scaling = {
      min_replicas = 3
      max_replicas = 10
    }

    ingress = {
      enabled = true
      domain  = "api.example.com"
    }
  }
}
```

## Summary

Custom object types turn loose collections of variables into structured, validated, self-documenting configurations. Use `optional()` with defaults to reduce boilerplate for callers. Nest objects for complex configurations. Combine with `list()` and `map()` for collections of structured items. Add validation rules to catch errors before they hit your cloud provider. The result is Terraform code that is easier to use, harder to misconfigure, and clearer about what it expects.
