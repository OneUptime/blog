# How to Pass Structured Data Through Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Data Structures, Modules, Infrastructure as Code

Description: Learn how to define and pass complex data structures like objects, lists of objects, and nested maps through Terraform variables for flexible and type-safe module interfaces.

---

Terraform variables are not limited to simple strings and numbers. You can pass objects, lists of objects, maps, and deeply nested structures. This is essential when building reusable modules that need to accept complex configuration from their callers.

This post covers the type system for structured variables, how to define them, how to pass them, and how to use them inside your modules.

## Object Variables

An object type specifies a set of named attributes, each with their own type.

```hcl
variable "database" {
  description = "Database configuration"
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
}
```

The caller passes this as a block:

```hcl
# terraform.tfvars or module call
database = {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r5.large"
  storage_gb     = 100
  multi_az       = true
}
```

Inside the module, access attributes with dot notation:

```hcl
resource "aws_db_instance" "main" {
  engine            = var.database.engine
  engine_version    = var.database.engine_version
  instance_class    = var.database.instance_class
  allocated_storage = var.database.storage_gb
  multi_az          = var.database.multi_az
}
```

## Optional Attributes with Defaults

Terraform supports `optional()` for object attributes that do not need to be provided by the caller:

```hcl
variable "database" {
  description = "Database configuration"
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = optional(number, 20)          # Defaults to 20
    multi_az       = optional(bool, false)          # Defaults to false
    backup_days    = optional(number, 7)            # Defaults to 7
    port           = optional(number, 5432)         # Defaults to 5432
    storage_type   = optional(string, "gp3")        # Defaults to gp3
    tags           = optional(map(string), {})      # Defaults to empty map
  })
}
```

Now the caller only needs to specify the required fields:

```hcl
# Minimal usage - optional fields use defaults
database = {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
}

# Full usage - override everything
database = {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r5.large"
  storage_gb     = 500
  multi_az       = true
  backup_days    = 30
  port           = 5432
  storage_type   = "io2"
  tags           = { Team = "platform" }
}
```

## List of Objects

When you need to define multiple items of the same structure, use a list of objects:

```hcl
variable "ingress_rules" {
  description = "Security group ingress rules"
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}
```

The caller passes a list:

```hcl
ingress_rules = [
  {
    port        = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  },
  {
    port        = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "SSH from VPN"
  },
  {
    port        = 8080
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "API from VPC"
  }
]
```

Use the list in your resources:

```hcl
resource "aws_security_group_rule" "ingress" {
  count             = length(var.ingress_rules)
  type              = "ingress"
  security_group_id = aws_security_group.main.id

  from_port   = var.ingress_rules[count.index].port
  to_port     = var.ingress_rules[count.index].port
  protocol    = var.ingress_rules[count.index].protocol
  cidr_blocks = var.ingress_rules[count.index].cidr_blocks
  description = var.ingress_rules[count.index].description
}
```

Or better, convert to a map for `for_each`:

```hcl
locals {
  ingress_map = {
    for i, rule in var.ingress_rules :
    "${rule.protocol}-${rule.port}" => rule
  }
}

resource "aws_security_group_rule" "ingress" {
  for_each          = local.ingress_map
  type              = "ingress"
  security_group_id = aws_security_group.main.id

  from_port   = each.value.port
  to_port     = each.value.port
  protocol    = each.value.protocol
  cidr_blocks = each.value.cidr_blocks
  description = each.value.description
}
```

## Map of Objects

A map of objects is often better than a list because the keys serve as identifiers:

```hcl
variable "services" {
  description = "Map of ECS services to create"
  type = map(object({
    image       = string
    port        = number
    cpu         = number
    memory      = number
    replicas    = number
    environment = optional(map(string), {})
  }))
}
```

The caller provides named entries:

```hcl
services = {
  api = {
    image    = "myapp/api:v1.2.3"
    port     = 8080
    cpu      = 512
    memory   = 1024
    replicas = 3
    environment = {
      LOG_LEVEL = "info"
      DB_HOST   = "db.internal"
    }
  }
  worker = {
    image    = "myapp/worker:v1.2.3"
    port     = 9090
    cpu      = 256
    memory   = 512
    replicas = 2
  }
  web = {
    image    = "myapp/web:v1.2.3"
    port     = 3000
    cpu      = 256
    memory   = 512
    replicas = 2
    environment = {
      API_URL = "http://api.internal:8080"
    }
  }
}
```

The map key becomes the resource identifier with `for_each`:

```hcl
resource "aws_ecs_service" "this" {
  for_each = var.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.this[each.key].arn
  desired_count   = each.value.replicas
  launch_type     = "FARGATE"
}

resource "aws_ecs_task_definition" "this" {
  for_each = var.services

  family                   = each.key
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  network_mode             = "awsvpc"

  container_definitions = jsonencode([{
    name  = each.key
    image = each.value.image
    portMappings = [{
      containerPort = each.value.port
      protocol      = "tcp"
    }]
    environment = [
      for key, value in each.value.environment : {
        name  = key
        value = value
      }
    ]
  }])
}
```

## Nested Structures

You can nest objects inside objects for deeply structured data:

```hcl
variable "app_config" {
  description = "Complete application configuration"
  type = object({
    name = string
    compute = object({
      instance_type = string
      min_count     = number
      max_count     = number
    })
    networking = object({
      vpc_cidr     = string
      public       = bool
      domain_name  = optional(string)
    })
    database = optional(object({
      engine         = string
      instance_class = string
      storage_gb     = number
    }))
    cache = optional(object({
      engine    = string
      node_type = string
      num_nodes = number
    }))
  })
}
```

Usage in tfvars:

```hcl
app_config = {
  name = "orderservice"
  compute = {
    instance_type = "t3.medium"
    min_count     = 2
    max_count     = 10
  }
  networking = {
    vpc_cidr    = "10.0.0.0/16"
    public      = false
    domain_name = "orders.internal.example.com"
  }
  database = {
    engine         = "postgres"
    instance_class = "db.r5.large"
    storage_gb     = 200
  }
  # cache is omitted - it will be null
}
```

Access nested values:

```hcl
resource "aws_instance" "app" {
  instance_type = var.app_config.compute.instance_type
  # ...
}

# Conditionally create database only if configured
resource "aws_db_instance" "main" {
  count = var.app_config.database != null ? 1 : 0

  engine            = var.app_config.database.engine
  instance_class    = var.app_config.database.instance_class
  allocated_storage = var.app_config.database.storage_gb
}

# Conditionally create cache only if configured
resource "aws_elasticache_cluster" "main" {
  count = var.app_config.cache != null ? 1 : 0

  engine    = var.app_config.cache.engine
  node_type = var.app_config.cache.node_type
  num_cache_nodes = var.app_config.cache.num_nodes
}
```

## Tuple Types

Tuples are like lists but each element can have a different type:

```hcl
variable "priority_config" {
  description = "Priority name, weight, and enabled flag"
  type        = tuple([string, number, bool])
  default     = ["high", 100, true]
}
```

Tuples are rarely used in practice. Objects with named attributes are almost always more readable.

## The any Type

When you need maximum flexibility, use `any`:

```hcl
variable "extra_config" {
  description = "Additional configuration passed through to the application"
  type        = any
  default     = {}
}
```

Use `any` sparingly. It bypasses type checking, so you lose the safety that structured types provide. It is useful for pass-through values that the module does not need to inspect.

## Transforming Structured Variables in Locals

You often need to reshape structured data for use with specific resources:

```hcl
variable "users" {
  type = map(object({
    email  = string
    groups = list(string)
    admin  = bool
  }))
}

locals {
  # Flatten the user-group relationships for for_each
  user_group_pairs = flatten([
    for username, user in var.users : [
      for group in user.groups : {
        username = username
        group    = group
        email    = user.email
      }
    ]
  ])

  # Convert to a map for for_each
  user_group_map = {
    for pair in local.user_group_pairs :
    "${pair.username}-${pair.group}" => pair
  }

  # Extract just the admin users
  admin_users = {
    for username, user in var.users : username => user
    if user.admin
  }
}
```

## Summary

Structured variables let you pass complex configuration into Terraform modules with full type safety. Use objects for fixed-structure data, maps of objects for collections with named entries, and lists of objects for ordered sequences. Take advantage of `optional()` with defaults to minimize what callers need to specify. Always transform structured data in locals before using it in resources, and validate the structure with validation blocks to catch errors early.

For more on Terraform variables, check out our post on [passing maps of objects as variables](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-maps-of-objects-as-variables-in-terraform/view).
