# How to Set Up PagerDuty Services with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, PagerDuty, Monitoring, On-Call, Incident Management, Infrastructure as Code, Alerting

Description: Learn how to create and manage PagerDuty services, escalation policies, and integrations using OpenTofu to automate your incident response configuration.

---

PagerDuty is the industry-standard incident management platform. Managing PagerDuty services and escalation policies manually leads to inconsistent setups across teams. OpenTofu's PagerDuty provider lets you define your entire on-call structure as code, making it auditable and repeatable.

## Provider Configuration

```hcl
# providers.tf

terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.10"
    }
  }
}

provider "pagerduty" {
  token = var.pagerduty_token
}
```

## Creating Users and Teams

```hcl
# team.tf
# Create or reference existing users
data "pagerduty_user" "alice" {
  email = "alice@example.com"
}

data "pagerduty_user" "bob" {
  email = "bob@example.com"
}

# Create a team
resource "pagerduty_team" "platform_engineering" {
  name        = "Platform Engineering"
  description = "Platform engineering on-call team"
}

# Add members to the team
resource "pagerduty_team_membership" "alice" {
  user_id = data.pagerduty_user.alice.id
  team_id = pagerduty_team.platform_engineering.id
  role    = "manager"
}

resource "pagerduty_team_membership" "bob" {
  user_id = data.pagerduty_user.bob.id
  team_id = pagerduty_team.platform_engineering.id
  role    = "responder"
}
```

## Creating Schedules and Escalation Policies

```hcl
# schedule.tf
# Create an on-call schedule (weekly rotation)
resource "pagerduty_schedule" "primary" {
  name      = "Platform Primary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2026-01-06T00:00:00-05:00"
    rotation_virtual_start       = "2026-01-06T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 1 week

    users = [
      data.pagerduty_user.alice.id,
      data.pagerduty_user.bob.id,
    ]
  }

  teams = [pagerduty_team.platform_engineering.id]
}

# Create escalation policy
resource "pagerduty_escalation_policy" "platform" {
  name      = "Platform Engineering Escalation"
  num_loops = 2  # Repeat escalation cycle 2 times before giving up

  teams = [pagerduty_team.platform_engineering.id]

  rule {
    escalation_delay_in_minutes = 30  # Escalate after 30 minutes

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }
  }
}
```

## Creating PagerDuty Services

```hcl
# services.tf
# Service for the API backend
resource "pagerduty_service" "api" {
  name                    = "API Backend"
  description             = "Core API service incidents"
  auto_resolve_timeout    = 14400  # Auto-resolve after 4 hours
  acknowledgement_timeout = 1800   # Re-trigger if not acknowledged in 30 min
  escalation_policy       = pagerduty_escalation_policy.platform.id

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }

  alert_creation = "create_alerts_and_incidents"
}

# Service for the database
resource "pagerduty_service" "database" {
  name                    = "Database Cluster"
  description             = "Database incidents and alerts"
  auto_resolve_timeout    = 14400
  acknowledgement_timeout = 600   # Re-trigger in 10 min for critical db issues
  escalation_policy       = pagerduty_escalation_policy.platform.id

  # Use time-based urgency - critical during business hours
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
    end_time     = "17:00:00"
    days_of_week = [1, 2, 3, 4, 5]  # Monday through Friday
  }

  scheduled_actions {
    type       = "urgency_change"
    to_urgency = "high"

    at {
      type = "named_time"
      name = "support_hours_start"
    }
  }
}
```

## Creating Service Integrations

```hcl
# integrations.tf
# CloudWatch integration for the API service
resource "pagerduty_service_integration" "cloudwatch" {
  name    = "AWS CloudWatch"
  type    = "aws_cloudwatch_inbound_integration"
  service = pagerduty_service.api.id
}

# Datadog integration (uses the vendor data source)
data "pagerduty_vendor" "datadog" {
  name = "Datadog"
}

resource "pagerduty_service_integration" "datadog" {
  name    = data.pagerduty_vendor.datadog.name
  vendor  = data.pagerduty_vendor.datadog.id
  service = pagerduty_service.api.id
}

output "cloudwatch_integration_key" {
  description = "Integration key to configure in CloudWatch SNS"
  value       = pagerduty_service_integration.cloudwatch.integration_key
  sensitive   = true
}
```

## Best Practices

- Use `data` sources for existing users rather than creating them with OpenTofu to avoid managing user lifecycle in code.
- Set appropriate `acknowledgement_timeout` values - too short leads to alert fatigue, too long means slow response.
- Use time-based urgency rules for non-critical services to avoid waking people up for low-severity issues outside business hours.
- Store PagerDuty integration keys in a secrets manager after they are output from OpenTofu.
- Version your escalation policies - store them as code to ensure new services follow team agreements.
