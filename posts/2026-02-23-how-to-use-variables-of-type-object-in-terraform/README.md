# How to Use Variables of Type Object in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Objects, HCL, Infrastructure as Code

Description: Learn how to use object-type variables in Terraform to group related configuration into structured types with defined attributes, types, and defaults.

---

Object variables in Terraform let you group related attributes into a single structured variable with defined keys and types. Instead of having five separate variables for your database configuration, you can have one `database` variable that holds the engine, version, instance class, storage, and multi-AZ setting together. This makes your module interfaces cleaner and your configurations easier to understand.

This post covers how to declare object variables, use them in resources, provide values, and take advantage of features like optional attributes.

## Declaring Object Variables

An object type specifies a fixed set of attributes, each with its own type:

```hcl
# variables.tf

variable "database" {
  description = "RDS database configuration"
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
}
```

Every attribute listed in the type definition is required by default. The caller must provide all of them unless you set a default value for the entire variable.

## Setting Default Values

You can provide a default for the whole object:

```hcl
variable "database" {
  description = "RDS database configuration"
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
  default = {
    engine         = "postgres"
    engine_version = "15.4"
    instance_class = "db.t3.medium"
    storage_gb     = 50
    multi_az       = false
  }
}
```

With a default, the caller can omit the variable entirely and get these values. But if they provide the variable at all, they must provide the complete object - you cannot partially override individual attributes (unless you use `optional()`, covered later in the post).

## Using Object Variables in Resources

Access object attributes with dot notation:

```hcl
# main.tf

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}-db"
  engine         = var.database.engine
  engine_version = var.database.engine_version
  instance_class = var.database.instance_class

  allocated_storage = var.database.storage_gb
  storage_type      = "gp3"
  storage_encrypted = true

  multi_az = var.database.multi_az

  username = "admin"
  password = var.db_password

  skip_final_snapshot = var.environment != "prod"

  tags = {
    Name        = "${var.project}-${var.environment}-db"
    Environment = var.environment
  }
}
```

## Providing Object Values

### In terraform.tfvars

```hcl
# terraform.tfvars

database = {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
  storage_gb     = 200
  multi_az       = true
}
```

### On the Command Line

```bash
terraform apply -var='database={engine="postgres", engine_version="15.4", instance_class="db.r6g.large", storage_gb=200, multi_az=true}'
```

### In JSON

```json
{
  "database": {
    "engine": "postgres",
    "engine_version": "15.4",
    "instance_class": "db.r6g.large",
    "storage_gb": 200,
    "multi_az": true
  }
}
```

### Via Environment Variable

```bash
export TF_VAR_database='{"engine":"postgres","engine_version":"15.4","instance_class":"db.r6g.large","storage_gb":200,"multi_az":true}'
```

## Objects vs Separate Variables

Here is the same configuration expressed both ways.

### Multiple Separate Variables

```hcl
variable "db_engine" {
  type    = string
  default = "postgres"
}

variable "db_engine_version" {
  type    = string
  default = "15.4"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "db_storage_gb" {
  type    = number
  default = 50
}

variable "db_multi_az" {
  type    = bool
  default = false
}
```

### Single Object Variable

```hcl
variable "database" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
  default = {
    engine         = "postgres"
    engine_version = "15.4"
    instance_class = "db.t3.medium"
    storage_gb     = 50
    multi_az       = false
  }
}
```

The object approach groups related settings together, reducing clutter and making the relationship between attributes clear. It is especially valuable in modules with many configuration options.

## Objects with Mixed Types

Object attributes can have different types, including collections:

```hcl
variable "app_config" {
  description = "Application deployment configuration"
  type = object({
    name           = string
    replicas       = number
    cpu            = number
    memory_mb      = number
    port           = number
    enable_https   = bool
    env_vars       = map(string)
    allowed_cidrs  = list(string)
  })
  default = {
    name          = "web-app"
    replicas      = 2
    cpu           = 256
    memory_mb     = 512
    port          = 8080
    enable_https  = true
    env_vars      = {}
    allowed_cidrs = ["0.0.0.0/0"]
  }
}
```

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = var.app_config.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.app_config.cpu
  memory                   = var.app_config.memory_mb

  container_definitions = jsonencode([
    {
      name      = var.app_config.name
      image     = "${var.ecr_repo}/${var.app_config.name}:latest"
      essential = true
      portMappings = [
        {
          containerPort = var.app_config.port
          protocol      = "tcp"
        }
      ]
      environment = [
        for key, value in var.app_config.env_vars : {
          name  = key
          value = value
        }
      ]
    }
  ])
}
```

## Map of Objects

One of the most powerful patterns is a map of objects, where each key represents an instance of a configuration:

```hcl
variable "services" {
  description = "Service configurations"
  type = map(object({
    port     = number
    replicas = number
    cpu      = number
    memory   = number
  }))
  default = {
    api = {
      port     = 8080
      replicas = 3
      cpu      = 512
      memory   = 1024
    }
    web = {
      port     = 80
      replicas = 2
      cpu      = 256
      memory   = 512
    }
    worker = {
      port     = 9090
      replicas = 1
      cpu      = 1024
      memory   = 2048
    }
  }
}

# Create an ECS service for each entry
resource "aws_ecs_service" "services" {
  for_each = var.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.replicas
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [aws_security_group.services[each.key].id]
  }
}
```

## List of Objects

Similarly, a list of objects is useful when order matters or items do not have unique names:

```hcl
variable "ingress_rules" {
  description = "Security group ingress rules"
  type = list(object({
    description = string
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    {
      description = "HTTP from anywhere"
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "HTTPS from anywhere"
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "SSH from office"
      port        = 22
      protocol    = "tcp"
      cidr_blocks = ["203.0.113.0/24"]
    },
  ]
}

resource "aws_security_group" "app" {
  name        = "${var.project}-app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

## Validation on Object Variables

You can validate individual attributes of an object:

```hcl
variable "database" {
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })

  validation {
    condition     = contains(["postgres", "mysql", "mariadb"], var.database.engine)
    error_message = "Database engine must be postgres, mysql, or mariadb."
  }

  validation {
    condition     = var.database.storage_gb >= 20 && var.database.storage_gb <= 65536
    error_message = "Storage must be between 20 and 65536 GB."
  }

  validation {
    condition     = can(regex("^db\\.", var.database.instance_class))
    error_message = "Instance class must start with 'db.' prefix."
  }
}
```

## Wrapping Up

Object variables bring structure and clarity to your Terraform configurations. They group related settings into a single variable with explicit types for each attribute, making your module interfaces self-documenting. Combined with maps and lists, objects let you build sophisticated configuration schemas that catch errors at plan time rather than at apply time. For even more flexibility, check out our post on [optional attributes in object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-optional-attributes-in-object-variables-in-terraform/view) and [nested object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-nested-object-variables-in-terraform/view).
