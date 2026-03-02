# How to Use Abstract Resource Patterns in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Design Pattern, Modules, Abstraction, Infrastructure as Code

Description: Learn how to create abstract resource patterns in Terraform using modules, variable-driven composition, and factory patterns to build reusable infrastructure components.

---

Terraform does not have classes or interfaces like a programming language, but you can still build abstract patterns that let you define a resource template once and stamp out variations. The idea is to create modules with well-defined inputs that produce different infrastructure configurations based on what you pass in. Think of it as infrastructure templates rather than object-oriented abstraction.

This guide covers practical patterns for building abstract, reusable resource definitions in Terraform.

## The Factory Module Pattern

A factory module takes a configuration object and produces a complete set of resources. Instead of defining each resource individually, you describe what you want and the module figures out the resources:

```hcl
# modules/service/variables.tf

variable "service_config" {
  description = "Service configuration object"
  type = object({
    name           = string
    type           = string    # "web", "worker", "cron"
    container_image = string
    container_port  = optional(number, 8080)
    cpu            = optional(number, 256)
    memory         = optional(number, 512)
    replicas       = optional(number, 2)
    environment    = optional(map(string), {})
    health_check   = optional(object({
      path     = string
      interval = number
    }), { path = "/health", interval = 30 })
    expose_public  = optional(bool, false)
  })
}

variable "platform" {
  description = "Platform configuration from foundation"
  type = object({
    cluster_id     = string
    vpc_id         = string
    subnet_ids     = list(string)
    listener_arn   = optional(string)
    service_domain = string
  })
}
```

```hcl
# modules/service/main.tf

locals {
  # Determine which resources to create based on service type
  needs_load_balancer = var.service_config.type == "web" && var.service_config.expose_public
  needs_schedule      = var.service_config.type == "cron"
  needs_sqs_queue     = var.service_config.type == "worker"
}

# ECS task definition - created for all service types
resource "aws_ecs_task_definition" "service" {
  family                   = var.service_config.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.service_config.cpu
  memory                   = var.service_config.memory

  container_definitions = jsonencode([
    {
      name      = var.service_config.name
      image     = var.service_config.container_image
      essential = true
      portMappings = var.service_config.type == "web" ? [
        {
          containerPort = var.service_config.container_port
          protocol      = "tcp"
        }
      ] : []
      environment = [
        for key, value in var.service_config.environment : {
          name  = key
          value = value
        }
      ]
    }
  ])
}

# ECS service - for web and worker types (not cron)
resource "aws_ecs_service" "service" {
  count = var.service_config.type != "cron" ? 1 : 0

  name            = var.service_config.name
  cluster         = var.platform.cluster_id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.service_config.replicas
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.platform.subnet_ids
    security_groups = [aws_security_group.service.id]
  }

  dynamic "load_balancer" {
    for_each = local.needs_load_balancer ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.service[0].arn
      container_name   = var.service_config.name
      container_port   = var.service_config.container_port
    }
  }
}

# Load balancer target group - only for public web services
resource "aws_lb_target_group" "service" {
  count = local.needs_load_balancer ? 1 : 0

  name        = var.service_config.name
  port        = var.service_config.container_port
  protocol    = "HTTP"
  vpc_id      = var.platform.vpc_id
  target_type = "ip"

  health_check {
    path     = var.service_config.health_check.path
    interval = var.service_config.health_check.interval
  }
}

# SQS queue - only for worker services
resource "aws_sqs_queue" "work" {
  count = local.needs_sqs_queue ? 1 : 0
  name  = "${var.service_config.name}-work"
}

# Security group - created for all service types
resource "aws_security_group" "service" {
  name   = "${var.service_config.name}-sg"
  vpc_id = var.platform.vpc_id

  # Web services allow inbound on their port
  dynamic "ingress" {
    for_each = var.service_config.type == "web" ? [1] : []
    content {
      from_port   = var.service_config.container_port
      to_port     = var.service_config.container_port
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Now deploying a new service is a matter of adding a module call:

```hcl
# main.tf - Deploy multiple services using the same pattern

module "api_service" {
  source = "./modules/service"

  service_config = {
    name            = "api"
    type            = "web"
    container_image = "myrepo/api:v1.2.3"
    container_port  = 8080
    replicas        = 3
    expose_public   = true
    environment = {
      DB_HOST = module.database.endpoint
      REDIS_HOST = module.cache.endpoint
    }
  }

  platform = local.platform_config
}

module "email_worker" {
  source = "./modules/service"

  service_config = {
    name            = "email-worker"
    type            = "worker"
    container_image = "myrepo/email-worker:v1.0.0"
    cpu             = 512
    memory          = 1024
    replicas        = 2
    environment = {
      QUEUE_URL = module.email_worker.queue_url
    }
  }

  platform = local.platform_config
}
```

## The Resource Map Pattern

Instead of individual module calls, define all resources in a map and iterate:

```hcl
variable "services" {
  description = "Map of services to deploy"
  type = map(object({
    type           = string
    image          = string
    port           = optional(number, 8080)
    cpu            = optional(number, 256)
    memory         = optional(number, 512)
    replicas       = optional(number, 2)
    expose_public  = optional(bool, false)
  }))
}

# Deploy all services from the map
module "services" {
  source   = "./modules/service"
  for_each = var.services

  service_config = {
    name            = each.key
    type            = each.value.type
    container_image = each.value.image
    container_port  = each.value.port
    cpu             = each.value.cpu
    memory          = each.value.memory
    replicas        = each.value.replicas
    expose_public   = each.value.expose_public
  }

  platform = local.platform_config
}
```

```hcl
# terraform.tfvars

services = {
  api = {
    type          = "web"
    image         = "myrepo/api:v1.2.3"
    port          = 8080
    cpu           = 512
    memory        = 1024
    replicas      = 3
    expose_public = true
  }
  admin = {
    type          = "web"
    image         = "myrepo/admin:v2.0.1"
    port          = 3000
    replicas      = 2
    expose_public = true
  }
  email-worker = {
    type     = "worker"
    image    = "myrepo/email-worker:v1.0.0"
    cpu      = 512
    memory   = 1024
    replicas = 2
  }
  cleanup-job = {
    type  = "cron"
    image = "myrepo/cleanup:v1.0.0"
  }
}
```

Adding a new service is a single entry in the tfvars file. The abstract pattern handles all the resource creation.

## The Adapter Pattern

When different cloud providers or services need the same logical abstraction, create adapter modules:

```hcl
# modules/database/aws/main.tf - AWS implementation
resource "aws_db_instance" "main" {
  identifier     = var.name
  engine         = var.engine
  engine_version = var.engine_version
  instance_class = var.instance_class
  # ... AWS-specific configuration
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "port" {
  value = aws_db_instance.main.port
}
```

```hcl
# modules/database/gcp/main.tf - GCP implementation
resource "google_sql_database_instance" "main" {
  name             = var.name
  database_version = "${upper(var.engine)}_${replace(var.engine_version, ".", "_")}"
  # ... GCP-specific configuration
}

output "endpoint" {
  value = google_sql_database_instance.main.private_ip_address
}

output "port" {
  value = var.engine == "postgres" ? 5432 : 3306
}
```

```hcl
# main.tf - Choose the right adapter
module "database" {
  source = "./modules/database/${var.cloud_provider}"

  name           = "myapp-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class
}

# Consumer does not care which cloud provider
resource "kubernetes_config_map" "db" {
  metadata {
    name = "db-config"
  }
  data = {
    DB_HOST = module.database.endpoint
    DB_PORT = tostring(module.database.port)
  }
}
```

## The Composition Pattern

Build complex infrastructure by composing simple modules:

```hcl
# modules/web-app/main.tf - Composes multiple simple modules

module "networking" {
  source = "../networking"
  name   = var.name
  vpc_id = var.vpc_id
  ports  = [var.app_port, 443]
}

module "compute" {
  source = "../ecs-service"
  name           = var.name
  image          = var.container_image
  port           = var.app_port
  subnet_ids     = var.subnet_ids
  security_groups = [module.networking.security_group_id]
}

module "dns" {
  source  = "../dns-record"
  zone_id = var.zone_id
  name    = var.domain_name
  target  = module.compute.load_balancer_dns
}

module "monitoring" {
  source       = "../cloudwatch-alarms"
  service_name = module.compute.service_name
  cluster_name = module.compute.cluster_name
  sns_topic    = var.alert_topic_arn
}
```

Each sub-module is simple and testable on its own. The composition module wires them together into a complete application deployment.

## Validation in Abstract Patterns

Abstract patterns should validate their inputs to give clear error messages:

```hcl
variable "service_config" {
  type = object({
    name = string
    type = string
    # ... other fields
  })

  validation {
    condition     = contains(["web", "worker", "cron"], var.service_config.type)
    error_message = "Service type must be web, worker, or cron."
  }

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.service_config.name))
    error_message = "Service name must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }
}
```

## Wrapping Up

Abstract resource patterns in Terraform bring order to complex deployments. Factory modules produce complete resource sets from configuration objects. Resource maps let you define many instances declaratively. Adapters hide provider differences behind a common interface. Composition builds complex infrastructure from simple pieces. These patterns require upfront investment in module design, but they pay off quickly when you are managing dozens of similar resources. Start with the factory pattern for your most commonly deployed component and expand from there.
