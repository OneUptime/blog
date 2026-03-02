# How to Implement Golden Paths with Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Golden Path, Platform Engineering, Modules, DevOps

Description: Learn how to implement golden paths using Terraform modules that provide opinionated, production-ready infrastructure patterns teams can adopt to accelerate delivery while maintaining best practices.

---

Golden paths are opinionated, well-supported infrastructure patterns that represent the recommended way to build and deploy applications within your organization. They are not mandates but rather the path of least resistance - the option that is easiest to follow because it comes with built-in best practices, monitoring, security, and documentation.

Terraform modules are the ideal vehicle for implementing golden paths because they encapsulate complexity into reusable, versioned packages that teams can adopt with minimal effort.

In this guide, we will cover how to design, build, and maintain golden path Terraform modules.

## What Makes a Golden Path

A golden path is more than just a module. It is a complete, opinionated solution that includes infrastructure, monitoring, security, documentation, and support. The goal is to make doing the right thing the easiest thing.

```yaml
# golden-paths/web-service.yaml
# Golden path definition for web services

name: "Web Service Golden Path"
description: >
  The recommended way to deploy a web service at our organization.
  Includes compute, networking, monitoring, logging, and security.

includes:
  infrastructure:
    - ECS Fargate service with auto-scaling
    - Application Load Balancer with HTTPS
    - Security groups with minimal permissions
    - CloudWatch logging
    - DNS registration

  monitoring:
    - CPU and memory alerts
    - Request latency alerts
    - Error rate alerts
    - Health check endpoint monitoring
    - Dashboard per service

  security:
    - TLS termination at ALB
    - IAM task role with least privilege
    - Security group locked to ALB only
    - Secrets via AWS Secrets Manager
    - Container image scanning

  documentation:
    - README with usage examples
    - Architecture diagram
    - Runbook for common operations
    - Troubleshooting guide

inputs_required:
  - service_name
  - team
  - container_image
  - environment

inputs_optional:
  - cpu (default: 256)
  - memory (default: 512)
  - desired_count (default: based on environment)
  - custom_domain
```

## Building the Golden Path Module

```hcl
# modules/golden-path/web-service/main.tf
# Golden path module for deploying a web service

variable "service_name" {
  description = "Name of the web service"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,28}[a-z0-9]$", var.service_name))
    error_message = "Service name must be 4-30 chars, lowercase alphanumeric with hyphens."
  }
}

variable "team" {
  description = "Team that owns this service"
  type        = string
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "cpu" {
  description = "CPU units for the container"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MB for the container"
  type        = number
  default     = 512
}

# Environment-specific defaults
locals {
  env_config = {
    dev = {
      desired_count = 1
      min_count     = 1
      max_count     = 2
      alarm_actions = []
    }
    staging = {
      desired_count = 2
      min_count     = 2
      max_count     = 4
      alarm_actions = [data.aws_sns_topic.staging_alerts.arn]
    }
    production = {
      desired_count = 3
      min_count     = 3
      max_count     = 10
      alarm_actions = [data.aws_sns_topic.production_alerts.arn]
    }
  }

  config = local.env_config[var.environment]

  common_tags = {
    Service     = var.service_name
    Team        = var.team
    Environment = var.environment
    ManagedBy   = "terraform"
    GoldenPath  = "web-service-v2"
  }
}
```

## Including Monitoring by Default

Every golden path includes monitoring out of the box:

```hcl
# modules/golden-path/web-service/monitoring.tf
# Built-in monitoring for the web service golden path

# CloudWatch dashboard for the service
resource "aws_cloudwatch_dashboard" "service" {
  dashboard_name = "${var.service_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.main.name,
             "ClusterName", data.aws_ecs_cluster.main.cluster_name]
          ]
          title  = "CPU Utilization"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime",
             "TargetGroup", aws_lb_target_group.main.arn_suffix,
             "LoadBalancer", data.aws_lb.main.arn_suffix]
          ]
          title  = "Response Time"
          period = 60
        }
      }
    ]
  })
}

# CPU alarm
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.service_name}-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization is above 80% for ${var.service_name}"
  alarm_actions       = local.config.alarm_actions

  dimensions = {
    ServiceName = aws_ecs_service.main.name
    ClusterName = data.aws_ecs_cluster.main.cluster_name
  }

  tags = local.common_tags
}

# Error rate alarm
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${var.service_name}-${var.environment}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5

  metric_query {
    id          = "error_rate"
    expression  = "errors / requests * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        TargetGroup  = aws_lb_target_group.main.arn_suffix
        LoadBalancer = data.aws_lb.main.arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        TargetGroup  = aws_lb_target_group.main.arn_suffix
        LoadBalancer = data.aws_lb.main.arn_suffix
      }
    }
  }

  alarm_actions = local.config.alarm_actions
  tags          = local.common_tags
}
```

## Making Golden Paths Easy to Adopt

The adoption experience must be simple:

```hcl
# examples/deploy-web-service/main.tf
# Deploy a web service using the golden path
# This is all a developer needs to write

module "my_service" {
  source  = "app.terraform.io/myorg/web-service/golden-path"
  version = "~> 2.0"

  service_name    = "payment-api"
  team            = "payments"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/payment-api:v1.5.0"
  environment     = "production"
}

# That is it. The golden path handles:
# - ECS service with auto-scaling
# - Load balancer with HTTPS
# - Security groups
# - Logging
# - Monitoring and alerts
# - DNS registration

output "service_url" {
  value = module.my_service.service_url
}

output "dashboard_url" {
  value = module.my_service.dashboard_url
}
```

## Providing Escape Hatches

Golden paths should be flexible enough for teams with special needs:

```hcl
# modules/golden-path/web-service/variables.tf
# Advanced options for teams that need customization

variable "custom_health_check_path" {
  description = "Custom health check path (default: /health)"
  type        = string
  default     = "/health"
}

variable "additional_security_group_rules" {
  description = "Additional security group rules beyond the golden path defaults"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}

variable "custom_environment_variables" {
  description = "Additional environment variables for the container"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "override_auto_scaling" {
  description = "Override the default auto-scaling configuration"
  type = object({
    min_count          = optional(number)
    max_count          = optional(number)
    cpu_target_percent = optional(number)
  })
  default = null
}
```

## Versioning Golden Paths

Version your golden paths carefully since teams depend on them:

```hcl
# Use semantic versioning for golden path modules
# Major: Breaking changes requiring migration
# Minor: New features, backward compatible
# Patch: Bug fixes

# In consumer code, use pessimistic version constraints
module "my_service" {
  source  = "app.terraform.io/myorg/web-service/golden-path"
  version = "~> 2.0"  # Allows 2.x.x but not 3.0.0
}
```

## Measuring Golden Path Adoption

Track adoption to understand which paths are successful:

```python
# scripts/golden-path-metrics.py
# Track golden path adoption and satisfaction

metrics = {
    "web_service": {
        "total_deployments": 45,
        "teams_using": 12,
        "satisfaction_score": 4.5,
        "average_time_to_deploy_minutes": 15,
        "escape_hatch_usage_percent": 18,
        "version_distribution": {
            "2.1.0": 20,
            "2.0.3": 15,
            "1.8.0": 10
        }
    },
    "api_gateway": {
        "total_deployments": 28,
        "teams_using": 8,
        "satisfaction_score": 4.2,
        "average_time_to_deploy_minutes": 20,
        "escape_hatch_usage_percent": 25
    },
    "data_pipeline": {
        "total_deployments": 15,
        "teams_using": 4,
        "satisfaction_score": 3.8,
        "average_time_to_deploy_minutes": 30,
        "escape_hatch_usage_percent": 35
    }
}
```

## Best Practices

Make golden paths genuinely better than the alternative. If teams have to do more work to use the golden path than to roll their own solution, adoption will be low.

Include everything teams need. A golden path that provides compute but not monitoring forces teams to solve half the problem themselves.

Listen to feedback and iterate. High escape hatch usage indicates the golden path does not meet real needs. Investigate why and adapt.

Keep golden paths current. Update them when new best practices emerge, security standards change, or better cloud services become available.

Do not mandate, attract. The best golden paths are adopted voluntarily because they are clearly the best option. If you have to force teams onto a golden path, it needs improvement.

## Conclusion

Golden paths with Terraform modules provide the ideal balance between standardization and developer autonomy. By packaging opinionated, production-ready infrastructure patterns into easy-to-use modules, you make it simple for teams to deploy services that meet all organizational standards from day one. The key is making the golden path genuinely the easiest and best option, so teams choose it voluntarily.
