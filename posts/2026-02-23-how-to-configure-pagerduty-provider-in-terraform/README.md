# How to Configure PagerDuty Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, PagerDuty, Incident Management, On-Call, Provider, Infrastructure as Code

Description: Learn how to configure the Terraform PagerDuty provider to manage services, escalation policies, schedules, and integrations as code for reliable incident response.

---

PagerDuty is the backbone of incident response for many engineering teams. But configuring it through the web UI leads to inconsistencies - services get created without escalation policies, on-call schedules drift, and integration keys end up scattered in random documents. The Terraform PagerDuty provider lets you define your entire incident management setup as code, making it reproducible, reviewable, and consistent.

## Prerequisites

You need a PagerDuty account with admin access and an API token.

### Creating an API Token

1. Go to PagerDuty > Integrations > Developer Tools > API Access Keys
2. Click "Create New API Key"
3. Give it a description like "Terraform Automation"
4. Select "Read/Write" access

```bash
# Set the token as an environment variable
export PAGERDUTY_TOKEN="your-api-token-here"
```

For account-level operations (like managing users), you need a full access REST API key. For service-level operations, a user-level token with admin permissions works.

## Basic Provider Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

# provider.tf
provider "pagerduty" {
  # Reads from PAGERDUTY_TOKEN environment variable
}
```

### Explicit Configuration

```hcl
provider "pagerduty" {
  token = var.pagerduty_token
}

variable "pagerduty_token" {
  description = "PagerDuty API token"
  type        = string
  sensitive   = true
}
```

## Creating Teams and Users

Start by defining your team structure:

```hcl
# Create a team
resource "pagerduty_team" "platform" {
  name        = "Platform Engineering"
  description = "Platform and infrastructure team"
}

resource "pagerduty_team" "backend" {
  name        = "Backend Engineering"
  description = "Backend services team"
}

# Look up existing users
data "pagerduty_user" "alice" {
  email = "alice@example.com"
}

data "pagerduty_user" "bob" {
  email = "bob@example.com"
}

data "pagerduty_user" "charlie" {
  email = "charlie@example.com"
}

# Add users to teams
resource "pagerduty_team_membership" "alice_platform" {
  user_id = data.pagerduty_user.alice.id
  team_id = pagerduty_team.platform.id
  role    = "manager"
}

resource "pagerduty_team_membership" "bob_platform" {
  user_id = data.pagerduty_user.bob.id
  team_id = pagerduty_team.platform.id
  role    = "responder"
}

resource "pagerduty_team_membership" "charlie_platform" {
  user_id = data.pagerduty_user.charlie.id
  team_id = pagerduty_team.platform.id
  role    = "responder"
}
```

## On-Call Schedules

Define who is on-call and when:

```hcl
# Weekly rotation schedule
resource "pagerduty_schedule" "platform_primary" {
  name      = "Platform Primary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2026-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2026-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 7 days

    users = [
      data.pagerduty_user.alice.id,
      data.pagerduty_user.bob.id,
      data.pagerduty_user.charlie.id,
    ]
  }

  teams = [pagerduty_team.platform.id]
}

# Business hours schedule (overrides the primary)
resource "pagerduty_schedule" "platform_business_hours" {
  name      = "Platform Business Hours"
  time_zone = "America/New_York"

  layer {
    name                         = "Business Hours Coverage"
    start                        = "2026-01-01T09:00:00-05:00"
    rotation_virtual_start       = "2026-01-01T09:00:00-05:00"
    rotation_turn_length_seconds = 86400  # 1 day

    users = [
      data.pagerduty_user.alice.id,
      data.pagerduty_user.bob.id,
      data.pagerduty_user.charlie.id,
    ]

    restriction {
      type              = "weekly_restriction"
      start_time_of_day = "09:00:00"
      start_day_of_week = 1  # Monday
      duration_seconds  = 32400  # 9 hours (9 AM - 6 PM)
    }
  }

  teams = [pagerduty_team.platform.id]
}
```

## Escalation Policies

Define how incidents escalate through your team:

```hcl
resource "pagerduty_escalation_policy" "platform" {
  name      = "Platform Escalation Policy"
  num_loops = 2  # Repeat the escalation cycle twice before giving up

  teams = [pagerduty_team.platform.id]

  # First level - primary on-call
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.platform_primary.id
    }
  }

  # Second level - team manager
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "user_reference"
      id   = data.pagerduty_user.alice.id
    }
  }

  # Third level - engineering director (catch-all)
  rule {
    escalation_delay_in_minutes = 30

    target {
      type = "user_reference"
      id   = data.pagerduty_user.bob.id  # Director
    }
  }
}
```

## Creating Services

Services represent the things your team operates:

```hcl
resource "pagerduty_service" "api" {
  name              = "API Service"
  description       = "Backend API serving customer requests"
  escalation_policy = pagerduty_escalation_policy.platform.id

  # Auto-resolve incidents after 4 hours if not acknowledged
  auto_resolve_timeout = 14400

  # Alert creation behavior
  # "create_alerts_and_incidents" - each alert creates an incident
  # "create_incidents" - groups alerts into incidents
  alert_creation = "create_alerts_and_incidents"

  # Acknowledgement timeout - re-trigger if not resolved within 30 min
  acknowledgement_timeout = 1800

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "database" {
  name              = "Database Service"
  description       = "PostgreSQL and Redis infrastructure"
  escalation_policy = pagerduty_escalation_policy.platform.id

  auto_resolve_timeout    = 14400
  acknowledgement_timeout = 1800
  alert_creation          = "create_alerts_and_incidents"

  # Time-based urgency - high during business hours, low at night
  incident_urgency_rule {
    type = "use_support_hours"

    during_support_hours {
      type    = "constant"
      urgency = "high"
    }

    outside_support_hours {
      type    = "constant"
      urgency = "low"
    }
  }

  support_hours {
    type         = "fixed_time_per_day"
    time_zone    = "America/New_York"
    start_time   = "09:00:00"
    end_time     = "18:00:00"
    days_of_week = [1, 2, 3, 4, 5]  # Monday through Friday
  }
}
```

## Service Integrations

Connect monitoring tools to PagerDuty services:

```hcl
# Look up vendor integrations
data "pagerduty_vendor" "datadog" {
  name = "Datadog"
}

data "pagerduty_vendor" "cloudwatch" {
  name = "Amazon CloudWatch"
}

# Datadog integration
resource "pagerduty_service_integration" "datadog_api" {
  name    = "Datadog - API Alerts"
  service = pagerduty_service.api.id
  vendor  = data.pagerduty_vendor.datadog.id
}

# CloudWatch integration
resource "pagerduty_service_integration" "cloudwatch_db" {
  name    = "CloudWatch - Database Alerts"
  service = pagerduty_service.database.id
  vendor  = data.pagerduty_vendor.cloudwatch.id
}

# Generic Events API v2 integration
resource "pagerduty_service_integration" "generic_api" {
  name    = "Custom Monitoring"
  service = pagerduty_service.api.id
  type    = "events_api_v2_inbound_integration"
}

# Output integration keys for use in monitoring tools
output "datadog_integration_key" {
  value     = pagerduty_service_integration.datadog_api.integration_key
  sensitive = true
}

output "generic_integration_key" {
  value     = pagerduty_service_integration.generic_api.integration_key
  sensitive = true
}
```

## Event Orchestration

Route and transform events before they create incidents:

```hcl
resource "pagerduty_event_orchestration" "platform" {
  name = "Platform Event Orchestration"
  team = pagerduty_team.platform.id
}

resource "pagerduty_event_orchestration_router" "platform" {
  event_orchestration = pagerduty_event_orchestration.platform.id

  set {
    id = "start"

    rule {
      label = "Route API alerts"
      condition {
        expression = "event.source matches 'api-*'"
      }
      actions {
        route_to = pagerduty_service.api.id
      }
    }

    rule {
      label = "Route database alerts"
      condition {
        expression = "event.source matches 'db-*' or event.source matches 'redis-*'"
      }
      actions {
        route_to = pagerduty_service.database.id
      }
    }
  }

  catch_all {
    actions {
      route_to = pagerduty_service.api.id  # Default service
    }
  }
}
```

## Maintenance Windows

Schedule planned maintenance:

```hcl
resource "pagerduty_maintenance_window" "deploy_window" {
  start_time  = "2026-03-01T02:00:00-05:00"
  end_time    = "2026-03-01T04:00:00-05:00"
  description = "Planned deployment - suppress alerts"

  services = [
    pagerduty_service.api.id,
    pagerduty_service.database.id,
  ]
}
```

## Connecting PagerDuty with Other Terraform Providers

A powerful pattern is creating PagerDuty services alongside the infrastructure they monitor:

```hcl
# Create AWS infrastructure
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
}

# Create PagerDuty service for it
resource "pagerduty_service" "api_ecs" {
  name              = "API Service (ECS)"
  escalation_policy = pagerduty_escalation_policy.platform.id
  alert_creation    = "create_alerts_and_incidents"
}

# Create CloudWatch alarm that pages
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "api-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  alarm_actions = [aws_sns_topic.pagerduty.arn]
}
```

## Summary

The PagerDuty provider lets you manage your entire incident response setup as code. Define teams, schedules, escalation policies, and services in Terraform, and they stay consistent as your organization grows. The biggest value comes from connecting PagerDuty configuration with your infrastructure code - when you create a new service in AWS, GCP, or Azure, you can simultaneously create the PagerDuty service, escalation policy, and monitoring integrations that go with it. Everything stays in sync, and nothing gets forgotten.
