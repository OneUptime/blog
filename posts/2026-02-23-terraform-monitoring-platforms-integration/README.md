# How to Integrate Terraform with Monitoring Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Monitoring, Observability, DevOps, Infrastructure as Code

Description: Learn how to use Terraform to configure monitoring platforms like Datadog, Grafana, and PagerDuty so your alerting and dashboards stay in sync with your infrastructure.

---

Monitoring is essential for any production system, but configuring alerts, dashboards, and notification channels manually is error-prone and hard to replicate. When you manage your monitoring configuration through Terraform, every alert rule, dashboard, and integration becomes versioned, reviewable, and reproducible. This guide shows you how to integrate Terraform with popular monitoring platforms to create a fully automated observability pipeline.

## Why Manage Monitoring with Terraform

When infrastructure and monitoring are configured separately, they inevitably drift apart. A new service gets deployed but nobody creates alerts for it. A threshold changes but the dashboard still shows the old value. By defining monitoring resources in the same Terraform configurations as the infrastructure they monitor, you guarantee that both are always in sync.

Terraform providers exist for most major monitoring platforms including Datadog, Grafana, New Relic, PagerDuty, Opsgenie, and many others. This means you can use the same declarative workflow to manage alerts, dashboards, synthetic checks, and notification policies.

## Setting Up the Datadog Provider

Datadog is one of the most widely used monitoring platforms, and its Terraform provider is mature and well-documented.

```hcl
# providers.tf
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.30"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
  api_url = "https://api.datadoghq.com/"
}
```

## Creating Monitors Alongside Infrastructure

The most powerful pattern is defining monitors right next to the infrastructure they observe. When you create an EC2 instance, create its CPU alert in the same configuration.

```hcl
# Deploy an application server
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.large"

  tags = {
    Name        = "app-server-${var.environment}"
    Environment = var.environment
    Service     = "web-application"
  }
}

# Create a CPU utilization monitor for this specific instance
resource "datadog_monitor" "app_cpu" {
  name    = "High CPU on ${aws_instance.app.tags["Name"]}"
  type    = "metric alert"
  message = <<-EOT
    CPU utilization is above 85% on ${aws_instance.app.tags["Name"]}.

    Instance ID: ${aws_instance.app.id}
    Instance Type: ${aws_instance.app.instance_type}
    Private IP: ${aws_instance.app.private_ip}

    @slack-infrastructure-alerts
    @pagerduty-platform-team
  EOT

  query = "avg(last_5m):avg:aws.ec2.cpuutilization{instance-id:${aws_instance.app.id}} > 85"

  monitor_thresholds {
    critical = 85
    warning  = 70
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 60

  tags = [
    "environment:${var.environment}",
    "service:web-application",
    "managed-by:terraform"
  ]
}

# Create a disk space monitor
resource "datadog_monitor" "app_disk" {
  name    = "Low Disk Space on ${aws_instance.app.tags["Name"]}"
  type    = "metric alert"
  message = <<-EOT
    Disk space is below 15% on ${aws_instance.app.tags["Name"]}.

    @slack-infrastructure-alerts
  EOT

  query = "avg(last_10m):avg:system.disk.free{host:${aws_instance.app.id}} < 15"

  monitor_thresholds {
    critical = 10
    warning  = 15
  }

  tags = ["environment:${var.environment}", "managed-by:terraform"]
}
```

## Building Dashboards with Terraform

Terraform can manage entire Grafana dashboards as code. This approach is especially useful when you want dashboards to automatically reflect infrastructure changes.

```hcl
# Configure the Grafana provider
provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_api_key
}

# Create a dashboard for the application stack
resource "grafana_dashboard" "application" {
  config_json = jsonencode({
    title = "Application Stack - ${var.environment}"
    tags  = ["terraform", var.environment]
    panels = [
      {
        title      = "EC2 CPU Utilization"
        type       = "graph"
        gridPos    = { h = 8, w = 12, x = 0, y = 0 }
        datasource = "CloudWatch"
        targets = [
          {
            namespace  = "AWS/EC2"
            metricName = "CPUUtilization"
            dimensions = {
              InstanceId = aws_instance.app.id
            }
            period = "300"
            stat   = "Average"
          }
        ]
      },
      {
        title      = "RDS Connections"
        type       = "graph"
        gridPos    = { h = 8, w = 12, x = 12, y = 0 }
        datasource = "CloudWatch"
        targets = [
          {
            namespace  = "AWS/RDS"
            metricName = "DatabaseConnections"
            dimensions = {
              DBInstanceIdentifier = aws_rds_instance.database.identifier
            }
            period = "300"
            stat   = "Average"
          }
        ]
      },
      {
        title      = "ALB Request Count"
        type       = "stat"
        gridPos    = { h = 4, w = 6, x = 0, y = 8 }
        datasource = "CloudWatch"
        targets = [
          {
            namespace  = "AWS/ApplicationELB"
            metricName = "RequestCount"
            dimensions = {
              LoadBalancer = aws_lb.app.arn_suffix
            }
            period = "60"
            stat   = "Sum"
          }
        ]
      }
    ]
  })
}
```

## Configuring PagerDuty Escalation Policies

PagerDuty's Terraform provider lets you manage services, escalation policies, and schedules as code.

```hcl
provider "pagerduty" {
  token = var.pagerduty_token
}

# Create an on-call schedule
resource "pagerduty_schedule" "platform_oncall" {
  name      = "Platform Team On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Primary"
    start                        = "2024-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2024-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 1 week

    users = var.oncall_user_ids
  }
}

# Create an escalation policy
resource "pagerduty_escalation_policy" "platform" {
  name      = "Platform Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.platform_oncall.id
    }
  }

  rule {
    escalation_delay_in_minutes = 30
    target {
      type = "user_reference"
      id   = var.engineering_manager_id
    }
  }
}

# Create a PagerDuty service linked to your infrastructure
resource "pagerduty_service" "web_application" {
  name              = "Web Application - ${var.environment}"
  escalation_policy = pagerduty_escalation_policy.platform.id
  alert_creation    = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = var.environment == "production" ? "high" : "low"
  }
}

# Connect Datadog to PagerDuty
resource "datadog_integration_pagerduty_service_object" "web_app" {
  service_name = pagerduty_service.web_application.name
  service_key  = pagerduty_service.web_application.id
}
```

## Creating a Monitoring Module

For reusable monitoring across services, create a Terraform module that bundles standard alerts with any infrastructure resource.

```hcl
# modules/monitored-service/variables.tf
variable "service_name" {
  description = "Name of the service to monitor"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "alert_endpoints" {
  description = "Notification endpoints for alerts"
  type        = list(string)
  default     = ["@slack-alerts"]
}

variable "cpu_threshold" {
  description = "CPU alert threshold percentage"
  type        = number
  default     = 85
}

variable "error_rate_threshold" {
  description = "Error rate threshold percentage"
  type        = number
  default     = 5
}

variable "latency_threshold_ms" {
  description = "P99 latency threshold in milliseconds"
  type        = number
  default     = 500
}
```

```hcl
# modules/monitored-service/main.tf
resource "datadog_monitor" "high_error_rate" {
  name    = "[${var.environment}] High Error Rate - ${var.service_name}"
  type    = "metric alert"
  message = "Error rate exceeds ${var.error_rate_threshold}% for ${var.service_name}. ${join(" ", var.alert_endpoints)}"

  query = "avg(last_5m):sum:trace.http.request.errors{service:${var.service_name},env:${var.environment}}.as_rate() / sum:trace.http.request.hits{service:${var.service_name},env:${var.environment}}.as_rate() * 100 > ${var.error_rate_threshold}"

  monitor_thresholds {
    critical = var.error_rate_threshold
    warning  = var.error_rate_threshold * 0.7
  }

  tags = ["service:${var.service_name}", "environment:${var.environment}", "managed-by:terraform"]
}

resource "datadog_monitor" "high_latency" {
  name    = "[${var.environment}] High Latency - ${var.service_name}"
  type    = "metric alert"
  message = "P99 latency exceeds ${var.latency_threshold_ms}ms for ${var.service_name}. ${join(" ", var.alert_endpoints)}"

  query = "avg(last_5m):avg:trace.http.request.duration.by.service.99p{service:${var.service_name},env:${var.environment}} > ${var.latency_threshold_ms * 1000000}"

  monitor_thresholds {
    critical = var.latency_threshold_ms * 1000000
    warning  = var.latency_threshold_ms * 700000
  }

  tags = ["service:${var.service_name}", "environment:${var.environment}", "managed-by:terraform"]
}
```

Use the module wherever you deploy a service.

```hcl
# Use the monitoring module for each service
module "api_monitoring" {
  source               = "./modules/monitored-service"
  service_name         = "api-gateway"
  environment          = "production"
  cpu_threshold        = 80
  error_rate_threshold = 2
  latency_threshold_ms = 200
  alert_endpoints      = ["@slack-api-team", "@pagerduty-api-oncall"]
}
```

## Synthetic Monitoring with Terraform

You can also define synthetic checks that test your endpoints from external locations.

```hcl
# Create a Datadog synthetic test for your API
resource "datadog_synthetics_test" "api_health" {
  name      = "API Health Check - ${var.environment}"
  type      = "api"
  subtype   = "http"
  status    = "live"
  locations = ["aws:us-east-1", "aws:eu-west-1", "aws:ap-southeast-1"]

  request_definition {
    method = "GET"
    url    = "https://${aws_lb.app.dns_name}/health"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"
  }

  options_list {
    tick_every = 60  # Check every 60 seconds
    retry {
      count    = 2
      interval = 300
    }
  }

  message = "API health check failed. @slack-infrastructure-alerts"
  tags    = ["environment:${var.environment}", "managed-by:terraform"]
}
```

## Best Practices

Keep monitoring configuration close to infrastructure. Define alerts in the same Terraform module as the resources they monitor. This ensures that when infrastructure is destroyed, the associated monitors are cleaned up automatically.

Use variables for thresholds. Different environments need different alert thresholds. Production might alert at 85% CPU while staging alerts at 95%. Make these configurable through variables.

Tag everything with `managed-by:terraform`. This makes it easy to identify which monitors were created manually and which are managed through code.

Test your alerts. After applying monitoring configuration, trigger a test alert to verify the notification chain works correctly.

For related guidance on managing infrastructure state, check our post on [Terraform State File Structure](https://oneuptime.com/blog/post/2026-02-23-terraform-state-file-structure/view).

## Conclusion

Integrating Terraform with monitoring platforms ensures that your observability setup evolves alongside your infrastructure. By defining monitors, dashboards, escalation policies, and synthetic tests as code, you create a monitoring system that is consistent, version-controlled, and always up to date. Start by adding basic health monitors next to your infrastructure resources, then expand to include dashboards, synthetic checks, and cross-service alerting.
