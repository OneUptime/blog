# How to Integrate Terraform with PagerDuty for Alerting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, PagerDuty, DevOps, Alerting, Incident Management, Infrastructure as Code

Description: Learn how to integrate Terraform with PagerDuty to manage alerting configurations as code and trigger incidents from infrastructure changes automatically.

---

PagerDuty is a leading incident management platform, and Terraform is the standard for infrastructure as code. Combining these two tools allows you to manage your entire alerting infrastructure as code while also triggering alerts based on infrastructure events. This guide covers both managing PagerDuty resources with Terraform and sending alerts from Terraform workflows.

## Why Integrate Terraform with PagerDuty?

Managing PagerDuty configurations manually through the web interface becomes difficult as organizations scale. Teams, services, escalation policies, and integrations multiply quickly. By managing PagerDuty with Terraform, you gain version control for alerting configurations, repeatable setup across environments, automated provisioning of services for new applications, and the ability to link infrastructure changes directly to incident management.

## Prerequisites

You will need a PagerDuty account with admin access, a PagerDuty API key (found under API Access Keys in PagerDuty settings), and Terraform version 1.0 or later installed.

## Setting Up the PagerDuty Provider

Start by configuring the official PagerDuty Terraform provider.

```hcl
# providers.tf
# Configure Terraform with the PagerDuty provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

# Initialize the PagerDuty provider with your API token
provider "pagerduty" {
  token = var.pagerduty_token
}

# Store the API token as a sensitive variable
variable "pagerduty_token" {
  description = "PagerDuty API token for authentication"
  type        = string
  sensitive   = true
}
```

## Managing PagerDuty Teams and Users

Define your teams and user assignments in Terraform.

```hcl
# teams.tf
# Create the infrastructure team in PagerDuty
resource "pagerduty_team" "infrastructure" {
  name        = "Infrastructure"
  description = "Infrastructure and platform engineering team"
}

# Create the application team
resource "pagerduty_team" "application" {
  name        = "Application"
  description = "Application development team"
}

# Reference existing users by email
data "pagerduty_user" "oncall_engineer" {
  email = "oncall@example.com"
}

# Assign users to teams
resource "pagerduty_team_membership" "infra_engineer" {
  user_id = data.pagerduty_user.oncall_engineer.id
  team_id = pagerduty_team.infrastructure.id
  role    = "responder"
}
```

## Creating Escalation Policies

Escalation policies define how incidents are routed and escalated.

```hcl
# escalation.tf
# Create an escalation policy for infrastructure incidents
resource "pagerduty_escalation_policy" "infrastructure" {
  name      = "Infrastructure Escalation"
  num_loops = 2

  # First level - notify the on-call engineer
  rule {
    escalation_delay_in_minutes = 10

    target {
      type = "user_reference"
      id   = data.pagerduty_user.oncall_engineer.id
    }
  }

  # Second level - notify the schedule
  rule {
    escalation_delay_in_minutes = 30

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.infrastructure_oncall.id
    }
  }

  # Associate with the infrastructure team
  teams = [pagerduty_team.infrastructure.id]
}

# Define an on-call schedule
resource "pagerduty_schedule" "infrastructure_oncall" {
  name      = "Infrastructure On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Primary"
    start                        = "2024-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2024-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 1 week

    users = [
      data.pagerduty_user.oncall_engineer.id,
    ]
  }
}
```

## Creating Services with Integrations

Services in PagerDuty represent applications or components that can generate incidents.

```hcl
# services.tf
# Create a service for your production infrastructure
resource "pagerduty_service" "production_infra" {
  name                    = "Production Infrastructure"
  description             = "Production cloud infrastructure managed by Terraform"
  auto_resolve_timeout    = 14400  # 4 hours
  acknowledgement_timeout = 600    # 10 minutes
  escalation_policy       = pagerduty_escalation_policy.infrastructure.id
  alert_creation          = "create_alerts_and_incidents"

  # Configure incident urgency rules
  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}

# Create an Events API v2 integration for the service
resource "pagerduty_service_integration" "terraform_events" {
  name    = "Terraform Events"
  type    = "events_api_v2_inbound_integration"
  service = pagerduty_service.production_infra.id
}

# Output the integration key for use in notifications
output "pagerduty_integration_key" {
  value     = pagerduty_service_integration.terraform_events.integration_key
  sensitive = true
}
```

## Triggering PagerDuty Alerts from Terraform

You can trigger PagerDuty alerts when Terraform operations fail or when specific conditions are met.

```hcl
# alert-trigger.tf
# Trigger a PagerDuty alert on infrastructure apply failure
resource "null_resource" "pagerduty_alert_on_failure" {
  # This provisioner runs when the resource is destroyed or on error
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Token token=${var.pagerduty_token}" \
        -d '{
          "routing_key": "${pagerduty_service_integration.terraform_events.integration_key}",
          "event_action": "trigger",
          "payload": {
            "summary": "Terraform infrastructure destruction detected",
            "severity": "critical",
            "source": "terraform",
            "component": "infrastructure",
            "group": "production",
            "custom_details": {
              "workspace": "${terraform.workspace}",
              "action": "destroy"
            }
          }
        }' \
        "https://events.pagerduty.com/v2/enqueue"
    EOT
  }
}
```

## Creating Event Rules and Rulesets

Event rules help you route, suppress, or transform incoming events.

```hcl
# event-rules.tf
# Create an event orchestration for intelligent routing
resource "pagerduty_event_orchestration" "terraform" {
  name = "Terraform Events"
  team = pagerduty_team.infrastructure.id
}

# Define routing rules for the orchestration
resource "pagerduty_event_orchestration_router" "terraform" {
  event_orchestration = pagerduty_event_orchestration.terraform.id

  set {
    id = "start"

    # Route critical events to production infrastructure service
    rule {
      label = "Route critical Terraform events"

      condition {
        expression = "event.severity matches 'critical'"
      }

      actions {
        route_to = pagerduty_service.production_infra.id
      }
    }
  }

  catch_all {
    actions {
      route_to = "unrouted"
    }
  }
}
```

## Using Terraform with PagerDuty Maintenance Windows

Schedule maintenance windows to suppress alerts during planned infrastructure changes.

```hcl
# maintenance.tf
# Create a maintenance window during Terraform applies
resource "pagerduty_maintenance_window" "terraform_apply" {
  description = "Terraform infrastructure update in progress"

  # Set the maintenance window duration
  start_time = timestamp()
  end_time   = timeadd(timestamp(), "1h")

  # Apply to the production infrastructure service
  services = [
    pagerduty_service.production_infra.id,
  ]
}
```

## CI/CD Pipeline Integration

Here is an example of triggering PagerDuty from a GitHub Actions pipeline running Terraform.

```yaml
# .github/workflows/terraform-pagerduty.yml
name: Terraform with PagerDuty Alerting

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        id: apply
        run: terraform apply -auto-approve
        continue-on-error: true

      # Trigger PagerDuty incident on failure
      - name: Alert PagerDuty on Failure
        if: steps.apply.outcome == 'failure'
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -d '{
              "routing_key": "${{ secrets.PAGERDUTY_INTEGRATION_KEY }}",
              "event_action": "trigger",
              "payload": {
                "summary": "Terraform apply failed in ${{ github.repository }}",
                "severity": "critical",
                "source": "github-actions",
                "custom_details": {
                  "repository": "${{ github.repository }}",
                  "run_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                }
              }
            }' \
            "https://events.pagerduty.com/v2/enqueue"

      # Resolve PagerDuty incident on success
      - name: Resolve PagerDuty on Success
        if: steps.apply.outcome == 'success'
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -d '{
              "routing_key": "${{ secrets.PAGERDUTY_INTEGRATION_KEY }}",
              "event_action": "resolve",
              "dedup_key": "terraform-${{ github.repository }}",
              "payload": {
                "summary": "Terraform apply succeeded",
                "severity": "info",
                "source": "github-actions"
              }
            }' \
            "https://events.pagerduty.com/v2/enqueue"
```

## Terraform Module for PagerDuty Service Setup

Create a reusable module to standardize PagerDuty service creation.

```hcl
# modules/pagerduty-service/main.tf
# Reusable module for creating PagerDuty services with standard configuration
variable "service_name" {
  description = "Name of the PagerDuty service"
  type        = string
}

variable "escalation_policy_id" {
  description = "ID of the escalation policy"
  type        = string
}

variable "team_id" {
  description = "ID of the team"
  type        = string
}

# Create the service with standard settings
resource "pagerduty_service" "this" {
  name                    = var.service_name
  escalation_policy       = var.escalation_policy_id
  auto_resolve_timeout    = 14400
  acknowledgement_timeout = 600
  alert_creation          = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}

# Create an Events API integration
resource "pagerduty_service_integration" "events_v2" {
  name    = "Events API v2"
  type    = "events_api_v2_inbound_integration"
  service = pagerduty_service.this.id
}

# Output the integration key
output "integration_key" {
  value     = pagerduty_service_integration.events_v2.integration_key
  sensitive = true
}

output "service_id" {
  value = pagerduty_service.this.id
}
```

## Best Practices

Always use the PagerDuty Events API v2 for programmatic alerting as it provides better deduplication and routing capabilities. Store API tokens and integration keys in a secrets manager rather than in plain text variables. Use deduplication keys to prevent duplicate incidents during retries. Create maintenance windows before planned infrastructure changes to avoid alert fatigue. Version control your entire PagerDuty configuration alongside your infrastructure code.

## Conclusion

Integrating Terraform with PagerDuty gives you a complete infrastructure-as-code approach to incident management. You can manage teams, services, escalation policies, and event rules alongside your cloud resources, and trigger alerts automatically when infrastructure changes fail. This combination ensures that your incident management setup is as reliable and reproducible as your infrastructure itself.
