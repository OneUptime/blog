# How to Build a Multi-Tenant SaaS Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Multi-Tenant, SaaS, AWS, Cloud Architecture

Description: Learn how to build multi-tenant SaaS infrastructure with Terraform covering tenant isolation, shared resources, per-tenant databases, billing metering, and auto-scaling.

---

Building a multi-tenant SaaS platform is fundamentally different from building a single-tenant application. You need to think about tenant isolation, noisy neighbor problems, per-tenant billing, data partitioning, and the ability to onboard new tenants without manual infrastructure changes. Terraform is the right tool for this because it lets you templatize your infrastructure and provision tenant resources automatically.

## The Multi-Tenancy Spectrum

There are three main approaches to multi-tenancy. Silo model gives each tenant their own resources - maximum isolation but highest cost. Pool model shares everything - lowest cost but complex isolation. Bridge model mixes both - shared compute but isolated databases. We will build a bridge model that balances cost and isolation.

## Architecture Overview

Our multi-tenant SaaS includes:

- Shared ECS cluster for compute
- Per-tenant database schemas or isolated databases for premium tenants
- Cognito with tenant-scoped authentication
- API Gateway with tenant routing
- DynamoDB for tenant metadata and billing
- S3 with tenant-prefixed storage
- CloudWatch with per-tenant metrics

## Tenant Metadata Store

Start with a table that tracks all tenant configurations.

```hcl
# Tenant metadata table
resource "aws_dynamodb_table" "tenants" {
  name         = "tenant-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenantId"

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "tier"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "tier-index"
    hash_key        = "tier"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Purpose = "tenant-management"
  }
}

# Billing and usage metering table
resource "aws_dynamodb_table" "usage_metering" {
  name         = "tenant-usage"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenantId"
  range_key    = "timestamp"

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}
```

## Tenant Authentication

Use Cognito with custom attributes for tenant isolation.

```hcl
# Cognito User Pool with tenant awareness
resource "aws_cognito_user_pool" "main" {
  name = "saas-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Custom attribute for tenant ID
  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    mutable             = false
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  schema {
    name                = "tenant_role"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 32
    }
  }

  # Pre-token generation trigger to add tenant claims
  lambda_config {
    pre_token_generation = aws_lambda_function.pre_token.arn
  }
}

# Lambda to inject tenant info into JWT tokens
resource "aws_lambda_function" "pre_token" {
  filename         = "pre_token.zip"
  function_name    = "cognito-pre-token-generation"
  role             = aws_iam_role.pre_token.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5

  environment {
    variables = {
      TENANT_TABLE = aws_dynamodb_table.tenants.name
    }
  }
}

# Per-tenant resource servers for fine-grained scopes
resource "aws_cognito_resource_server" "api" {
  identifier   = "https://api.company.com"
  name         = "SaaS API"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access to tenant resources"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access to tenant resources"
  }

  scope {
    scope_name        = "admin"
    scope_description = "Administrative access"
  }
}
```

## Shared Compute with ECS

All tenants share the same ECS cluster, with task-level isolation.

```hcl
# Shared ECS cluster
resource "aws_ecs_cluster" "main" {
  name = "saas-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

# ECS task definition for the main application
resource "aws_ecs_task_definition" "app" {
  family                   = "saas-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "${var.ecr_repository_url}:${var.app_version}"
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    environment = [
      { name = "DATABASE_HOST", value = aws_db_instance.shared.address },
      { name = "REDIS_HOST", value = aws_elasticache_replication_group.shared.primary_endpoint_address },
      { name = "TENANT_TABLE", value = aws_dynamodb_table.tenants.name },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "app"
      }
    }
  }])
}

# ECS service with auto-scaling
resource "aws_ecs_service" "app" {
  name            = "saas-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }
}

# Auto-scaling for the ECS service
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 50
  min_capacity       = 3
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "ecs-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Database Strategy

Standard tenants share a database with schema-level isolation. Premium tenants get dedicated databases.

```hcl
# Shared database for standard tier tenants
resource "aws_db_instance" "shared" {
  identifier     = "saas-shared-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  multi_az            = true
  storage_encrypted   = true
  deletion_protection = true

  backup_retention_period = 35
  copy_tags_to_snapshot   = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = {
    Purpose = "shared-tenant-database"
    Tier    = "standard"
  }
}

# Module for premium tenant dedicated databases
# This module is called for each premium tenant
module "premium_tenant_db" {
  source   = "./modules/tenant-database"
  for_each = var.premium_tenants

  tenant_id      = each.key
  instance_class = each.value.db_instance_class
  vpc_id         = var.vpc_id
  subnet_ids     = var.database_subnet_ids
  kms_key_id     = aws_kms_key.tenant_data.arn
}

# modules/tenant-database/main.tf
# variable "tenant_id" {}
# variable "instance_class" { default = "db.r6g.large" }
#
# resource "aws_db_instance" "tenant" {
#   identifier     = "tenant-${var.tenant_id}"
#   engine         = "postgres"
#   engine_version = "15.4"
#   instance_class = var.instance_class
#   multi_az       = true
#   storage_encrypted   = true
#   kms_key_id          = var.kms_key_id
#   deletion_protection = true
# }
```

## Tenant-Isolated Storage

S3 with bucket policies that enforce tenant-level access.

```hcl
# Shared S3 bucket with tenant prefixes
resource "aws_s3_bucket" "tenant_data" {
  bucket = "saas-tenant-data-${var.environment}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tenant_data" {
  bucket = aws_s3_bucket.tenant_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tenant_data.arn
    }
    bucket_key_enabled = true
  }
}

# IAM policy that restricts access to tenant prefix
resource "aws_iam_policy" "tenant_s3_access" {
  name = "tenant-s3-scoped-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
      ]
      Resource = [
        "${aws_s3_bucket.tenant_data.arn}/$${aws:PrincipalTag/tenantId}/*",
      ]
      Condition = {
        StringLike = {
          "s3:prefix" = ["$${aws:PrincipalTag/tenantId}/*"]
        }
      }
    }]
  })
}
```

## API Gateway with Tenant Routing

The API layer extracts tenant context and routes accordingly.

```hcl
# API Gateway with tenant-aware routing
resource "aws_apigatewayv2_api" "saas" {
  name          = "saas-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "saas" {
  api_id      = aws_apigatewayv2_api.saas.id
  name        = "$default"
  auto_deploy = true

  # Per-tenant rate limiting via stage variables
  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}

# Tenant-aware authorizer
resource "aws_apigatewayv2_authorizer" "tenant" {
  api_id           = aws_apigatewayv2_api.saas.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "tenant-jwt-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.app.id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}
```

## Per-Tenant Monitoring

Track resource usage per tenant for billing and capacity planning.

```hcl
# Custom CloudWatch metrics per tenant
resource "aws_cloudwatch_log_metric_filter" "tenant_requests" {
  name           = "tenant-request-count"
  pattern        = "{ $.tenantId = \"*\" }"
  log_group_name = aws_cloudwatch_log_group.app.name

  metric_transformation {
    name          = "TenantRequestCount"
    namespace     = "SaaS/Tenants"
    value         = "1"
    dimensions    = { TenantId = "$.tenantId" }
    default_value = "0"
  }
}

# Alarm for noisy neighbor detection
resource "aws_cloudwatch_metric_alarm" "noisy_tenant" {
  alarm_name          = "noisy-tenant-detection"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TenantRequestCount"
  namespace           = "SaaS/Tenants"
  period              = 300
  statistic           = "Sum"
  threshold           = 10000  # requests per 5 minutes
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
}

resource "aws_sns_topic" "ops_alerts" {
  name = "saas-operations-alerts"
}
```

## Wrapping Up

Multi-tenant SaaS infrastructure requires thoughtful design at every layer. Authentication needs tenant context. Databases need isolation strategies. Storage needs scoped access. Compute needs to be shared efficiently without noisy neighbor problems.

Terraform makes this manageable by letting you templatize tenant infrastructure. Standard tenants share resources. Premium tenants get dedicated databases provisioned by a module. The entire setup scales horizontally as you onboard more tenants.

For monitoring your multi-tenant SaaS platform with per-tenant dashboards and noisy neighbor detection, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-multi-tenant-saas-infrastructure-with-terraform/view) for SaaS observability.
