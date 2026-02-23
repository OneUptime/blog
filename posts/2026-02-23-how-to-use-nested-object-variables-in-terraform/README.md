# How to Use Nested Object Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Objects, Nested Types, Infrastructure as Code

Description: Learn how to design and use nested object variables in Terraform to model complex infrastructure configurations with multiple levels of structured data.

---

As your Terraform configurations grow in complexity, you will find that flat variables are not enough. Real-world infrastructure has hierarchical relationships - a VPC contains subnets, an application has services, and each service has its own configuration. Nested object variables let you model these relationships directly in your variable types, keeping related configuration grouped together in a way that mirrors the actual infrastructure.

This post shows you how to build, provide values for, and work with nested object variables effectively.

## Basic Nested Objects

A nested object is simply an object that contains another object (or list of objects, or map of objects) as one of its attributes:

```hcl
# variables.tf

variable "vpc_config" {
  description = "VPC and network configuration"
  type = object({
    cidr_block = string
    dns = object({
      enable_hostnames = bool
      enable_support   = bool
    })
    tags = map(string)
  })
  default = {
    cidr_block = "10.0.0.0/16"
    dns = {
      enable_hostnames = true
      enable_support   = true
    }
    tags = {
      ManagedBy = "terraform"
    }
  }
}
```

You access nested attributes with chained dot notation:

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_config.cidr_block
  enable_dns_hostnames = var.vpc_config.dns.enable_hostnames
  enable_dns_support   = var.vpc_config.dns.enable_support

  tags = var.vpc_config.tags
}
```

## Real-World Example: Application Stack

Here is a nested object that models an entire application deployment:

```hcl
variable "application" {
  description = "Full application stack configuration"
  type = object({
    name        = string
    environment = string

    # Compute settings
    compute = object({
      instance_type = string
      min_size      = number
      max_size      = number
      desired_size  = number
    })

    # Database settings
    database = object({
      engine         = string
      engine_version = string
      instance_class = string
      storage_gb     = number
      multi_az       = bool
      backup = object({
        retention_days = number
        window         = string
      })
    })

    # Cache settings
    cache = object({
      node_type       = string
      num_cache_nodes = number
      engine_version  = string
    })

    # Networking
    networking = object({
      vpc_cidr           = string
      public_subnet_cidrs  = list(string)
      private_subnet_cidrs = list(string)
    })
  })
}
```

And providing values:

```hcl
# production.tfvars

application = {
  name        = "web-store"
  environment = "production"

  compute = {
    instance_type = "t3.xlarge"
    min_size      = 3
    max_size      = 20
    desired_size  = 5
  }

  database = {
    engine         = "postgres"
    engine_version = "15.4"
    instance_class = "db.r6g.xlarge"
    storage_gb     = 500
    multi_az       = true
    backup = {
      retention_days = 35
      window         = "03:00-04:00"
    }
  }

  cache = {
    node_type       = "cache.r6g.large"
    num_cache_nodes = 3
    engine_version  = "7.0"
  }

  networking = {
    vpc_cidr             = "10.0.0.0/16"
    public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
    private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  }
}
```

Using the nested values in resources:

```hcl
# main.tf

resource "aws_vpc" "main" {
  cidr_block           = var.application.networking.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.application.name}-vpc"
    Environment = var.application.environment
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.application.name}-db"
  engine         = var.application.database.engine
  engine_version = var.application.database.engine_version
  instance_class = var.application.database.instance_class

  allocated_storage = var.application.database.storage_gb
  multi_az          = var.application.database.multi_az

  backup_retention_period = var.application.database.backup.retention_days
  backup_window           = var.application.database.backup.window

  tags = {
    Name        = "${var.application.name}-db"
    Environment = var.application.environment
  }
}

resource "aws_elasticache_cluster" "main" {
  cluster_id      = "${var.application.name}-cache"
  engine          = "redis"
  engine_version  = var.application.cache.engine_version
  node_type       = var.application.cache.node_type
  num_cache_nodes = var.application.cache.num_cache_nodes

  tags = {
    Name        = "${var.application.name}-cache"
    Environment = var.application.environment
  }
}
```

## Lists of Nested Objects

When you have multiple items, each with nested structure:

```hcl
variable "services" {
  description = "Application services to deploy"
  type = list(object({
    name     = string
    port     = number
    replicas = number
    resources = object({
      cpu    = number
      memory = number
    })
    health_check = object({
      path     = string
      interval = number
      timeout  = number
    })
    environment_variables = map(string)
  }))
  default = []
}
```

```hcl
# terraform.tfvars

services = [
  {
    name     = "api"
    port     = 8080
    replicas = 3
    resources = {
      cpu    = 512
      memory = 1024
    }
    health_check = {
      path     = "/health"
      interval = 30
      timeout  = 5
    }
    environment_variables = {
      LOG_LEVEL = "info"
      DB_POOL   = "10"
    }
  },
  {
    name     = "worker"
    port     = 9090
    replicas = 2
    resources = {
      cpu    = 1024
      memory = 2048
    }
    health_check = {
      path     = "/ready"
      interval = 60
      timeout  = 10
    }
    environment_variables = {
      CONCURRENCY = "5"
    }
  },
]
```

Iterating over nested structures:

```hcl
# Convert to map for stable resource addresses
locals {
  services_map = {
    for svc in var.services : svc.name => svc
  }
}

resource "aws_ecs_task_definition" "services" {
  for_each = local.services_map

  family                   = each.key
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.resources.cpu
  memory                   = each.value.resources.memory

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${var.ecr_repo}/${each.key}:${var.image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = each.value.port
          protocol      = "tcp"
        }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.port}${each.value.health_check.path} || exit 1"]
        interval    = each.value.health_check.interval
        timeout     = each.value.health_check.timeout
        retries     = 3
        startPeriod = 60
      }
      environment = [
        for key, value in each.value.environment_variables : {
          name  = key
          value = value
        }
      ]
    }
  ])
}
```

## Maps of Nested Objects

A map of nested objects is perfect when each item has a unique identifier:

```hcl
variable "databases" {
  description = "Database configurations keyed by name"
  type = map(object({
    engine = object({
      type    = string
      version = string
    })
    sizing = object({
      instance_class = string
      storage_gb     = number
    })
    availability = object({
      multi_az       = bool
      read_replicas  = number
    })
  }))
  default = {}
}
```

```hcl
# terraform.tfvars

databases = {
  users = {
    engine = {
      type    = "postgres"
      version = "15.4"
    }
    sizing = {
      instance_class = "db.r6g.large"
      storage_gb     = 100
    }
    availability = {
      multi_az      = true
      read_replicas = 2
    }
  }
  analytics = {
    engine = {
      type    = "postgres"
      version = "15.4"
    }
    sizing = {
      instance_class = "db.r6g.xlarge"
      storage_gb     = 500
    }
    availability = {
      multi_az      = true
      read_replicas = 1
    }
  }
}
```

```hcl
resource "aws_db_instance" "databases" {
  for_each = var.databases

  identifier     = "${var.project}-${each.key}"
  engine         = each.value.engine.type
  engine_version = each.value.engine.version
  instance_class = each.value.sizing.instance_class

  allocated_storage = each.value.sizing.storage_gb
  multi_az          = each.value.availability.multi_az

  tags = {
    Name     = "${var.project}-${each.key}"
    Database = each.key
  }
}
```

## Flattening Nested Structures

Sometimes you need to flatten nested structures for iteration:

```hcl
variable "environments" {
  type = map(object({
    region = string
    services = map(object({
      replicas = number
      port     = number
    }))
  }))
}

locals {
  # Flatten into a single-level map for for_each
  all_services = merge([
    for env_name, env in var.environments : {
      for svc_name, svc in env.services :
      "${env_name}-${svc_name}" => {
        environment = env_name
        region      = env.region
        service     = svc_name
        replicas    = svc.replicas
        port        = svc.port
      }
    }
  ]...)
}
```

## Validation for Nested Objects

```hcl
variable "application" {
  type = object({
    name = string
    database = object({
      engine     = string
      storage_gb = number
    })
  })

  validation {
    condition     = length(var.application.name) >= 3
    error_message = "Application name must be at least 3 characters."
  }

  validation {
    condition     = contains(["postgres", "mysql"], var.application.database.engine)
    error_message = "Database engine must be postgres or mysql."
  }

  validation {
    condition     = var.application.database.storage_gb >= 20
    error_message = "Database storage must be at least 20 GB."
  }
}
```

## Best Practices for Nested Objects

1. **Do not nest too deeply.** Three levels of nesting is usually the practical limit. Beyond that, consider splitting into separate variables or modules.

2. **Use meaningful attribute names.** Since nested access chains can get long (`var.app.database.backup.retention_days`), clear naming at each level helps readability.

3. **Consider splitting very large objects.** If your object has 20+ attributes, it might be better as 3-4 focused variables.

4. **Use locals to simplify access.** If you reference deeply nested values frequently, assign them to locals:

```hcl
locals {
  db      = var.application.database
  db_backup = var.application.database.backup
}

# Now use local.db.engine instead of var.application.database.engine
```

5. **Document the structure.** Complex nested types benefit from description fields and example values.

## Wrapping Up

Nested object variables let you model your infrastructure's natural hierarchy directly in Terraform's type system. They keep related configuration grouped together and make your module interfaces reflect the actual structure of what you are building. Use them for application stacks, multi-tier configurations, and anywhere the data has a natural parent-child relationship. Just keep the nesting reasonable and lean on locals to simplify deeply nested access patterns.

For more on object types, see our posts on [object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-object-in-terraform/view) and [optional attributes in objects](https://oneuptime.com/blog/post/2026-02-23-how-to-use-optional-attributes-in-object-variables-in-terraform/view).
