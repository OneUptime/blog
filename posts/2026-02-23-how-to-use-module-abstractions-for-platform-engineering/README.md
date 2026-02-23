# How to Use Module Abstractions for Platform Engineering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Platform Engineering, Abstraction, Self-Service, Infrastructure as Code

Description: Design Terraform module abstractions that enable platform engineering with self-service infrastructure, golden paths, and guardrails for development teams.

---

Platform engineering is about building internal developer platforms that make it easy for teams to provision and manage infrastructure without needing deep expertise in every cloud service. Terraform modules are one of the most effective tools for building these platforms. The right abstractions hide complexity while still giving teams the flexibility they need.

## The Platform Engineering Module Stack

A well-designed platform has three layers of abstraction:

```
Level 3: Self-Service Modules (simplest interface, most opinionated)
  - "I want a web app"
  - "I want a database"
  - "I want a message queue"

Level 2: Component Modules (moderate flexibility)
  - ECS service with load balancer
  - RDS with security groups
  - SQS with DLQ and monitoring

Level 1: Primitive Modules (most flexible, requires expertise)
  - VPC, subnets, route tables
  - Security groups, IAM roles
  - CloudWatch alarms, SNS topics
```

Development teams use Level 3 modules for standard use cases. Platform engineers use Level 1 and 2 modules to build new Level 3 abstractions.

## Building a Self-Service Web Application Module

This is a Level 3 module. The interface is deliberately simple - a developer only needs to provide a few inputs to get a fully operational, production-ready web application.

```hcl
# modules/platform/web-app/variables.tf

variable "name" {
  description = "Application name (used for all resource naming)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,23}$", var.name))
    error_message = "Name must be 3-24 characters, lowercase, starting with a letter."
  }
}

variable "team" {
  description = "Owning team name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "container_image" {
  description = "Docker image for the application (e.g., myorg/api:v1.2.3)"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "size" {
  description = "Application size: small, medium, large"
  type        = string
  default     = "medium"

  validation {
    condition     = contains(["small", "medium", "large"], var.size)
    error_message = "Size must be small, medium, or large."
  }
}

variable "needs_database" {
  description = "Whether the application needs a PostgreSQL database"
  type        = bool
  default     = false
}

variable "needs_cache" {
  description = "Whether the application needs a Redis cache"
  type        = bool
  default     = false
}

variable "custom_domain" {
  description = "Custom domain name (optional)"
  type        = string
  default     = ""
}
```

```hcl
# modules/platform/web-app/main.tf

locals {
  # Map sizes to resource configurations
  size_configs = {
    small = {
      cpu          = 256
      memory       = 512
      desired_count = 1
      db_instance  = "db.t3.micro"
      cache_type   = "cache.t3.micro"
    }
    medium = {
      cpu          = 512
      memory       = 1024
      desired_count = 2
      db_instance  = "db.t3.medium"
      cache_type   = "cache.t3.medium"
    }
    large = {
      cpu          = 1024
      memory       = 2048
      desired_count = 3
      db_instance  = "db.r6g.large"
      cache_type   = "cache.r6g.large"
    }
  }

  config = local.size_configs[var.size]

  # Production gets extra redundancy
  is_production = var.environment == "production"

  # Standard tags applied to everything
  tags = {
    Application = var.name
    Team        = var.team
    Environment = var.environment
    ManagedBy   = "platform-terraform"
  }
}

# Look up shared platform infrastructure
data "aws_vpc" "platform" {
  filter {
    name   = "tag:Platform"
    values = ["true"]
  }
  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.platform.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.platform.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

data "aws_ecs_cluster" "platform" {
  cluster_name = "${var.environment}-platform"
}

# The ECS service - using a Level 2 module internally
module "service" {
  source = "../../components/ecs-service"

  name            = "${var.name}-${var.environment}"
  cluster_id      = data.aws_ecs_cluster.platform.id
  cluster_name    = data.aws_ecs_cluster.platform.cluster_name
  container_image = var.container_image
  container_port  = var.container_port
  cpu             = local.config.cpu
  memory          = local.config.memory
  desired_count   = local.is_production ? local.config.desired_count * 2 : local.config.desired_count
  vpc_id          = data.aws_vpc.platform.id
  subnet_ids      = data.aws_subnets.private.ids

  environment_variables = merge(
    {
      ENVIRONMENT = var.environment
      APP_NAME    = var.name
    },
    var.needs_database ? {
      DB_HOST = module.database[0].endpoint
      DB_PORT = tostring(module.database[0].port)
      DB_NAME = module.database[0].database_name
    } : {},
    var.needs_cache ? {
      REDIS_HOST = module.cache[0].endpoint
      REDIS_PORT = tostring(module.cache[0].port)
    } : {}
  )

  secrets = var.needs_database ? {
    DB_PASSWORD = module.database[0].secret_arn
  } : {}

  enable_autoscaling     = local.is_production
  max_count              = local.config.desired_count * 4
  target_cpu_utilization = 70

  tags = local.tags
}

# Load balancer
module "alb" {
  source = "../../components/alb"

  name             = "${var.name}-${var.environment}"
  vpc_id           = data.aws_vpc.platform.id
  public_subnet_ids = data.aws_subnets.public.ids
  target_group_arn = module.service.target_group_arn
  certificate_arn  = var.custom_domain != "" ? module.certificate[0].arn : data.aws_acm_certificate.platform.arn

  tags = local.tags
}

# Optional database
module "database" {
  source = "../../components/rds"
  count  = var.needs_database ? 1 : 0

  name           = "${var.name}-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = local.config.db_instance
  vpc_id         = data.aws_vpc.platform.id
  subnet_ids     = data.aws_subnets.private.ids
  multi_az       = local.is_production

  allowed_security_group_ids = [module.service.security_group_id]

  tags = local.tags
}

# Optional cache
module "cache" {
  source = "../../components/elasticache"
  count  = var.needs_cache ? 1 : 0

  name           = "${var.name}-${var.environment}"
  engine         = "redis"
  node_type      = local.config.cache_type
  vpc_id         = data.aws_vpc.platform.id
  subnet_ids     = data.aws_subnets.private.ids
  num_cache_nodes = local.is_production ? 2 : 1

  allowed_security_group_ids = [module.service.security_group_id]

  tags = local.tags
}

# Optional custom domain
module "certificate" {
  source = "../../components/acm-certificate"
  count  = var.custom_domain != "" ? 1 : 0

  domain_name = var.custom_domain
  tags        = local.tags
}

# Monitoring is always included - not optional
module "monitoring" {
  source = "../../components/service-monitoring"

  name                   = "${var.name}-${var.environment}"
  ecs_cluster_name       = data.aws_ecs_cluster.platform.cluster_name
  ecs_service_name       = module.service.service_name
  alb_arn_suffix         = module.alb.arn_suffix
  target_group_arn_suffix = module.alb.target_group_arn_suffix
  rds_instance_id        = var.needs_database ? module.database[0].instance_id : ""
  notification_topic_arn = data.aws_sns_topic.platform_alerts.arn

  tags = local.tags
}
```

```hcl
# modules/platform/web-app/outputs.tf

output "url" {
  description = "Application URL"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${module.alb.dns_name}"
}

output "database_endpoint" {
  description = "Database endpoint (if database was requested)"
  value       = var.needs_database ? module.database[0].endpoint : "No database provisioned"
  sensitive   = true
}

output "service_name" {
  description = "ECS service name for deployments"
  value       = module.service.service_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing images"
  value       = module.service.ecr_repository_url
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = module.monitoring.dashboard_url
}
```

## How Teams Use the Platform Module

From a development team's perspective, deploying a new service is simple:

```hcl
# team-api/main.tf
# A developer only needs to write this to get a production-ready web app

module "api" {
  source = "app.terraform.io/myorg/web-app/platform"
  version = "3.0.0"

  name            = "user-api"
  team            = "backend"
  environment     = "production"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/user-api:v2.1.0"
  container_port  = 8080
  size            = "medium"
  needs_database  = true
  needs_cache     = true
  custom_domain   = "api.myapp.com"
}

# That is it. The developer gets:
# - ECS service with auto-scaling
# - Application Load Balancer with TLS
# - PostgreSQL database with automated backups
# - Redis cache
# - CloudWatch monitoring and alarms
# - Custom domain with SSL certificate
output "api_url" {
  value = module.api.url
}
```

## Enforcing Guardrails

Platform modules should enforce organizational policies automatically:

```hcl
# Inside the platform module - enforce guardrails

# All storage must be encrypted
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
  # Teams cannot disable this - it is not exposed as a variable
}

# All databases must have backups
resource "aws_db_instance" "this" {
  # ...
  backup_retention_period = max(var.backup_retention, 7)
  # Minimum 7 days regardless of what the team requests
  deletion_protection = var.environment == "production" ? true : false
  # Production databases always have deletion protection
}

# All services must have monitoring
# There is no "enable_monitoring" variable - it is always on
module "monitoring" {
  source = "../../components/service-monitoring"
  # ...
}
```

## Golden Paths

Platform modules define "golden paths" - the recommended way to do things. Teams follow the golden path by default and only deviate when they have a specific need.

```hcl
# The golden path for a web service includes:
# 1. Container orchestration (ECS Fargate)
# 2. Load balancing (ALB)
# 3. Database (RDS PostgreSQL)
# 4. Caching (ElastiCache Redis)
# 5. Monitoring (CloudWatch + SNS)
# 6. CI/CD (CodePipeline + CodeBuild)
# 7. DNS (Route 53 + ACM)

# Teams that need something different can use Level 2 modules directly
# but the golden path covers 90% of use cases
```

## Versioning Platform Modules

Platform modules need careful versioning because they affect many teams:

```markdown
## Platform Module Release Process

1. Develop changes on a feature branch
2. Test in a sandbox environment
3. Release as a pre-release version (v3.1.0-rc1)
4. Select 2-3 volunteer teams to test the RC
5. Fix any issues and release the stable version
6. Announce to all teams with migration notes
7. Set a deadline for upgrading (usually 90 days)
8. Deprecate old versions after the deadline
```

## Measuring Platform Adoption

Track how teams use your platform modules:

```hcl
# Add metadata to resources for tracking
locals {
  platform_metadata = {
    PlatformModuleVersion = "3.0.0"
    PlatformModuleName    = "web-app"
    ProvisionedBy         = "platform-terraform"
    TeamName              = var.team
  }
}
```

## Conclusion

Platform engineering with Terraform modules is about building the right abstractions. Level 3 self-service modules give developers a simple interface to provision infrastructure. Level 2 component modules give platform engineers building blocks. Level 1 primitives handle the raw cloud resources. The key is making the common case easy while still allowing customization when teams need it. Build guardrails into your modules so that every deployment is secure, monitored, and compliant by default.

For more on this topic, see our guides on [how to use Terraform module best practices for large organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-module-best-practices-for-large-organizations/view) and [how to use module composition patterns in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-composition-patterns-in-terraform/view).
