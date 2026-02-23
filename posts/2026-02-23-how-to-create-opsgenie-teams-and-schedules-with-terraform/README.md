# How to Create OpsGenie Teams and Schedules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, OpsGenie, Incident Management, On-Call, Infrastructure as Code

Description: Learn how to create OpsGenie teams, on-call schedules, and routing rules using Terraform for automated incident management configuration.

---

OpsGenie provides incident management with on-call scheduling, alert routing, and escalation capabilities. Managing OpsGenie configuration through Terraform ensures your incident management setup is version-controlled and reproducible. This guide covers creating teams, schedules, rotations, and routing rules.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    opsgenie = {
      source  = "opsgenie/opsgenie"
      version = "~> 0.6"
    }
  }
}

provider "opsgenie" {
  api_key = var.opsgenie_api_key
}

variable "opsgenie_api_key" { type = string; sensitive = true }
```

## Creating Teams

```hcl
# Create a platform engineering team
resource "opsgenie_team" "platform" {
  name        = "Platform Engineering"
  description = "Responsible for core infrastructure and platform services"

  member {
    id   = data.opsgenie_user.alice.id
    role = "admin"
  }

  member {
    id   = data.opsgenie_user.bob.id
    role = "user"
  }

  member {
    id   = data.opsgenie_user.charlie.id
    role = "user"
  }
}

data "opsgenie_user" "alice" {
  username = "alice@company.com"
}

data "opsgenie_user" "bob" {
  username = "bob@company.com"
}

data "opsgenie_user" "charlie" {
  username = "charlie@company.com"
}

# Create additional teams
resource "opsgenie_team" "backend" {
  name        = "Backend Engineering"
  description = "Responsible for backend services and APIs"

  member {
    id   = data.opsgenie_user.bob.id
    role = "admin"
  }
}
```

## Creating On-Call Schedules

```hcl
# Create a weekly rotation schedule
resource "opsgenie_schedule" "platform_oncall" {
  name          = "Platform On-Call"
  description   = "Weekly on-call rotation for platform team"
  timezone      = "America/New_York"
  owner_team_id = opsgenie_team.platform.id
  enabled       = true
}

# Define the rotation within the schedule
resource "opsgenie_schedule_rotation" "platform_weekly" {
  schedule_id  = opsgenie_schedule.platform_oncall.id
  name         = "Weekly Rotation"
  start_date   = "2026-01-01T00:00:00Z"
  type         = "weekly"
  length       = 1

  participants {
    type = "user"
    id   = data.opsgenie_user.alice.id
  }

  participants {
    type = "user"
    id   = data.opsgenie_user.bob.id
  }

  participants {
    type = "user"
    id   = data.opsgenie_user.charlie.id
  }

  # Restrict to specific time ranges if needed
  time_restriction {
    type = "weekday-and-time-of-day"

    restrictions {
      start_day  = "monday"
      start_hour = 9
      start_min  = 0
      end_day    = "friday"
      end_hour   = 17
      end_min    = 0
    }
  }
}

# After-hours rotation
resource "opsgenie_schedule_rotation" "platform_afterhours" {
  schedule_id = opsgenie_schedule.platform_oncall.id
  name        = "After Hours Rotation"
  start_date  = "2026-01-01T17:00:00Z"
  type        = "weekly"
  length      = 1

  participants {
    type = "user"
    id   = data.opsgenie_user.alice.id
  }

  participants {
    type = "user"
    id   = data.opsgenie_user.bob.id
  }
}
```

## Escalation Policies

```hcl
# Create an escalation policy
resource "opsgenie_escalation" "platform" {
  name          = "Platform Escalation"
  owner_team_id = opsgenie_team.platform.id

  rules {
    condition   = "if-not-acked"
    notify_type = "default"
    delay       = 5

    recipient {
      type = "schedule"
      id   = opsgenie_schedule.platform_oncall.id
    }
  }

  rules {
    condition   = "if-not-acked"
    notify_type = "default"
    delay       = 15

    recipient {
      type = "user"
      id   = data.opsgenie_user.alice.id
    }
  }
}
```

## Team Routing Rules

```hcl
# Route alerts to the correct team based on conditions
resource "opsgenie_team_routing_rule" "api_alerts" {
  name      = "API Service Alerts"
  team_id   = opsgenie_team.platform.id
  order     = 0

  criteria {
    type = "match-all-conditions"

    conditions {
      field          = "tags"
      operation      = "contains"
      expected_value = "service:api"
    }
  }

  notify {
    type = "escalation"
    name = opsgenie_escalation.platform.name
    id   = opsgenie_escalation.platform.id
  }
}

# Catch-all routing rule
resource "opsgenie_team_routing_rule" "default" {
  name    = "Default Route"
  team_id = opsgenie_team.platform.id
  order   = 1

  criteria {
    type = "match-all"
  }

  notify {
    type = "schedule"
    name = opsgenie_schedule.platform_oncall.name
    id   = opsgenie_schedule.platform_oncall.id
  }
}
```

## API Integrations

```hcl
# Create an API integration for receiving alerts
resource "opsgenie_api_integration" "cloudwatch" {
  name                           = "AWS CloudWatch"
  type                           = "AmazonCloudWatch"
  owner_team_id                  = opsgenie_team.platform.id
  allow_write_access             = true
  suppress_notifications         = false
  enabled                        = true
}

resource "opsgenie_api_integration" "datadog" {
  name                           = "Datadog Integration"
  type                           = "Datadog"
  owner_team_id                  = opsgenie_team.platform.id
  allow_write_access             = true
  enabled                        = true
}

output "cloudwatch_integration_api_key" {
  value     = opsgenie_api_integration.cloudwatch.api_key
  sensitive = true
}
```

## Multiple Teams at Scale

```hcl
variable "team_configs" {
  type = map(object({
    description = string
    admin_email = string
    members     = list(string)
  }))
  default = {
    "frontend" = {
      description = "Frontend engineering team"
      admin_email = "fe-lead@company.com"
      members     = ["dev1@company.com", "dev2@company.com"]
    }
    "data" = {
      description = "Data engineering team"
      admin_email = "data-lead@company.com"
      members     = ["data1@company.com", "data2@company.com"]
    }
  }
}
```

## Best Practices

Define team membership alongside schedules so they stay in sync. Use time restrictions on rotations to handle business hours and after-hours differently. Create routing rules that match based on alert tags or message content. Always have a catch-all routing rule to prevent alerts from being lost. Use escalation policies with reasonable delays to balance response time with alert fatigue.

For integrating OpsGenie with monitoring tools, see our guide on [creating Datadog monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-datadog-monitors-with-terraform/view).

## Conclusion

OpsGenie teams and schedules managed through Terraform provide a structured, version-controlled approach to incident management. By defining teams, rotations, escalation policies, and routing rules as code, you ensure that your incident response processes are consistent, auditable, and automatically deployed alongside your infrastructure.
