# How to Create X-Ray Tracing Configuration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, X-Ray, Tracing, Observability, Infrastructure as Code

Description: Learn how to configure AWS X-Ray tracing with sampling rules, groups, encryption, and integration with Lambda and API Gateway using Terraform.

---

AWS X-Ray helps you analyze and debug distributed applications by tracing requests as they flow through your services. It shows you a map of your application components, latency distributions, and error rates, making it much easier to pinpoint where things are going wrong. While X-Ray collects traces from your instrumented applications automatically, the server-side configuration - sampling rules, groups, encryption settings - is best managed through Terraform for consistency across environments.

This guide covers setting up X-Ray sampling rules, groups, encryption configuration, and integrations with API Gateway and Lambda.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- Applications instrumented with the X-Ray SDK or OpenTelemetry
- Basic understanding of distributed tracing concepts

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Configuring X-Ray Encryption

By default, X-Ray encrypts trace data with an AWS-managed key. You can use your own KMS key for tighter control.

```hcl
# KMS key for X-Ray trace encryption
resource "aws_kms_key" "xray" {
  description             = "KMS key for X-Ray trace data encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowXRayAccess"
        Effect = "Allow"
        Principal = {
          Service = "xray.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Service = "xray"
  }
}

resource "aws_kms_alias" "xray" {
  name          = "alias/xray-encryption"
  target_key_id = aws_kms_key.xray.key_id
}

# Configure X-Ray to use the custom KMS key
resource "aws_xray_encryption_config" "main" {
  type   = "KMS"
  key_id = aws_kms_key.xray.arn
}

data "aws_caller_identity" "current" {}
```

## Creating Sampling Rules

Sampling rules control what percentage of requests get traced. Without custom rules, X-Ray uses its default rule which traces the first request per second and 5% of additional requests. Custom rules let you sample more aggressively for specific services or paths.

```hcl
# High sampling rate for critical API endpoints
resource "aws_xray_sampling_rule" "critical_api" {
  rule_name      = "critical-api-endpoints"
  priority       = 100
  version        = 1
  reservoir_size = 10  # Guaranteed traces per second
  fixed_rate     = 0.5 # 50% of remaining requests

  # Matching criteria
  url_path     = "/api/payments/*"
  host         = "*"
  http_method  = "*"
  service_name = "payment-service"
  service_type = "*"
  resource_arn = "*"

  attributes = {}

  tags = {
    Purpose = "high-priority-tracing"
  }
}

# Lower sampling for health check endpoints
resource "aws_xray_sampling_rule" "health_checks" {
  rule_name      = "health-check-low-sampling"
  priority       = 50 # Lower number = higher priority
  version        = 1
  reservoir_size = 0    # No guaranteed traces
  fixed_rate     = 0.01 # Only 1% of health checks

  url_path     = "/health*"
  host         = "*"
  http_method  = "GET"
  service_name = "*"
  service_type = "*"
  resource_arn = "*"

  attributes = {}

  tags = {
    Purpose = "reduce-health-check-noise"
  }
}

# Standard sampling for all other API requests
resource "aws_xray_sampling_rule" "standard_api" {
  rule_name      = "standard-api-sampling"
  priority       = 200
  version        = 1
  reservoir_size = 5
  fixed_rate     = 0.1 # 10% of requests

  url_path     = "/api/*"
  host         = "*"
  http_method  = "*"
  service_name = "*"
  service_type = "*"
  resource_arn = "*"

  attributes = {}

  tags = {
    Purpose = "standard-tracing"
  }
}

# High sampling for error debugging (specific service)
resource "aws_xray_sampling_rule" "debug_service" {
  rule_name      = "debug-notification-service"
  priority       = 75
  version        = 1
  reservoir_size = 20
  fixed_rate     = 1.0 # 100% sampling for debugging

  url_path     = "*"
  host         = "*"
  http_method  = "*"
  service_name = "notification-service"
  service_type = "*"
  resource_arn = "*"

  attributes = {}

  tags = {
    Purpose   = "debugging"
    Temporary = "true"
  }
}

# Sampling by custom attributes
resource "aws_xray_sampling_rule" "premium_customers" {
  rule_name      = "premium-customer-traces"
  priority       = 150
  version        = 1
  reservoir_size = 10
  fixed_rate     = 0.5

  url_path     = "*"
  host         = "*"
  http_method  = "*"
  service_name = "*"
  service_type = "*"
  resource_arn = "*"

  # Custom attributes set by the application
  attributes = {
    "customer_tier" = "premium"
  }

  tags = {
    Purpose = "premium-customer-tracing"
  }
}
```

## Creating X-Ray Groups

Groups let you organize and filter traces based on a filter expression. Each group gets its own service map and analytics.

```hcl
# Group for payment service traces
resource "aws_xray_group" "payments" {
  group_name        = "payment-traces"
  filter_expression = "service(\"payment-service\")"

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }

  tags = {
    Team = "payments"
  }
}

# Group for traces with errors
resource "aws_xray_group" "errors" {
  group_name        = "error-traces"
  filter_expression = "fault = true OR error = true"

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }

  tags = {
    Team = "platform"
  }
}

# Group for high-latency traces
resource "aws_xray_group" "slow_requests" {
  group_name        = "slow-requests"
  filter_expression = "responsetime > 5"

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }

  tags = {
    Team = "performance"
  }
}

# Group for a specific user flow
resource "aws_xray_group" "checkout_flow" {
  group_name        = "checkout-flow"
  filter_expression = "service(\"cart-service\") OR service(\"payment-service\") OR service(\"order-service\")"

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = true
  }

  tags = {
    Team = "commerce"
  }
}

# Group for external service calls
resource "aws_xray_group" "external_calls" {
  group_name        = "external-dependencies"
  filter_expression = "edge(\"*\", \"*.amazonaws.com\") OR edge(\"*\", \"*.external-api.com\")"

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = false
  }

  tags = {
    Team = "platform"
  }
}
```

## IAM Roles for X-Ray

Your applications need permissions to send trace data to X-Ray.

```hcl
# IAM policy for applications to write traces
resource "aws_iam_policy" "xray_write" {
  name        = "xray-write-access"
  description = "Allows applications to send trace data to X-Ray"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayWrite"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries",
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM policy for reading traces (for dashboards and debugging)
resource "aws_iam_policy" "xray_read" {
  name        = "xray-read-access"
  description = "Allows reading X-Ray trace data for analysis"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayRead"
        Effect = "Allow"
        Action = [
          "xray:GetTraceSummaries",
          "xray:BatchGetTraces",
          "xray:GetServiceGraph",
          "xray:GetTraceGraph",
          "xray:GetGroups",
          "xray:GetGroup",
          "xray:GetTimeSeriesServiceStatistics",
          "xray:GetInsightSummaries",
          "xray:GetInsight",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## API Gateway Integration

Enable X-Ray tracing on API Gateway stages.

```hcl
# Enable X-Ray tracing on an API Gateway stage
resource "aws_api_gateway_stage" "production" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "production"

  # Enable X-Ray tracing
  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
  }

  tags = {
    Environment = "production"
  }
}

# For HTTP API (API Gateway V2)
resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "production"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_v2.arn
  }

  # Note: HTTP API tracing is configured differently
  default_route_settings {
    detailed_metrics_enabled = true
  }
}
```

## Lambda Integration

Enable active tracing on Lambda functions.

```hcl
# Lambda function with X-Ray active tracing
resource "aws_lambda_function" "api_handler" {
  function_name = "api-handler"
  filename      = "lambda.zip"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_role.arn

  # Enable active X-Ray tracing
  tracing_config {
    mode = "Active" # or "PassThrough"
  }

  environment {
    variables = {
      POWERTOOLS_SERVICE_NAME = "api-handler"
    }
  }

  tags = {
    Service = "api"
  }
}

# Attach the X-Ray write policy to the Lambda role
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.xray_write.arn
}
```

## ECS Task Definition with X-Ray Daemon

For ECS services, you typically run the X-Ray daemon as a sidecar container.

```hcl
# ECS task definition with X-Ray daemon sidecar
resource "aws_ecs_task_definition" "app_with_xray" {
  family                   = "app-with-tracing"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "my-app:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "AWS_XRAY_DAEMON_ADDRESS"
          value = "localhost:2000"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/app"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    },
    {
      name      = "xray-daemon"
      image     = "amazon/aws-xray-daemon:latest"
      essential = false
      portMappings = [
        {
          containerPort = 2000
          protocol      = "udp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/xray-daemon"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "xray"
        }
      }
    }
  ])
}
```

## Sampling Rules Module

For managing sampling rules at scale, wrap them in a module.

```hcl
# Variable for defining multiple sampling rules
variable "sampling_rules" {
  type = map(object({
    priority       = number
    reservoir_size = number
    fixed_rate     = number
    url_path       = string
    service_name   = string
    http_method    = string
  }))
  default = {
    "payment-api" = {
      priority       = 100
      reservoir_size = 10
      fixed_rate     = 0.5
      url_path       = "/api/payments/*"
      service_name   = "payment-service"
      http_method    = "*"
    }
    "health-checks" = {
      priority       = 50
      reservoir_size = 0
      fixed_rate     = 0.01
      url_path       = "/health*"
      service_name   = "*"
      http_method    = "GET"
    }
  }
}

resource "aws_xray_sampling_rule" "rules" {
  for_each = var.sampling_rules

  rule_name      = each.key
  priority       = each.value.priority
  version        = 1
  reservoir_size = each.value.reservoir_size
  fixed_rate     = each.value.fixed_rate
  url_path       = each.value.url_path
  host           = "*"
  http_method    = each.value.http_method
  service_name   = each.value.service_name
  service_type   = "*"
  resource_arn   = "*"

  attributes = {}
}
```

## Best Practices

1. **Set low sampling for health checks.** Health check endpoints generate a lot of traces with no diagnostic value. Sample them at 1% or less.

2. **Use higher sampling for critical paths.** Payment processing, authentication, and other critical flows deserve higher sampling rates so you catch issues quickly.

3. **Create groups for each team.** Groups with filter expressions give each team a focused view of their services without being overwhelmed by traces from the entire system.

4. **Enable insights for production groups.** X-Ray Insights automatically detects anomalies in your traced services and can alert you before users notice problems.

5. **Use the X-Ray daemon sidecar in ECS.** The daemon batches and buffers trace data, reducing the overhead on your application containers.

6. **Encrypt with customer-managed keys.** Trace data can contain sensitive information like request paths and headers. Use your own KMS key for better control.

## Conclusion

X-Ray tracing configuration through Terraform ensures your observability setup is consistent across all environments. Custom sampling rules keep trace volumes manageable while ensuring you capture the data you need for debugging. Groups and insights give you organized views of your distributed system's behavior. Start with reasonable sampling defaults, add specific rules for critical paths, and let X-Ray Insights catch the anomalies you might miss.
