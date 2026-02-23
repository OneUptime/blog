# How to Create PagerDuty Services with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, PagerDuty, Incident Management, Monitoring, Infrastructure as Code

Description: Learn how to create PagerDuty services using Terraform to manage incident routing, integrations, and service dependencies as code.

---

PagerDuty services represent the applications, components, or microservices that your team is responsible for. Each service has its own integrations, escalation policies, and notification rules. Managing PagerDuty services through Terraform ensures your incident management configuration is version-controlled and consistently deployed. This guide covers creating services, integrations, and event rules.

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

variable "pagerduty_token" {
  type      = string
  sensitive = true
}
```

## Creating a Basic Service

```hcl
# Reference an existing escalation policy
data "pagerduty_escalation_policy" "default" {
  name = "Default Escalation Policy"
}

# Create a PagerDuty service for the API
resource "pagerduty_service" "api" {
  name                    = "API Service"
  description             = "Main API service handling all customer requests"
  escalation_policy       = data.pagerduty_escalation_policy.default.id
  auto_resolve_timeout    = 14400  # 4 hours
  acknowledgement_timeout = 1800   # 30 minutes
  alert_creation          = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}

# Create a service for the web frontend
resource "pagerduty_service" "web" {
  name                    = "Web Frontend"
  description             = "Customer-facing web application"
  escalation_policy       = data.pagerduty_escalation_policy.default.id
  auto_resolve_timeout    = 14400
  acknowledgement_timeout = 1800
  alert_creation          = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}
```

## Service with Time-Based Urgency

```hcl
# Service with different urgency during business hours vs off-hours
resource "pagerduty_service" "internal_tool" {
  name              = "Internal Tools"
  description       = "Internal tooling and automation"
  escalation_policy = data.pagerduty_escalation_policy.default.id

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
    days_of_week = [1, 2, 3, 4, 5]
  }
}
```

## Service Integrations

```hcl
# CloudWatch integration for the API service
resource "pagerduty_service_integration" "cloudwatch" {
  name    = "AWS CloudWatch"
  service = pagerduty_service.api.id
  vendor  = data.pagerduty_vendor.cloudwatch.id
}

data "pagerduty_vendor" "cloudwatch" {
  name = "Amazon CloudWatch"
}

# Datadog integration
resource "pagerduty_service_integration" "datadog" {
  name    = "Datadog"
  service = pagerduty_service.api.id
  vendor  = data.pagerduty_vendor.datadog.id
}

data "pagerduty_vendor" "datadog" {
  name = "Datadog"
}

# Generic webhook integration (Events API v2)
resource "pagerduty_service_integration" "events_api" {
  name    = "Events API v2"
  service = pagerduty_service.api.id
  type    = "events_api_v2_inbound_integration"
}

# Output the integration keys for configuring external tools
output "api_cloudwatch_integration_key" {
  value     = pagerduty_service_integration.cloudwatch.integration_key
  sensitive = true
}

output "api_events_api_key" {
  value     = pagerduty_service_integration.events_api.integration_key
  sensitive = true
}
```

## Service Event Rules

```hcl
# Create event rules to control alert behavior
resource "pagerduty_service_event_rule" "suppress_info" {
  service  = pagerduty_service.api.id
  position = 0

  conditions {
    operator = "and"
    subconditions {
      operator = "contains"
      parameter {
        value = "INFO"
        path  = "summary"
      }
    }
  }

  actions {
    suppress {
      value = true
    }
  }
}

# Route critical alerts with high urgency
resource "pagerduty_service_event_rule" "critical_urgency" {
  service  = pagerduty_service.api.id
  position = 1

  conditions {
    operator = "and"
    subconditions {
      operator = "contains"
      parameter {
        value = "CRITICAL"
        path  = "severity"
      }
    }
  }

  actions {
    severity {
      value = "critical"
    }
    priority {
      value = data.pagerduty_priority.p1.id
    }
  }
}

data "pagerduty_priority" "p1" {
  name = "P1"
}
```

## Service Dependencies

```hcl
# Define service dependencies for impact analysis
resource "pagerduty_service_dependency" "api_depends_on_db" {
  dependency {
    dependent_service {
      id   = pagerduty_service.api.id
      type = "service"
    }
    supporting_service {
      id   = pagerduty_service.database.id
      type = "service"
    }
  }
}

resource "pagerduty_service" "database" {
  name              = "Database Service"
  description       = "Primary PostgreSQL database"
  escalation_policy = data.pagerduty_escalation_policy.default.id

  incident_urgency_rule {
    type    = "constant"
    urgency = "high"
  }
}
```

## Multiple Services at Scale

```hcl
variable "services" {
  type = map(object({
    description = string
    urgency     = string
    team        = string
  }))
  default = {
    "api-gateway"      = { description = "API Gateway service", urgency = "high", team = "platform" }
    "user-service"     = { description = "User management microservice", urgency = "high", team = "identity" }
    "payment-service"  = { description = "Payment processing", urgency = "high", team = "payments" }
    "notification-svc" = { description = "Notification delivery", urgency = "low", team = "comms" }
    "analytics-svc"    = { description = "Analytics pipeline", urgency = "low", team = "data" }
  }
}

resource "pagerduty_service" "microservices" {
  for_each = var.services

  name              = each.key
  description       = each.value.description
  escalation_policy = data.pagerduty_escalation_policy.default.id

  incident_urgency_rule {
    type    = "constant"
    urgency = each.value.urgency
  }

  auto_resolve_timeout    = 14400
  acknowledgement_timeout = 1800
}
```

## Best Practices

Set auto-resolve timeouts to prevent stale incidents from lingering. Use acknowledgement timeouts to ensure incidents are not ignored. Configure event rules to suppress noisy alerts and route critical ones correctly. Define service dependencies so PagerDuty can show the blast radius of incidents. Use consistent naming conventions across services. Separate services by team ownership so escalation policies route correctly.

For creating the escalation policies referenced by services, see our guide on [PagerDuty escalation policies](https://oneuptime.com/blog/post/2026-02-23-how-to-create-pagerduty-escalation-policies-with-terraform/view).

## Conclusion

PagerDuty services managed through Terraform provide a version-controlled, auditable approach to incident management configuration. By defining services, integrations, event rules, and dependencies as code, you ensure that your incident management setup grows consistently with your architecture. The for_each pattern makes it easy to manage services for large microservice deployments.
