# How to Create Self-Service Infrastructure Blueprints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Self-Service, Platform Engineering, Blueprints, Infrastructure as Code, Developer Experience

Description: Learn how to create OpenTofu infrastructure blueprints that enable teams to provision standard resources through pull requests without requiring deep cloud expertise.

---

Self-service infrastructure empowers development teams to provision what they need without waiting for the platform team. OpenTofu blueprints - opinionated, parameterized templates - are the delivery mechanism. Teams fill in a few variables and the blueprint handles all the complexity.

## Blueprint Structure

A blueprint is a module that encapsulates an entire service pattern. Teams instantiate it with service-specific variables.

```hcl
# blueprints/web-service/main.tf

# Blueprint for a standard web service with load balancer, containers, and database

variable "service_name" {
  type        = string
  description = "Unique name for this service"
}

variable "team" {
  type        = string
  description = "Team owning this service"
}

variable "environment" {
  type        = string
  description = "Target environment"
}

variable "container_image" {
  type        = string
  description = "Docker image to deploy"
}

variable "container_port" {
  type        = number
  description = "Port the container listens on"
  default     = 8080
}

variable "database_required" {
  type        = bool
  description = "Whether this service needs a database"
  default     = false
}

variable "database_engine" {
  type        = string
  description = "Database engine (postgres or mysql)"
  default     = "postgres"

  validation {
    condition     = contains(["postgres", "mysql"], var.database_engine)
    error_message = "database_engine must be postgres or mysql"
  }
}
```

## Blueprint Core Resources

```hcl
# blueprints/web-service/resources.tf
locals {
  # Tier mapping - environment determines resource sizing
  tier_config = {
    production = {
      ecs_cpu    = 1024
      ecs_memory = 2048
      db_class   = "db.t3.medium"
      min_count  = 2
      max_count  = 10
    }
    staging = {
      ecs_cpu    = 512
      ecs_memory = 1024
      db_class   = "db.t3.small"
      min_count  = 1
      max_count  = 3
    }
    development = {
      ecs_cpu    = 256
      ecs_memory = 512
      db_class   = "db.t3.micro"
      min_count  = 1
      max_count  = 1
    }
  }

  config = local.tier_config[var.environment]
}

# ECS Task Definition
resource "aws_ecs_task_definition" "service" {
  family                   = "${var.service_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = local.config.ecs_cpu
  memory                   = local.config.ecs_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name  = var.service_name
    image = var.container_image
    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]
    environment = [
      {
        name  = "SERVICE_NAME"
        value = var.service_name
      },
      {
        name  = "ENVIRONMENT"
        value = var.environment
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.service_name}-${var.environment}"
        "awslogs-region"        = data.aws_region.current.id
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# Optional database - conditionally created
resource "aws_db_instance" "service" {
  count = var.database_required ? 1 : 0

  identifier    = "${var.service_name}-${var.environment}-db"
  engine        = var.database_engine
  instance_class = local.config.db_class
  # ... remaining DB config
}
```

## Blueprint Instantiation

```hcl
# services/payment-service/main.tf
# How a team uses the blueprint - just variables

module "payment_service" {
  source = "git::https://github.com/myorg/infra-blueprints.git//web-service?ref=v3.2.0"

  service_name      = "payment-service"
  team              = "payments"
  environment       = "production"
  container_image   = "123456789012.dkr.ecr.us-east-1.amazonaws.com/payment-service:v2.1.0"
  container_port    = 8080
  database_required = true
  database_engine   = "postgres"
}

output "service_url" {
  value = module.payment_service.service_url
}
```

## Pull Request Workflow for Self-Service

````markdown
# .github/pull_request_template.md
## Infrastructure Change Request

**Service Name:**
**Team:**
**Environment:**
**Change Type:** [ ] New Service [ ] Update Service [ ] Delete Service

### Blueprint Version
Blueprint: `web-service`
Version: `v3.2.0`

### Variables
```hcl
service_name      = "my-service"
team              = "my-team"
environment       = "production"
container_image   = "..."
database_required = false
```

### Impact Assessment
- [ ] I have run `tofu plan` and reviewed the output
- [ ] This change does not affect shared infrastructure
- [ ] I have updated service documentation
````

## Best Practices

- Provide sensible defaults for all blueprint variables so teams can get started with minimal configuration.
- Include `validation` blocks to catch invalid inputs early - before teams wait for a failed `apply`.
- Publish a catalog of available blueprints with descriptions, examples, and change logs.
- Require `tofu plan` output in pull request comments for automated verification of proposed changes.
- Log all blueprint instantiations with team and purpose metadata for chargeback and capacity planning.
