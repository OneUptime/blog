# How to Create PagerDuty Escalation Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, PagerDuty, Escalation, Incident Management, Infrastructure as Code

Description: Learn how to create PagerDuty escalation policies using Terraform to define multi-level on-call escalation chains for incident response.

---

PagerDuty escalation policies define the chain of responders when an incident occurs. They specify who gets notified first, how long to wait before escalating, and who to escalate to if the incident is not acknowledged. Managing these policies through Terraform ensures your on-call processes are consistent and auditable. This guide covers creating escalation policies with multiple levels, schedules, and team assignments.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

provider "pagerduty" {
  token = var.pagerduty_token
}

variable "pagerduty_token" { type = string; sensitive = true }
```

## Creating Users and Schedules

```hcl
# Reference existing users
data "pagerduty_user" "alice" {
  email = "alice@company.com"
}

data "pagerduty_user" "bob" {
  email = "bob@company.com"
}

data "pagerduty_user" "charlie" {
  email = "charlie@company.com"
}

# Create an on-call schedule
resource "pagerduty_schedule" "primary" {
  name      = "Primary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2026-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2026-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 1 week
    users = [
      data.pagerduty_user.alice.id,
      data.pagerduty_user.bob.id,
      data.pagerduty_user.charlie.id,
    ]
  }
}

# Secondary on-call schedule
resource "pagerduty_schedule" "secondary" {
  name      = "Secondary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation (Offset)"
    start                        = "2026-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2026-01-08T00:00:00-05:00"
    rotation_turn_length_seconds = 604800
    users = [
      data.pagerduty_user.bob.id,
      data.pagerduty_user.charlie.id,
      data.pagerduty_user.alice.id,
    ]
  }
}
```

## Basic Escalation Policy

```hcl
# Two-level escalation policy
resource "pagerduty_escalation_policy" "standard" {
  name      = "Standard Escalation"
  num_loops = 2  # Repeat the escalation chain twice before giving up

  # Level 1: Primary on-call
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }
  }

  # Level 2: Secondary on-call + engineering manager
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.secondary.id
    }

    target {
      type = "user_reference"
      id   = data.pagerduty_user.charlie.id
    }
  }
}
```

## Critical Escalation Policy

```hcl
# Fast escalation for critical services
resource "pagerduty_escalation_policy" "critical" {
  name      = "Critical Service Escalation"
  num_loops = 3

  # Level 1: Immediate - primary and secondary on-call together
  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.secondary.id
    }
  }

  # Level 2: Engineering manager
  rule {
    escalation_delay_in_minutes = 10

    target {
      type = "user_reference"
      id   = var.eng_manager_id
    }
  }

  # Level 3: VP of Engineering (last resort)
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "user_reference"
      id   = var.vp_eng_id
    }
  }
}

variable "eng_manager_id" { type = string }
variable "vp_eng_id" { type = string }
```

## Team-Based Escalation Policies

```hcl
# Create team-specific escalation policies
variable "teams" {
  type = map(object({
    schedule_id        = string
    escalation_delay   = number
    manager_id         = string
  }))
}

resource "pagerduty_escalation_policy" "team" {
  for_each  = var.teams
  name      = "${each.key} Escalation Policy"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = each.value.escalation_delay
    target {
      type = "schedule_reference"
      id   = each.value.schedule_id
    }
  }

  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "user_reference"
      id   = each.value.manager_id
    }
  }
}
```

## Escalation Policy with On-Call Handoff Notifications

Configure escalation policies that notify users about on-call transitions:

```hcl
# Create a schedule with handoff notifications
resource "pagerduty_schedule" "with_handoff" {
  name      = "Primary On-Call with Handoff"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2026-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2026-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800

    users = [
      data.pagerduty_user.alice.id,
      data.pagerduty_user.bob.id,
      data.pagerduty_user.charlie.id,
    ]

    # Restrict on-call to specific hours (business hours only)
    restriction {
      type              = "weekly_restriction"
      start_day_of_week = 1
      start_time_of_day = "09:00:00"
      duration_seconds  = 28800  # 8 hours
    }
  }
}
```

## Multiple Service Tiers with Dedicated Policies

Different service tiers often need different escalation behavior. Critical revenue-generating services need faster escalation with more responders, while internal tools can tolerate longer response times:

```hcl
# Define service tiers
variable "service_tiers" {
  type = map(object({
    escalation_delay_level_1 = number
    escalation_delay_level_2 = number
    num_loops                = number
  }))
  default = {
    "tier-1-critical" = {
      escalation_delay_level_1 = 5
      escalation_delay_level_2 = 10
      num_loops                = 3
    }
    "tier-2-important" = {
      escalation_delay_level_1 = 15
      escalation_delay_level_2 = 15
      num_loops                = 2
    }
    "tier-3-standard" = {
      escalation_delay_level_1 = 30
      escalation_delay_level_2 = 30
      num_loops                = 1
    }
  }
}

resource "pagerduty_escalation_policy" "tiered" {
  for_each  = var.service_tiers
  name      = "${each.key} Escalation"
  num_loops = each.value.num_loops

  rule {
    escalation_delay_in_minutes = each.value.escalation_delay_level_1
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }
  }

  rule {
    escalation_delay_in_minutes = each.value.escalation_delay_level_2
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.secondary.id
    }
  }
}
```

## Outputs for Service Configuration

Expose escalation policy IDs for use by other Terraform configurations:

```hcl
output "escalation_policy_ids" {
  value = {
    standard = pagerduty_escalation_policy.standard.id
    critical = pagerduty_escalation_policy.critical.id
  }
  description = "Escalation policy IDs for service configuration"
}
```

## Best Practices

Keep escalation delays short for critical services (5-10 minutes) and longer for non-critical ones (15-30 minutes). Always have at least two escalation levels to avoid incidents going unacknowledged. Use schedules rather than individual users at the first level so on-call rotations work automatically. Set num_loops to at least 2 so the escalation chain repeats if no one responds in the first pass. Include a management-level contact as the final escalation target.

For creating the services that use escalation policies, see our guide on [PagerDuty services](https://oneuptime.com/blog/post/2026-02-23-how-to-create-pagerduty-services-with-terraform/view).

## Conclusion

PagerDuty escalation policies managed through Terraform provide a clear, auditable chain of responsibility for incident response. By defining escalation rules as code, you ensure that every service has an appropriate response plan and that changes to on-call processes are tracked and reviewed. The combination of schedules, escalation levels, and team-based policies creates a robust incident management foundation.
