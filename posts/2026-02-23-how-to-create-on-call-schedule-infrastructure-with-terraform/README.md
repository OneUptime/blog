# How to Create On-Call Schedule Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, On-Call, PagerDuty, DevOps, Incident Response, Infrastructure as Code

Description: Learn how to create and manage on-call schedules, rotation policies, and override rules using Terraform with PagerDuty for reliable incident response.

---

On-call schedules are a critical part of keeping production systems reliable. When an incident happens at 3 AM, someone needs to be available to respond. Managing on-call schedules manually through web interfaces is tedious and error-prone. Terraform allows you to define on-call rotations, overrides, and escalation policies as code, making them version-controlled and easy to manage across teams.

In this guide, we will build comprehensive on-call schedule infrastructure using Terraform with PagerDuty. We will cover weekly rotations, follow-the-sun schedules, override layers, and escalation policies.

## Why Terraform for On-Call Schedules

On-call schedules change frequently as team members join, leave, or go on vacation. Managing these changes through a web UI creates several problems. There is no audit trail of who changed what and when. There is no way to preview changes before they take effect. And there is no easy way to replicate schedule patterns across teams. Terraform solves all of these problems by treating on-call schedules as infrastructure code.

## Provider Setup

```hcl
# main.tf - Configure the PagerDuty provider
terraform {
  required_version = ">= 1.5.0"

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

variable "pagerduty_token" {
  description = "PagerDuty API token"
  type        = string
  sensitive   = true
}

variable "timezone" {
  description = "Default timezone for schedules"
  type        = string
  default     = "America/New_York"
}
```

## Defining Team Members

Create a variable structure that maps team members to their details:

```hcl
# variables.tf - Define team structure
variable "teams" {
  description = "Map of teams with their on-call members"
  type = map(object({
    description          = string
    rotation_type        = string  # weekly, daily, custom
    rotation_length_days = number
    handoff_time         = string  # HH:MM format
    members              = list(string)  # PagerDuty user emails
  }))
  default = {
    "platform-engineering" = {
      description          = "Platform team responsible for infrastructure"
      rotation_type        = "weekly"
      rotation_length_days = 7
      handoff_time         = "09:00"
      members = [
        "alice@example.com",
        "bob@example.com",
        "carol@example.com",
        "dave@example.com"
      ]
    }
    "backend-services" = {
      description          = "Backend team responsible for APIs"
      rotation_type        = "weekly"
      rotation_length_days = 7
      handoff_time         = "09:00"
      members = [
        "eve@example.com",
        "frank@example.com",
        "grace@example.com"
      ]
    }
    "database-operations" = {
      description          = "DBA team for database issues"
      rotation_type        = "daily"
      rotation_length_days = 1
      handoff_time         = "08:00"
      members = [
        "heidi@example.com",
        "ivan@example.com"
      ]
    }
  }
}

# Look up PagerDuty users by email
data "pagerduty_user" "members" {
  for_each = toset(flatten([for team in var.teams : team.members]))
  email    = each.value
}
```

## Creating Weekly Rotation Schedules

The most common on-call pattern is a weekly rotation where each team member takes a turn:

```hcl
# schedules.tf - Create on-call schedules for each team
resource "pagerduty_schedule" "primary" {
  for_each = var.teams

  name      = "${each.key}-primary-oncall"
  time_zone = var.timezone

  # Primary on-call layer with rotation
  layer {
    name                         = "Primary Rotation"
    start                        = "2025-01-01T${each.value.handoff_time}:00-05:00"
    rotation_virtual_start       = "2025-01-01T${each.value.handoff_time}:00-05:00"
    rotation_turn_length_seconds = each.value.rotation_length_days * 86400

    # Map email addresses to PagerDuty user IDs
    users = [
      for member in each.value.members :
      data.pagerduty_user.members[member].id
    ]
  }
}

# Secondary/backup on-call schedule
# The backup is the person who was on-call last week
resource "pagerduty_schedule" "secondary" {
  for_each = var.teams

  name      = "${each.key}-secondary-oncall"
  time_zone = var.timezone

  layer {
    name                         = "Secondary Rotation"
    start                        = "2025-01-01T${each.value.handoff_time}:00-05:00"
    rotation_virtual_start       = "2025-01-01T${each.value.handoff_time}:00-05:00"
    rotation_turn_length_seconds = each.value.rotation_length_days * 86400

    # Offset the rotation by one position for backup coverage
    users = concat(
      slice([for m in each.value.members : data.pagerduty_user.members[m].id], 1, length(each.value.members)),
      [data.pagerduty_user.members[each.value.members[0]].id]
    )
  }
}
```

## Creating a Follow-the-Sun Schedule

For global teams, create a follow-the-sun schedule that routes to different regions based on time of day:

```hcl
# follow-the-sun.tf - Schedule that follows business hours across time zones
variable "global_team" {
  description = "Follow-the-sun team configuration"
  type = object({
    us_members   = list(string)
    eu_members   = list(string)
    apac_members = list(string)
  })
  default = {
    us_members   = ["alice@example.com", "bob@example.com"]
    eu_members   = ["carol@example.com", "dave@example.com"]
    apac_members = ["eve@example.com", "frank@example.com"]
  }
}

resource "pagerduty_schedule" "follow_the_sun" {
  name      = "global-follow-the-sun"
  time_zone = "UTC"

  # US coverage: 14:00 UTC to 22:00 UTC (9am-5pm ET)
  layer {
    name                         = "US Coverage"
    start                        = "2025-01-01T14:00:00Z"
    rotation_virtual_start       = "2025-01-01T14:00:00Z"
    rotation_turn_length_seconds = 604800  # Weekly

    users = [
      for m in var.global_team.us_members :
      data.pagerduty_user.members[m].id
    ]

    # Only active during US business hours
    restriction {
      type              = "daily_restriction"
      start_time_of_day = "14:00:00"
      duration_seconds  = 28800  # 8 hours
      start_day_of_week = 1  # Monday
    }
  }

  # EU coverage: 08:00 UTC to 14:00 UTC (9am-3pm CET)
  layer {
    name                         = "EU Coverage"
    start                        = "2025-01-01T08:00:00Z"
    rotation_virtual_start       = "2025-01-01T08:00:00Z"
    rotation_turn_length_seconds = 604800

    users = [
      for m in var.global_team.eu_members :
      data.pagerduty_user.members[m].id
    ]

    restriction {
      type              = "daily_restriction"
      start_time_of_day = "08:00:00"
      duration_seconds  = 21600  # 6 hours
      start_day_of_week = 1
    }
  }

  # APAC coverage: 00:00 UTC to 08:00 UTC (9am-5pm JST)
  layer {
    name                         = "APAC Coverage"
    start                        = "2025-01-01T00:00:00Z"
    rotation_virtual_start       = "2025-01-01T00:00:00Z"
    rotation_turn_length_seconds = 604800

    users = [
      for m in var.global_team.apac_members :
      data.pagerduty_user.members[m].id
    ]

    restriction {
      type              = "daily_restriction"
      start_time_of_day = "00:00:00"
      duration_seconds  = 28800  # 8 hours
      start_day_of_week = 1
    }
  }
}
```

## Creating Escalation Policies

Escalation policies determine what happens when the primary on-call does not respond:

```hcl
# escalation.tf - Escalation policies for each team
resource "pagerduty_escalation_policy" "team_policy" {
  for_each  = var.teams
  name      = "${each.key}-escalation"
  num_loops = 2  # Try the full escalation chain twice

  # Level 1: Primary on-call
  rule {
    escalation_delay_in_minutes = 10

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary[each.key].id
    }
  }

  # Level 2: Secondary on-call (backup)
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.secondary[each.key].id
    }
  }

  # Level 3: Notify the entire team
  rule {
    escalation_delay_in_minutes = 20

    dynamic "target" {
      for_each = each.value.members

      content {
        type = "user_reference"
        id   = data.pagerduty_user.members[target.value].id
      }
    }
  }
}
```

## Creating PagerDuty Services Linked to Schedules

Connect services to the escalation policies:

```hcl
# services.tf - PagerDuty services using the escalation policies
resource "pagerduty_service" "monitored" {
  for_each = {
    "production-api"      = "platform-engineering"
    "production-database" = "database-operations"
    "production-backend"  = "backend-services"
  }

  name              = each.key
  escalation_policy = pagerduty_escalation_policy.team_policy[each.value].id

  auto_resolve_timeout    = 14400   # 4 hours
  acknowledgement_timeout = 1800    # 30 minutes
  alert_creation          = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}
```

## PagerDuty Teams

```hcl
# pagerduty-teams.tf - Create PagerDuty teams
resource "pagerduty_team" "teams" {
  for_each    = var.teams
  name        = each.key
  description = each.value.description
}

resource "pagerduty_team_membership" "members" {
  for_each = {
    for pair in flatten([
      for team_name, team in var.teams : [
        for member in team.members : {
          key     = "${team_name}-${member}"
          team_id = pagerduty_team.teams[team_name].id
          user_id = data.pagerduty_user.members[member].id
        }
      ]
    ]) : pair.key => pair
  }

  team_id = each.value.team_id
  user_id = each.value.user_id
  role    = "responder"
}
```

## Outputs

```hcl
# outputs.tf - Export schedule and policy identifiers
output "primary_schedule_ids" {
  description = "Primary on-call schedule IDs per team"
  value       = { for k, v in pagerduty_schedule.primary : k => v.id }
}

output "secondary_schedule_ids" {
  description = "Secondary on-call schedule IDs per team"
  value       = { for k, v in pagerduty_schedule.secondary : k => v.id }
}

output "escalation_policy_ids" {
  description = "Escalation policy IDs per team"
  value       = { for k, v in pagerduty_escalation_policy.team_policy : k => v.id }
}

output "follow_the_sun_schedule_id" {
  description = "Follow-the-sun schedule ID"
  value       = pagerduty_schedule.follow_the_sun.id
}
```

## Conclusion

Managing on-call schedules with Terraform transforms a manual, error-prone process into a repeatable, auditable workflow. Every rotation change, override, and escalation policy update goes through code review before taking effect. The patterns shown here cover the most common scenarios including weekly rotations, follow-the-sun schedules, and multi-level escalation. Combined with [incident management infrastructure](https://oneuptime.com/blog/post/2026-02-23-how-to-create-incident-management-infrastructure-with-terraform/view), you can build a complete incident response system that is fully managed as code.
