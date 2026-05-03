# How to Create Opsgenie Teams and Escalations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OpsGenie, Incident Management, On-Call, Infrastructure as Code

Description: Learn how to configure Opsgenie teams, escalation policies, on-call schedules, and alert routing with OpenTofu.

Opsgenie manages on-call schedules and alert routing for incident response. Managing teams, escalations, and schedules in OpenTofu ensures your incident response configuration is version-controlled and consistent across all services.

## Provider Configuration

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
```

## Creating a Team

```hcl
resource "opsgenie_team" "backend" {
  name        = "Backend Engineering"
  description = "Backend engineering on-call team"

  member {
    id   = opsgenie_user.alice.id
    role = "admin"
  }

  member {
    id   = opsgenie_user.bob.id
    role = "user"
  }
}

resource "opsgenie_user" "alice" {
  username  = "alice@example.com"
  full_name = "Alice Smith"
  role      = "User"
  locale    = "en_US"
  timezone  = "America/New_York"
}

resource "opsgenie_user" "bob" {
  username  = "bob@example.com"
  full_name = "Bob Jones"
  role      = "User"
  locale    = "en_US"
  timezone  = "America/New_York"
}
```

## On-Call Schedule

```hcl
resource "opsgenie_schedule" "backend_oncall" {
  name          = "Backend On-Call"
  description   = "Weekly rotation for backend team"
  timezone      = "America/New_York"
  enabled       = true
  owner_team_id = opsgenie_team.backend.id
}

resource "opsgenie_schedule_rotation" "backend_primary" {
  schedule_id = opsgenie_schedule.backend_oncall.id
  name        = "Primary Rotation"
  type        = "weekly"
  length      = 1
  start_date  = "2024-01-01T09:00:00Z"

  participant {
    type = "user"
    id   = opsgenie_user.alice.id
  }

  participant {
    type = "user"
    id   = opsgenie_user.bob.id
  }

  time_restriction {
    type = "weekday-and-time-of-day"

    restriction {
      start_day  = "monday"
      end_day    = "friday"
      start_hour = 9
      start_min  = 0
      end_hour   = 18
      end_min    = 0
    }
  }
}
```

## Escalation Policy

```hcl
resource "opsgenie_escalation" "backend" {
  name          = "Backend Escalation"
  description   = "Escalation policy for backend services"
  owner_team_id = opsgenie_team.backend.id

  rules {
    condition   = "if-not-acked"
    notify_type = "default"
    delay       = 0  # Notify immediately

    recipient {
      type = "schedule"
      id   = opsgenie_schedule.backend_oncall.id
    }
  }

  rules {
    condition   = "if-not-acked"
    notify_type = "default"
    delay       = 30  # Escalate after 30 minutes

    recipient {
      type = "user"
      id   = opsgenie_user.alice.id  # Engineering manager
    }
  }

  rules {
    condition   = "if-not-closed"
    notify_type = "default"
    delay       = 60  # Final escalation after 60 minutes

    recipient {
      type = "team"
      id   = opsgenie_team.backend.id
    }
  }
}
```

## Alert Routing (Team Routing Rules)

```hcl
resource "opsgenie_team_routing_rule" "backend" {
  team_id = opsgenie_team.backend.id
  name    = "Backend Alert Routing"
  order   = 0

  criteria {
    type = "match-all-conditions"

    conditions {
      field          = "tags"
      operation      = "contains"
      expected_value = "team:backend"
    }
  }

  notify {
    type = "escalation"
    id   = opsgenie_escalation.backend.id
  }

  time_restriction {
    type = "time-of-day"

    restriction {
      start_hour = 0
      start_min  = 0
      end_hour   = 23
      end_min    = 59
    }
  }
}
```

## Service Integration

```hcl
resource "opsgenie_api_integration" "prometheus" {
  name          = "Prometheus Alertmanager"
  type          = "Prometheus"
  owner_team_id = opsgenie_team.backend.id
  enabled       = true

  responders {
    type = "schedule"
    id   = opsgenie_schedule.backend_oncall.id
  }
}
```

## Conclusion

Opsgenie teams, schedules, and escalations managed in OpenTofu give you auditable, reviewable incident response configuration. Define weekly on-call rotations, multi-level escalation rules, and alert routing conditions. Changes to who gets paged require code review, preventing silent misconfiguration of your incident response pipeline.
