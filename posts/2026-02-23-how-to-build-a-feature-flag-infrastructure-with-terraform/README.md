# How to Build a Feature Flag Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Feature Flags, Progressive Delivery, AWS AppConfig, DevOps

Description: Learn how to build feature flag infrastructure with Terraform using AWS AppConfig, DynamoDB for flag storage, real-time evaluation, and gradual rollout capabilities.

---

Feature flags decouple deployment from release. You ship code to production but keep new features hidden behind flags until you are ready to turn them on. This lets you deploy frequently without risk, test features with specific user segments, and kill problematic features instantly without a rollback. While there are plenty of SaaS feature flag services, building your own gives you full control over the data and eliminates per-seat pricing. Terraform makes the infrastructure setup repeatable.

## Why Build Your Own?

Third-party feature flag services work well but come with trade-offs. They charge per seat or per flag evaluation. Your feature flag data lives on someone else's servers. Latency for flag evaluation depends on their infrastructure. Building your own means you control costs, data residency, and performance. Plus, you deeply understand how it works when something goes wrong.

## Architecture Overview

Our feature flag infrastructure includes:

- AWS AppConfig for managed feature flag delivery
- DynamoDB for custom flag storage and evaluation
- ElastiCache Redis for low-latency flag reads
- API Gateway and Lambda for flag management API
- CloudFront for edge-cached flag distribution
- EventBridge for flag change notifications

## AWS AppConfig for Feature Flags

AppConfig provides managed feature flag functionality with built-in rollout strategies.

```hcl
# AppConfig application
resource "aws_appconfig_application" "main" {
  name        = "feature-flags"
  description = "Feature flag management"

  tags = {
    Environment = var.environment
  }
}

# Environment configuration
resource "aws_appconfig_environment" "production" {
  name           = "production"
  application_id = aws_appconfig_application.main.id
  description    = "Production environment"

  monitor {
    alarm_arn      = aws_cloudwatch_metric_alarm.feature_flag_errors.arn
    alarm_role_arn = aws_iam_role.appconfig_monitor.arn
  }
}

resource "aws_appconfig_environment" "staging" {
  name           = "staging"
  application_id = aws_appconfig_application.main.id
  description    = "Staging environment"
}

# Feature flag configuration profile
resource "aws_appconfig_configuration_profile" "flags" {
  application_id = aws_appconfig_application.main.id
  name           = "feature-flags"
  location_uri   = "hosted"
  type           = "AWS.AppConfig.FeatureFlags"

  validator {
    type = "JSON_SCHEMA"
    content = jsonencode({
      "$schema" = "http://json-schema.org/draft-07/schema#"
      type      = "object"
    })
  }
}

# Feature flag definitions
resource "aws_appconfig_hosted_configuration_version" "flags" {
  application_id           = aws_appconfig_application.main.id
  configuration_profile_id = aws_appconfig_configuration_profile.flags.configuration_profile_id
  content_type             = "application/json"

  content = jsonencode({
    version = "1"
    flags = {
      new_dashboard = {
        name = "New Dashboard"
        attributes = {
          rollout_percentage = { constraints = { type = "number", minimum = 0, maximum = 100 } }
        }
      }
      dark_mode = {
        name = "Dark Mode"
      }
      new_checkout = {
        name = "New Checkout Flow"
        attributes = {
          allowed_regions = { constraints = { type = "string" } }
        }
      }
    }
    values = {
      new_dashboard = {
        enabled = true
        rollout_percentage = 25
      }
      dark_mode = {
        enabled = true
      }
      new_checkout = {
        enabled = false
        allowed_regions = "us,eu"
      }
    }
  })
}

# Deployment strategy - gradual rollout
resource "aws_appconfig_deployment_strategy" "gradual" {
  name                           = "gradual-rollout"
  description                    = "Deploy flag changes gradually over 10 minutes"
  deployment_duration_in_minutes = 10
  final_bake_time_in_minutes     = 5
  growth_factor                  = 20
  growth_type                    = "LINEAR"
  replicate_to                   = "NONE"
}

# Immediate deployment strategy for urgent changes
resource "aws_appconfig_deployment_strategy" "immediate" {
  name                           = "immediate"
  description                    = "Deploy flag changes immediately"
  deployment_duration_in_minutes = 0
  final_bake_time_in_minutes     = 0
  growth_factor                  = 100
  growth_type                    = "LINEAR"
  replicate_to                   = "NONE"
}

# Deploy the configuration
resource "aws_appconfig_deployment" "flags" {
  application_id           = aws_appconfig_application.main.id
  configuration_profile_id = aws_appconfig_configuration_profile.flags.configuration_profile_id
  configuration_version    = aws_appconfig_hosted_configuration_version.flags.version_number
  deployment_strategy_id   = aws_appconfig_deployment_strategy.gradual.id
  environment_id           = aws_appconfig_environment.production.environment_id
  description              = "Deploy feature flags"
}
```

## Custom Flag Storage with DynamoDB

For more advanced use cases, build a custom flag evaluation system.

```hcl
# Feature flags table
resource "aws_dynamodb_table" "feature_flags" {
  name         = "feature-flags"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "flagKey"
  range_key    = "environment"

  attribute {
    name = "flagKey"
    type = "S"
  }

  attribute {
    name = "environment"
    type = "S"
  }

  # Enable streams for change notifications
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Purpose = "feature-flags"
  }
}

# Flag targeting rules table
resource "aws_dynamodb_table" "flag_rules" {
  name         = "feature-flag-rules"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "flagKey"
  range_key    = "ruleId"

  attribute {
    name = "flagKey"
    type = "S"
  }

  attribute {
    name = "ruleId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# Flag evaluation audit log
resource "aws_dynamodb_table" "flag_audit" {
  name         = "feature-flag-audit"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "flagKey"
  range_key    = "timestamp"

  attribute {
    name = "flagKey"
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

## Redis Cache for Low-Latency Evaluation

Flag evaluation needs to be fast. Use Redis to cache flags at the application layer.

```hcl
# ElastiCache Redis for flag caching
resource "aws_elasticache_replication_group" "flags" {
  replication_group_id = "feature-flags"
  description          = "Redis cache for feature flag evaluation"

  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.flags.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true

  tags = {
    Purpose = "feature-flags-cache"
  }
}

resource "aws_elasticache_subnet_group" "flags" {
  name       = "feature-flags-redis"
  subnet_ids = var.private_subnet_ids
}
```

## Flag Management API

Build an API for managing flags programmatically.

```hcl
# API Gateway for flag management
resource "aws_apigatewayv2_api" "flags" {
  name          = "feature-flags-api"
  protocol_type = "HTTP"
  description   = "Feature flag management API"

  cors_configuration {
    allow_origins = ["https://admin.company.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

resource "aws_apigatewayv2_stage" "flags" {
  api_id      = aws_apigatewayv2_api.flags.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.flags_api.arn
    format = jsonencode({
      requestId  = "$context.requestId"
      httpMethod = "$context.httpMethod"
      path       = "$context.path"
      status     = "$context.status"
    })
  }
}

# Lambda for flag evaluation (client-facing)
resource "aws_lambda_function" "flag_evaluator" {
  filename         = "flag_evaluator.zip"
  function_name    = "feature-flag-evaluator"
  role             = aws_iam_role.flag_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5
  memory_size      = 256

  environment {
    variables = {
      FLAGS_TABLE    = aws_dynamodb_table.feature_flags.name
      RULES_TABLE    = aws_dynamodb_table.flag_rules.name
      REDIS_ENDPOINT = aws_elasticache_replication_group.flags.primary_endpoint_address
      CACHE_TTL      = "30"  # seconds
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Lambda for flag management (admin-facing)
resource "aws_lambda_function" "flag_manager" {
  filename         = "flag_manager.zip"
  function_name    = "feature-flag-manager"
  role             = aws_iam_role.flag_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30

  environment {
    variables = {
      FLAGS_TABLE = aws_dynamodb_table.feature_flags.name
      RULES_TABLE = aws_dynamodb_table.flag_rules.name
      AUDIT_TABLE = aws_dynamodb_table.flag_audit.name
      REDIS_ENDPOINT = aws_elasticache_replication_group.flags.primary_endpoint_address
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Routes
resource "aws_apigatewayv2_integration" "evaluate" {
  api_id             = aws_apigatewayv2_api.flags.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.flag_evaluator.invoke_arn
}

resource "aws_apigatewayv2_route" "evaluate" {
  api_id    = aws_apigatewayv2_api.flags.id
  route_key = "POST /evaluate"
  target    = "integrations/${aws_apigatewayv2_integration.evaluate.id}"
}

resource "aws_apigatewayv2_integration" "manage" {
  api_id             = aws_apigatewayv2_api.flags.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.flag_manager.invoke_arn
}

resource "aws_apigatewayv2_route" "list_flags" {
  api_id    = aws_apigatewayv2_api.flags.id
  route_key = "GET /flags"
  target    = "integrations/${aws_apigatewayv2_integration.manage.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin.id
}

resource "aws_apigatewayv2_route" "update_flag" {
  api_id    = aws_apigatewayv2_api.flags.id
  route_key = "PUT /flags/{flagKey}"
  target    = "integrations/${aws_apigatewayv2_integration.manage.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin.id
}
```

## Real-Time Flag Change Propagation

When a flag changes, push updates to all services immediately.

```hcl
# DynamoDB Streams to EventBridge via Lambda
resource "aws_lambda_function" "flag_change_handler" {
  filename         = "flag_change_handler.zip"
  function_name    = "flag-change-propagator"
  role             = aws_iam_role.flag_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30

  environment {
    variables = {
      REDIS_ENDPOINT = aws_elasticache_replication_group.flags.primary_endpoint_address
      EVENT_BUS_NAME = aws_cloudwatch_event_bus.flags.name
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# DynamoDB stream trigger
resource "aws_lambda_event_source_mapping" "flag_changes" {
  event_source_arn  = aws_dynamodb_table.feature_flags.stream_arn
  function_name     = aws_lambda_function.flag_change_handler.arn
  starting_position = "LATEST"
  batch_size        = 10
}

# Custom EventBridge bus for flag events
resource "aws_cloudwatch_event_bus" "flags" {
  name = "feature-flag-events"
}

# Rule to notify services of flag changes
resource "aws_cloudwatch_event_rule" "flag_changed" {
  name           = "flag-changed"
  event_bus_name = aws_cloudwatch_event_bus.flags.name

  event_pattern = jsonencode({
    source      = ["feature-flags"]
    detail-type = ["FlagChanged"]
  })
}
```

## Monitoring

Track flag evaluation performance and change activity.

```hcl
resource "aws_cloudwatch_metric_alarm" "feature_flag_errors" {
  alarm_name          = "feature-flag-evaluation-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.flag_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.flag_evaluator.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "flag_evaluation_latency" {
  alarm_name          = "feature-flag-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 50  # 50ms
  alarm_actions       = [aws_sns_topic.flag_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.flag_evaluator.function_name
  }
}

resource "aws_sns_topic" "flag_alerts" {
  name = "feature-flag-alerts"
}
```

## Wrapping Up

Feature flag infrastructure lets you ship code to production fearlessly. Deploy often, release gradually, and kill problematic features instantly. Whether you use AppConfig for managed flags or build a custom system with DynamoDB and Redis, Terraform keeps the infrastructure reproducible and auditable.

The key is to keep flag evaluation fast - sub-10ms ideally. Redis caching makes this possible. And real-time propagation via DynamoDB Streams ensures flag changes take effect immediately across all services.

For monitoring feature flag evaluation performance and tracking the impact of flag changes on your application metrics, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-feature-flag-infrastructure-with-terraform/view) for feature flag observability.
