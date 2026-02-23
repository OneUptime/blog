# How to Pass Maps of Objects as Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Maps, Objects, Modules, Infrastructure as Code

Description: Learn how to define, pass, and use map of objects variables in Terraform to create multiple resources from structured configuration data with type safety and validation.

---

Maps of objects are one of the most powerful variable types in Terraform. They let you define a collection of structured items where each item has a unique key and a consistent set of attributes. This is the natural way to express things like "create these three services," "provision these five databases," or "configure these security group rules."

This post shows how to define, pass, validate, and use map of objects variables effectively.

## Defining a Map of Objects Variable

A map of objects uses `map(object({...}))` as the type constraint:

```hcl
variable "databases" {
  description = "Map of databases to create"
  type = map(object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  }))
}
```

Each entry in the map has a string key and an object value with the specified attributes. The key serves as the identifier for the resource.

## Passing Values

In a tfvars file:

```hcl
# terraform.tfvars
databases = {
  orders = {
    engine         = "postgres"
    engine_version = "15.4"
    instance_class = "db.r5.large"
    storage_gb     = 200
    multi_az       = true
  }
  users = {
    engine         = "postgres"
    engine_version = "15.4"
    instance_class = "db.r5.xlarge"
    storage_gb     = 500
    multi_az       = true
  }
  analytics = {
    engine         = "mysql"
    engine_version = "8.0.35"
    instance_class = "db.r5.2xlarge"
    storage_gb     = 1000
    multi_az       = false
  }
}
```

When calling a module:

```hcl
module "databases" {
  source = "./modules/rds"

  databases = {
    orders = {
      engine         = "postgres"
      engine_version = "15.4"
      instance_class = "db.r5.large"
      storage_gb     = 200
      multi_az       = true
    }
  }
}
```

## Using Maps of Objects with for_each

The primary use case for maps of objects is creating multiple resources with `for_each`:

```hcl
variable "databases" {
  type = map(object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  }))
}

resource "aws_db_instance" "this" {
  for_each = var.databases

  identifier        = "${var.project}-${var.environment}-${each.key}"
  engine            = each.value.engine
  engine_version    = each.value.engine_version
  instance_class    = each.value.instance_class
  allocated_storage = each.value.storage_gb
  multi_az          = each.value.multi_az

  db_name  = each.key
  username = "admin"
  password = var.db_passwords[each.key]

  tags = merge(local.common_tags, {
    Name     = "${var.project}-${var.environment}-${each.key}"
    Database = each.key
  })
}
```

Terraform creates one RDS instance per map entry. The key (orders, users, analytics) becomes the resource identifier in state: `aws_db_instance.this["orders"]`.

## Optional Attributes

Not every entry needs to specify every attribute. Use `optional()` with defaults:

```hcl
variable "services" {
  description = "Map of services to deploy"
  type = map(object({
    image         = string
    port          = number
    cpu           = optional(number, 256)
    memory        = optional(number, 512)
    replicas      = optional(number, 1)
    command       = optional(list(string), [])
    environment   = optional(map(string), {})
    health_path   = optional(string, "/health")
    public        = optional(bool, false)
    min_replicas  = optional(number, 1)
    max_replicas  = optional(number, 4)
  }))
}
```

Callers can specify just what they need:

```hcl
services = {
  api = {
    image    = "myapp/api:v2.1.0"
    port     = 8080
    cpu      = 1024
    memory   = 2048
    replicas = 3
    public   = true
    environment = {
      DB_HOST = "db.internal"
    }
  }
  worker = {
    image = "myapp/worker:v2.1.0"
    port  = 9090
    # Everything else uses defaults
  }
  cron = {
    image   = "myapp/cron:v2.1.0"
    port    = 8081
    command = ["/app/cron", "--schedule", "*/5 * * * *"]
  }
}
```

## Validating Maps of Objects

Validate each entry's attributes:

```hcl
variable "services" {
  type = map(object({
    image    = string
    port     = number
    cpu      = optional(number, 256)
    memory   = optional(number, 512)
    replicas = optional(number, 1)
  }))

  # Validate port range for all services
  validation {
    condition = alltrue([
      for name, svc in var.services : svc.port >= 1 && svc.port <= 65535
    ])
    error_message = "All service ports must be between 1 and 65535."
  }

  # Validate CPU is a Fargate-compatible value
  validation {
    condition = alltrue([
      for name, svc in var.services : contains([256, 512, 1024, 2048, 4096], svc.cpu)
    ])
    error_message = "CPU must be a valid Fargate value: 256, 512, 1024, 2048, or 4096."
  }

  # Validate no duplicate ports
  validation {
    condition = (
      length(values({ for name, svc in var.services : name => svc.port })) ==
      length(toset(values({ for name, svc in var.services : name => svc.port })))
    )
    error_message = "Each service must use a unique port."
  }

  # Validate service names are DNS-compatible
  validation {
    condition = alltrue([
      for name, svc in var.services : can(regex("^[a-z][a-z0-9-]*$", name))
    ])
    error_message = "Service names must be lowercase, start with a letter, and contain only letters, numbers, and hyphens."
  }
}
```

## Transforming Maps in Locals

Sometimes you need to reshape the data before using it:

```hcl
variable "services" {
  type = map(object({
    image    = string
    port     = number
    replicas = number
    public   = bool
  }))
}

locals {
  # Filter to only public services
  public_services = {
    for name, svc in var.services : name => svc
    if svc.public
  }

  # Filter to only internal services
  internal_services = {
    for name, svc in var.services : name => svc
    if !svc.public
  }

  # Create a flat list of all ports for security group rules
  service_ports = [for name, svc in var.services : svc.port]

  # Calculate total resource requirements
  total_cpu = sum([for name, svc in var.services : svc.cpu * svc.replicas])
  total_memory = sum([for name, svc in var.services : svc.memory * svc.replicas])
}

# Create ALB target groups only for public services
resource "aws_lb_target_group" "public" {
  for_each = local.public_services

  name        = "${var.project}-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path = "/health"
    port = each.value.port
  }
}
```

## Creating Related Resources from a Single Map

One map can drive the creation of several related resource types:

```hcl
variable "services" {
  type = map(object({
    image       = string
    port        = number
    cpu         = number
    memory      = number
    replicas    = number
    environment = optional(map(string), {})
  }))
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "this" {
  for_each = var.services

  family                   = "${var.project}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory

  container_definitions = jsonencode([{
    name  = each.key
    image = each.value.image
    portMappings = [{
      containerPort = each.value.port
    }]
    environment = [
      for k, v in each.value.environment : { name = k, value = v }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.this[each.key].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = each.key
      }
    }
  }])
}

# ECS Services
resource "aws_ecs_service" "this" {
  for_each = var.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.this[each.key].arn
  desired_count   = each.value.replicas
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.service[each.key].id]
  }
}

# Log Groups
resource "aws_cloudwatch_log_group" "this" {
  for_each = var.services

  name              = "/ecs/${var.project}/${each.key}"
  retention_in_days = var.log_retention_days
}

# Security Groups
resource "aws_security_group" "service" {
  for_each = var.services

  name        = "${var.project}-${each.key}-sg"
  description = "Security group for ${each.key} service"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = each.value.port
    to_port     = each.value.port
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "${each.key} service port"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

All four resource types iterate over the same map. Adding a new service means adding one entry to the map - all the associated resources get created automatically.

## Merging Maps of Objects

You can merge defaults with overrides:

```hcl
locals {
  default_service_config = {
    cpu      = 256
    memory   = 512
    replicas = 1
    public   = false
  }

  # Merge defaults into each service
  services_with_defaults = {
    for name, svc in var.services : name => merge(local.default_service_config, svc)
  }
}
```

## Outputting Maps of Objects

Return computed results from maps:

```hcl
output "service_endpoints" {
  description = "Map of service names to their internal endpoints"
  value = {
    for name, svc in var.services :
    name => "http://${name}.${var.service_domain}:${svc.port}"
  }
}

output "service_arns" {
  description = "Map of service names to their ECS service ARNs"
  value = {
    for name, svc in aws_ecs_service.this : name => svc.id
  }
}
```

## Summary

Maps of objects are the go-to variable type for defining collections of related resources in Terraform. The map key serves as a stable identifier for `for_each`, the object structure ensures type safety, and `optional()` attributes keep the caller's input minimal. Validate the entire map with `alltrue()` and `for` expressions. Transform the data in locals when you need filtered subsets or reshaped structures. This pattern scales cleanly from 2 services to 20 without changing any of the resource definitions.

For more on structured Terraform variables, see our post on [passing structured data through variables](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-structured-data-through-variables-in-terraform/view).
