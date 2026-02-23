# How to Build a Platform Engineering Foundation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Platform Engineering, DevOps, Infrastructure as Code, Cloud Platform, Self-Service

Description: Learn how to build a platform engineering foundation using Terraform that provides self-service infrastructure, golden paths, and developer productivity tools.

---

Platform engineering is about building an internal platform that lets development teams ship faster without needing to understand every detail of the underlying infrastructure. Instead of each team figuring out how to set up networking, databases, and monitoring from scratch, the platform team provides opinionated, well-tested building blocks that developers can compose through self-service interfaces.

In this guide, we will build the foundation of an internal platform using Terraform. This includes shared infrastructure, reusable modules, a self-service catalog, and the guardrails that keep everything safe.

## The Platform Architecture

A good platform engineering foundation has these layers:

- **Shared infrastructure**: Networking, DNS, identity, observability
- **Reusable modules**: Pre-built, opinionated Terraform modules for common patterns
- **Self-service layer**: A way for developers to request infrastructure without filing tickets
- **Policy enforcement**: Guardrails that prevent misconfigurations

## Shared Infrastructure Layer

Every team needs networking, DNS, and observability. The platform provides this as shared infrastructure.

```hcl
# shared/networking.tf - Shared VPC and networking
module "platform_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.platform_name}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  # Enable NAT gateway for private subnet internet access
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  one_nat_gateway_per_az = var.environment == "production"

  # Enable DNS support
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tag subnets for EKS and load balancer discovery
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
    "Platform"                        = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
    "Platform"               = "shared"
  }

  tags = {
    Platform    = var.platform_name
    Environment = var.environment
    ManagedBy   = "platform-team"
  }
}

# Shared Route53 hosted zone
resource "aws_route53_zone" "platform" {
  name = var.platform_domain

  tags = {
    Platform = var.platform_name
  }
}

# Wildcard certificate for platform services
resource "aws_acm_certificate" "platform" {
  domain_name       = "*.${var.platform_domain}"
  validation_method = "DNS"

  subject_alternative_names = [
    var.platform_domain
  ]

  lifecycle {
    create_before_destroy = true
  }
}
```

## Shared Observability Stack

Every service on the platform should automatically get logging, metrics, and tracing.

```hcl
# shared/observability.tf - Platform-wide observability
# Central logging
resource "aws_cloudwatch_log_group" "platform" {
  name              = "/platform/${var.platform_name}"
  retention_in_days = 90

  tags = {
    Platform = var.platform_name
  }
}

# Managed Prometheus for metrics
resource "aws_prometheus_workspace" "platform" {
  alias = "${var.platform_name}-metrics"

  tags = {
    Platform = var.platform_name
  }
}

# Managed Grafana for dashboards
resource "aws_grafana_workspace" "platform" {
  name                     = "${var.platform_name}-dashboards"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"
  role_arn                 = aws_iam_role.grafana.arn

  data_sources = [
    "PROMETHEUS",
    "CLOUDWATCH",
    "XRAY"
  ]

  tags = {
    Platform = var.platform_name
  }
}

# X-Ray for distributed tracing
resource "aws_xray_group" "platform" {
  group_name        = "platform-services"
  filter_expression = "annotation.platform = \"${var.platform_name}\""
}
```

## Reusable Terraform Modules

The core of platform engineering is providing reusable, opinionated modules. These modules encode your organization's best practices.

```hcl
# modules/service/main.tf - Golden path module for deploying a service
# This module creates everything a service needs
variable "service_name" {
  type        = string
  description = "Name of the service"
}

variable "team" {
  type        = string
  description = "Owning team"
}

variable "container_image" {
  type        = string
  description = "Container image to deploy"
}

variable "cpu" {
  type    = number
  default = 256
}

variable "memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 2
}

# ECS service with all best practices baked in
resource "aws_ecs_service" "service" {
  name            = var.service_name
  cluster         = data.aws_ecs_cluster.platform.id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.private.ids
    security_groups = [aws_security_group.service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = var.service_name
    container_port   = 8080
  }

  # Circuit breaker for automatic rollback
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Service = var.service_name
    Team    = var.team
  }
}

# Automatic scaling
resource "aws_appautoscaling_target" "service" {
  max_capacity       = var.desired_count * 4
  min_capacity       = var.desired_count
  resource_id        = "service/${data.aws_ecs_cluster.platform.cluster_name}/${var.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70
  }
}

# CloudWatch dashboard for the service
resource "aws_cloudwatch_dashboard" "service" {
  dashboard_name = "${var.service_name}-dashboard"

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
            ["AWS/ECS", "CPUUtilization", "ServiceName", var.service_name,
             "ClusterName", data.aws_ecs_cluster.platform.cluster_name]
          ]
          title  = "CPU Utilization"
          period = 300
        }
      }
    ]
  })
}

# CloudWatch alarms - every service gets these by default
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.service_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "CPU utilization is above 85% for ${var.service_name}"

  dimensions = {
    ServiceName = var.service_name
    ClusterName = data.aws_ecs_cluster.platform.cluster_name
  }

  alarm_actions = [data.aws_sns_topic.platform_alerts.arn]
}
```

## Self-Service with Terraform Workspaces

Teams can provision their own infrastructure using Terraform Cloud or Atlantis with pre-approved modules.

```hcl
# self-service/team-workspace.tf - Per-team workspace setup
resource "tfe_workspace" "team" {
  for_each = var.teams

  name              = "${each.key}-${var.environment}"
  organization      = var.tfe_organization
  working_directory = "teams/${each.key}"

  # Use version control
  vcs_repo {
    identifier     = "${var.github_org}/${each.value.repo}"
    branch         = "main"
    oauth_token_id = var.tfe_oauth_token_id
  }

  # Auto-apply for non-production
  auto_apply = var.environment != "production"

  # Enforce policy checks
  assessments_enabled = true

  tag_names = [
    "team:${each.key}",
    "environment:${var.environment}",
    "platform:${var.platform_name}"
  ]
}

# Provide teams with shared variable sets
resource "tfe_variable_set" "platform_shared" {
  name         = "platform-shared-variables"
  organization = var.tfe_organization
}

resource "tfe_variable" "vpc_id" {
  key             = "vpc_id"
  value           = module.platform_vpc.vpc_id
  category        = "terraform"
  variable_set_id = tfe_variable_set.platform_shared.id
}

resource "tfe_variable" "private_subnets" {
  key             = "private_subnet_ids"
  value           = jsonencode(module.platform_vpc.private_subnets)
  category        = "terraform"
  hcl             = true
  variable_set_id = tfe_variable_set.platform_shared.id
}
```

## Policy Enforcement with Sentinel

Guardrails prevent teams from creating insecure or expensive resources.

```hcl
# policies/policy-set.tf - Sentinel policies
resource "tfe_policy_set" "platform_guardrails" {
  name         = "platform-guardrails"
  organization = var.tfe_organization

  vcs_repo {
    identifier     = "${var.github_org}/platform-policies"
    branch         = "main"
    oauth_token_id = var.tfe_oauth_token_id
  }

  # Apply to all platform workspaces
  workspace_ids = [
    for ws in tfe_workspace.team : ws.id
  ]
}
```

## Summary

Platform engineering with Terraform is about building layers of abstraction that make developers productive while keeping the infrastructure safe and consistent. The shared infrastructure layer handles the basics that every team needs. Reusable modules encode best practices. Self-service workspaces let teams move fast. And policy enforcement keeps everyone within the guardrails.

The key is starting small. Build the shared networking and observability first, create a few golden path modules, and then expand the self-service catalog based on what teams actually need. Do not try to build the entire platform before getting feedback.

For monitoring your platform and the services running on it, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can provide unified observability across all your platform components.
