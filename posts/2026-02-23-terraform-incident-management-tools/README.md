# How to Use Terraform with Incident Management Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Incident Management, DevOps, PagerDuty, OpsGenie, On-Call

Description: Learn how to use Terraform to configure incident management tools like PagerDuty, Opsgenie, and Rootly so your on-call rotations and escalation policies are version-controlled.

---

Incident management tools are the backbone of on-call operations. They determine who gets paged, how incidents escalate, and what happens when things go wrong at 3 AM. When you manage these configurations through Terraform, every change to an on-call schedule, escalation policy, or service definition goes through code review. This prevents the accidental misconfigurations that cause pages to be missed during critical incidents.

In this guide, we will walk through managing PagerDuty, Opsgenie, and other incident management platforms using Terraform. You will learn how to define services, on-call schedules, escalation policies, and integrations as code.

## Why Manage Incident Tooling with Terraform

Most incident management configurations start simple but grow complex quickly. Teams add schedules, override rotations, escalation tiers, and service dependencies. Making these changes through a web UI without review leads to misconfigurations that only surface during actual incidents, which is the worst possible time to discover a broken escalation policy.

Terraform brings discipline to this process. Changes are proposed in pull requests, reviewed by the team, and applied through automation. If something breaks, you can roll back to a previous known-good configuration by reverting the commit.

## Complete PagerDuty Setup with Terraform

Let us build a complete PagerDuty configuration from scratch, starting with teams and users and building up to services with escalation policies.

```hcl
# providers.tf
terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.6"
    }
  }
}

provider "pagerduty" {
  token = var.pagerduty_token
}

# teams.tf - Define the team structure
resource "pagerduty_team" "platform" {
  name        = "Platform Engineering"
  description = "Manages core platform services"
}

resource "pagerduty_team" "backend" {
  name        = "Backend Engineering"
  description = "Manages backend API services"
  parent      = pagerduty_team.platform.id
}

# Add team members
resource "pagerduty_team_membership" "platform_members" {
  for_each = var.platform_team_members

  user_id = each.value.user_id
  team_id = pagerduty_team.platform.id
  role    = each.value.role
}
```

## On-Call Schedules

Define rotation schedules that automatically rotate through team members.

```hcl
# schedules.tf

# Primary on-call rotation - weekly
resource "pagerduty_schedule" "platform_primary" {
  name      = "Platform Primary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2024-01-01T08:00:00-05:00"
    rotation_virtual_start       = "2024-01-01T08:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 7 days

    users = var.primary_oncall_users
  }
}

# Secondary on-call rotation - offset by one position
resource "pagerduty_schedule" "platform_secondary" {
  name      = "Platform Secondary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2024-01-08T08:00:00-05:00"  # Offset by 1 week
    rotation_virtual_start       = "2024-01-08T08:00:00-05:00"
    rotation_turn_length_seconds = 604800

    users = var.primary_oncall_users  # Same users, different offset
  }
}

# Business hours schedule for non-critical services
resource "pagerduty_schedule" "business_hours" {
  name      = "Business Hours Coverage"
  time_zone = "America/New_York"

  layer {
    name                         = "Business Hours Only"
    start                        = "2024-01-01T09:00:00-05:00"
    rotation_virtual_start       = "2024-01-01T09:00:00-05:00"
    rotation_turn_length_seconds = 86400  # Daily

    users = var.business_hours_users

    restriction {
      type              = "weekly_restriction"
      start_day_of_week = 1  # Monday
      start_time_of_day = "09:00:00"
      duration_seconds  = 32400  # 9 hours (9 AM to 6 PM)
    }
  }
}
```

## Escalation Policies

Create layered escalation policies that ensure incidents always reach someone.

```hcl
# escalation_policies.tf

# Critical service escalation - aggressive timing
resource "pagerduty_escalation_policy" "critical" {
  name      = "Critical Service Escalation"
  num_loops = 3

  # First: page the primary on-call
  rule {
    escalation_delay_in_minutes = 5
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.platform_primary.id
    }
  }

  # After 5 minutes: page the secondary on-call
  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.platform_secondary.id
    }
  }

  # After 15 minutes: page the engineering manager
  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "user_reference"
      id   = var.engineering_manager_id
    }
  }

  # After 30 minutes: page the VP of Engineering
  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "user_reference"
      id   = var.vp_engineering_id
    }
  }

  teams = [pagerduty_team.platform.id]
}

# Non-critical escalation - more relaxed timing
resource "pagerduty_escalation_policy" "standard" {
  name      = "Standard Service Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.platform_primary.id
    }
  }

  rule {
    escalation_delay_in_minutes = 30
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.platform_secondary.id
    }
  }

  teams = [pagerduty_team.platform.id]
}
```

## Service Definitions

Define PagerDuty services that correspond to your infrastructure components.

```hcl
# services.tf

# Create services with appropriate escalation policies
resource "pagerduty_service" "api_gateway" {
  name              = "API Gateway"
  description       = "Main API gateway handling all external traffic"
  escalation_policy = pagerduty_escalation_policy.critical.id

  alert_creation = "create_alerts_and_incidents"

  auto_resolve_timeout    = 14400  # 4 hours
  acknowledgement_timeout = 600    # 10 minutes

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }

  alert_grouping_parameters {
    type = "intelligent"
    config {
      time_window = 300
    }
  }
}

resource "pagerduty_service" "background_jobs" {
  name              = "Background Job Processor"
  description       = "Async job processing system"
  escalation_policy = pagerduty_escalation_policy.standard.id

  alert_creation = "create_alerts_and_incidents"

  auto_resolve_timeout    = 28800  # 8 hours
  acknowledgement_timeout = 1800   # 30 minutes

  # Use time-based urgency for non-critical services
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
    type       = "fixed_time_per_day"
    time_zone  = "America/New_York"
    days_of_week = [1, 2, 3, 4, 5]
    start_time = "09:00:00"
    end_time   = "18:00:00"
  }
}

# Service integration with monitoring tools
resource "pagerduty_service_integration" "api_gateway_datadog" {
  name    = "Datadog"
  service = pagerduty_service.api_gateway.id
  vendor  = data.pagerduty_vendor.datadog.id
}

data "pagerduty_vendor" "datadog" {
  name = "Datadog"
}
```

## Opsgenie Configuration

If your organization uses Opsgenie, the Terraform provider follows similar patterns.

```hcl
# Opsgenie provider setup
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

# Create a team
resource "opsgenie_team" "platform" {
  name        = "Platform Team"
  description = "Platform engineering team"

  member {
    id   = var.team_lead_id
    role = "admin"
  }

  dynamic "member" {
    for_each = var.team_member_ids
    content {
      id   = member.value
      role = "user"
    }
  }
}

# Create a schedule
resource "opsgenie_schedule" "platform_oncall" {
  name          = "Platform On-Call"
  description   = "Weekly on-call rotation"
  timezone      = "America/New_York"
  owner_team_id = opsgenie_team.platform.id
  enabled       = true
}

# Create an escalation
resource "opsgenie_escalation" "platform" {
  name          = "Platform Escalation"
  owner_team_id = opsgenie_team.platform.id

  rules {
    condition   = "if-not-acked"
    notify_type = "schedule"
    delay       = 5
    recipient {
      type = "schedule"
      id   = opsgenie_schedule.platform_oncall.id
    }
  }

  rules {
    condition   = "if-not-acked"
    notify_type = "user"
    delay       = 15
    recipient {
      type = "user"
      id   = var.team_lead_id
    }
  }
}
```

## Connecting Infrastructure to Incident Management

The best practice is to create incident management resources alongside the infrastructure they support.

```hcl
# When you create infrastructure, create the corresponding service
module "api_service" {
  source = "./modules/api-service"

  service_name    = "user-api"
  instance_type   = "t3.large"
  instance_count  = 3
  environment     = "production"
}

# Automatically create the PagerDuty service for it
resource "pagerduty_service" "user_api" {
  name              = "User API - ${var.environment}"
  escalation_policy = pagerduty_escalation_policy.critical.id
  alert_creation    = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }

  depends_on = [module.api_service]
}

# Output the integration key for monitoring tools
output "pagerduty_integration_key" {
  value     = pagerduty_service_integration.user_api_events.integration_key
  sensitive = true
}

resource "pagerduty_service_integration" "user_api_events" {
  name    = "Events API V2"
  service = pagerduty_service.user_api.id
  type    = "events_api_v2_inbound_integration"
}
```

## Best Practices

Always test escalation policies after applying changes. Create a test incident to verify that pages reach the right people at the right times.

Use Terraform workspaces or separate state files per environment. Your staging environment should have different on-call configurations than production.

Keep sensitive data like API tokens in environment variables or a secrets manager, never in your Terraform files.

Document the purpose of each service and escalation policy in the resource description. This helps on-call engineers understand the context when they receive a page.

For more on Terraform state management, see our guide on [Terraform State File Structure](https://oneuptime.com/blog/post/2026-02-23-terraform-state-file-structure/view).

## Conclusion

Managing incident management tools with Terraform ensures that your on-call configurations are reliable, reviewable, and reproducible. By defining services, schedules, and escalation policies as code, you prevent the misconfigurations that cause incidents to be missed. Every change goes through review, and you can always roll back to a known-good state. Start with your most critical services and expand from there.
