# How to Create Distributed Tracing Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Distributed Tracing, Observability, AWS X-Ray, Infrastructure as Code

Description: Learn how to set up distributed tracing infrastructure using Terraform with AWS X-Ray, OpenTelemetry collectors, and sampling rules for microservices.

---

Distributed tracing is essential for understanding how requests flow through microservices architectures. When a single user action triggers calls across multiple services, tracing helps you pinpoint where latency occurs and where failures originate. Terraform allows you to define your entire tracing infrastructure as code, making it reproducible and consistent across environments.

In this guide, we will build a complete distributed tracing infrastructure using Terraform. We will set up AWS X-Ray, configure sampling rules, create OpenTelemetry collector infrastructure, and establish the IAM permissions needed for trace collection.

## Why Automate Tracing Infrastructure with Terraform

Setting up distributed tracing manually across multiple environments leads to configuration drift and inconsistencies. With Terraform, every environment gets the same tracing configuration. You can version control your sampling rules, trace groups, and collector configurations. When you need to update tracing settings, a single Terraform apply propagates changes everywhere.

## Provider Configuration

Begin with the provider setup:

```hcl
# main.tf - Provider configuration for tracing infrastructure

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for tracing resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "VPC ID where the collector runs"
  type        = string
}

variable "vpc_cidr_block" {
  description = "VPC CIDR block allowed to send traces to the collector"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the OpenTelemetry Collector tasks"
  type        = list(string)
}

variable "alert_sns_topic_arn" {
  description = "SNS topic ARN for tracing infrastructure alerts"
  type        = string
}

variable "services" {
  description = "List of microservices to trace"
  type        = list(string)
  default     = ["api-gateway", "user-service", "order-service", "inventory-service", "payment-service"]
}
```

## Creating AWS X-Ray Sampling Rules

Sampling rules control which requests get traced. You do not want to trace every single request in production as that would be expensive. Instead, create intelligent sampling rules:

```hcl
# xray-sampling.tf - Define sampling rules for each service
resource "aws_xray_sampling_rule" "service_sampling" {
  for_each = toset(var.services)

  rule_name      = "${each.value}-sampling-${var.environment}"
  priority       = 1000 + index(var.services, each.value)
  version        = 1
  reservoir_size = 5    # Guaranteed traces per second
  fixed_rate     = 0.05 # 5% of additional requests

  # Match criteria for this service
  host         = "*"
  http_method  = "*"
  service_name = each.value
  service_type = "*"
  url_path     = "*"
  resource_arn = "*"

  attributes = {}
}

# High-priority sampling for critical user flows
resource "aws_xray_sampling_rule" "critical_path_sampling" {
  rule_name      = "critical-path-${var.environment}"
  priority       = 100  # Higher priority than service rules
  version        = 1
  reservoir_size = 10
  fixed_rate     = 1.0  # Trace 100% of matching requests

  host         = "*"
  http_method  = "POST"
  service_name = "*"
  service_type = "*"
  url_path     = "/checkout*"
  resource_arn = "*"

  attributes = {}
}

# Low-rate sampling for health check endpoints
resource "aws_xray_sampling_rule" "healthcheck_sampling" {
  rule_name      = "healthcheck-sampling-${var.environment}"
  priority       = 50
  version        = 1
  reservoir_size = 0
  fixed_rate     = 0.01  # Only 1% of health checks

  host         = "*"
  http_method  = "GET"
  service_name = "*"
  service_type = "*"
  url_path     = "/health*"
  resource_arn = "*"

  attributes = {}
}
```

## Creating X-Ray Groups for Trace Filtering

X-Ray groups let you organize and filter traces based on expressions:

```hcl
# xray-groups.tf - Create groups for organizing traces
resource "aws_xray_group" "slow_requests" {
  group_name        = "slow-requests-${var.environment}"
  filter_expression = "responsetime > 3"

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }
}

resource "aws_xray_group" "error_traces" {
  group_name        = "error-traces-${var.environment}"
  filter_expression = "fault = true OR error = true"

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }
}

resource "aws_xray_group" "payment_traces" {
  group_name        = "payment-service-${var.environment}"
  filter_expression = "service(\"payment-service\")"

  insights_configuration {
    insights_enabled          = true
    notifications_enabled     = true
  }
}
```

## Setting Up IAM Roles for Trace Collection

Your services need proper IAM permissions to send traces to X-Ray:

```hcl
# iam.tf - IAM roles and policies for X-Ray trace collection
resource "aws_iam_role" "xray_service_role" {
  for_each = toset(var.services)

  name = "xray-trace-${each.value}-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
    Service     = each.value
  }
}

# Policy granting X-Ray write permissions
resource "aws_iam_policy" "xray_write" {
  name = "xray-write-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets",
        "xray:GetSamplingStatisticSummaries"
      ]
      Resource = "*"
    }]
  })
}

# Attach the policy to each service role
resource "aws_iam_role_policy_attachment" "xray_write" {
  for_each = toset(var.services)

  role       = aws_iam_role.xray_service_role[each.value].name
  policy_arn = aws_iam_policy.xray_write.arn
}

# Task execution role for the OpenTelemetry Collector on ECS
resource "aws_iam_role" "ecs_execution" {
  name = "otel-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role used by the collector container to export traces to X-Ray
resource "aws_iam_role" "otel_collector" {
  name = "otel-collector-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "otel_collector_xray_write" {
  role       = aws_iam_role.otel_collector.name
  policy_arn = aws_iam_policy.xray_write.arn
}
```

## Deploying an OpenTelemetry Collector on ECS

For more flexibility, deploy an OpenTelemetry Collector as a sidecar or standalone service. Create a collector configuration file that receives OTLP traces and exports them to X-Ray:

```yaml
# otel-config.yaml - ADOT Collector configuration for X-Ray traces
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  awsxray:

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [awsxray]
```

Then run the collector on ECS Fargate:

```hcl
# otel-collector.tf - Deploy OpenTelemetry Collector on ECS Fargate
resource "aws_ecs_task_definition" "otel_collector" {
  family                   = "otel-collector-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.otel_collector.arn

  container_definitions = jsonencode([{
    name  = "otel-collector"
    image = "public.ecr.aws/aws-observability/aws-otel-collector:latest"

    # Port mappings for receiving traces
    portMappings = [
      {
        containerPort = 4317  # OTLP gRPC receiver
        protocol      = "tcp"
      },
      {
        containerPort = 4318  # OTLP HTTP receiver
        protocol      = "tcp"
      }
    ]

    # Collector configuration via environment variable
    environment = [
      {
        name  = "AOT_CONFIG_CONTENT"
        value = file("${path.module}/otel-config.yaml")
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.otel_collector.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "otel"
      }
    }
  }])
}

# Log group for the collector itself
resource "aws_cloudwatch_log_group" "otel_collector" {
  name              = "/ecs/otel-collector-${var.environment}"
  retention_in_days = 14
}

# Security group for OTLP traffic from services in the VPC
resource "aws_security_group" "otel_collector" {
  name        = "otel-collector-${var.environment}"
  description = "Allow services to send OTLP traces to the collector"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "otel_grpc" {
  security_group_id = aws_security_group.otel_collector.id
  cidr_ipv4         = var.vpc_cidr_block
  from_port         = 4317
  ip_protocol       = "tcp"
  to_port           = 4317
}

resource "aws_vpc_security_group_ingress_rule" "otel_http" {
  security_group_id = aws_security_group.otel_collector.id
  cidr_ipv4         = var.vpc_cidr_block
  from_port         = 4318
  ip_protocol       = "tcp"
  to_port           = 4318
}

resource "aws_vpc_security_group_egress_rule" "otel_all_egress" {
  security_group_id = aws_security_group.otel_collector.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# ECS service to run the collector
resource "aws_ecs_service" "otel_collector" {
  name            = "otel-collector-${var.environment}"
  cluster         = aws_ecs_cluster.tracing.id
  task_definition = aws_ecs_task_definition.otel_collector.arn
  desired_count   = 2  # Run two instances for high availability
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.otel_collector.id]
  }

  # Service discovery for other services to find the collector
  service_registries {
    registry_arn = aws_service_discovery_service.otel_collector.arn
  }
}

# ECS cluster for tracing infrastructure
resource "aws_ecs_cluster" "tracing" {
  name = "tracing-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
```

## Creating Service Discovery for the Collector

Enable service discovery so your microservices can find the OpenTelemetry Collector:

```hcl
# service-discovery.tf - Create service discovery namespace
resource "aws_service_discovery_private_dns_namespace" "tracing" {
  name        = "tracing.${var.environment}.local"
  description = "Service discovery for tracing infrastructure"
  vpc         = var.vpc_id
}

resource "aws_service_discovery_service" "otel_collector" {
  name = "otel-collector"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.tracing.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
```

## CloudWatch Alarms for Tracing Health

Monitor the health of your tracing infrastructure itself:

```hcl
# alarms.tf - Alerting on tracing infrastructure health
resource "aws_cloudwatch_metric_alarm" "trace_throttle" {
  alarm_name          = "xray-throttle-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ThrottleCount"
  namespace           = "AWS/Usage"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "X-Ray is throttling trace submissions"

  dimensions = {
    Service  = "X-Ray"
    Type     = "API"
    Resource = "PutTraceSegments"
    Class    = "None"
  }

  alarm_actions = [var.alert_sns_topic_arn]
}
```

## Outputs

```hcl
# outputs.tf - Export tracing resource identifiers
output "xray_service_role_arns" {
  description = "ARNs of X-Ray service roles"
  value       = { for k, v in aws_iam_role.xray_service_role : k => v.arn }
}

output "otel_collector_endpoint" {
  description = "OpenTelemetry Collector endpoint"
  value       = "otel-collector.tracing.${var.environment}.local:4317"
}

output "xray_group_arns" {
  description = "X-Ray group ARNs for filtering"
  value = {
    slow_requests = aws_xray_group.slow_requests.arn
    errors        = aws_xray_group.error_traces.arn
    payments      = aws_xray_group.payment_traces.arn
  }
}
```

## Conclusion

Building distributed tracing infrastructure with Terraform ensures that your observability stack is consistent, version-controlled, and easy to replicate. By combining AWS X-Ray sampling rules, OpenTelemetry Collectors on ECS, and proper IAM configurations, you create a robust tracing pipeline. The sampling rules we defined ensure you capture the traces that matter most while keeping costs under control. For a complete observability picture, consider pairing your tracing setup with [log aggregation](https://oneuptime.com/blog/post/2026-02-23-how-to-create-log-aggregation-infrastructure-with-terraform/view) and [APM infrastructure](https://oneuptime.com/blog/post/2026-02-23-how-to-create-apm-infrastructure-with-terraform/view) managed through Terraform as well.
