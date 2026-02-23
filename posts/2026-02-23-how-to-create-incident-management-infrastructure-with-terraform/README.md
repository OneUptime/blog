# How to Create Incident Management Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Incident Management, DevOps, PagerDuty, Infrastructure as Code

Description: Learn how to build incident management infrastructure with Terraform including PagerDuty services, escalation policies, SNS alerting, and automated response workflows.

---

Incident management is the backbone of reliable operations. When something goes wrong in production, you need a well-defined process that routes alerts to the right people, escalates when necessary, and tracks the incident through resolution. Terraform lets you codify your entire incident management infrastructure, ensuring that escalation policies, notification channels, and response workflows are consistent and auditable.

In this guide, we will create incident management infrastructure using Terraform. We will configure PagerDuty services and escalation policies, set up AWS SNS notification channels, and build automated response workflows.

## Why Manage Incidents with Terraform

Incident management configurations are often set up manually through web UIs. This leads to inconsistencies between teams, undocumented escalation paths, and configurations that drift over time. By managing incident infrastructure with Terraform, every change is reviewed in a pull request, version-controlled, and can be rolled back if something goes wrong.

## Provider Configuration

We will use both the AWS and PagerDuty providers:

```hcl
# main.tf - Configure providers for incident management
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "pagerduty" {
  token = var.pagerduty_token
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "pagerduty_token" {
  type      = string
  sensitive = true
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Defining Teams and Users

Create PagerDuty teams that map to your organizational structure:

```hcl
# teams.tf - Define PagerDuty teams
variable "teams" {
  description = "Map of team names to their configuration"
  type = map(object({
    description = string
    members     = list(string)
  }))
  default = {
    "platform" = {
      description = "Platform engineering team"
      members     = ["user1@example.com", "user2@example.com"]
    }
    "backend" = {
      description = "Backend services team"
      members     = ["user3@example.com", "user4@example.com"]
    }
    "frontend" = {
      description = "Frontend application team"
      members     = ["user5@example.com", "user6@example.com"]
    }
  }
}

# Look up existing PagerDuty users by email
data "pagerduty_user" "team_members" {
  for_each = toset(flatten([for team in var.teams : team.members]))
  email    = each.value
}

# Create PagerDuty teams
resource "pagerduty_team" "teams" {
  for_each    = var.teams
  name        = "${each.key}-${var.environment}"
  description = each.value.description
}

# Add members to teams
resource "pagerduty_team_membership" "memberships" {
  for_each = {
    for pair in flatten([
      for team_name, team in var.teams : [
        for member in team.members : {
          key       = "${team_name}-${member}"
          team_id   = pagerduty_team.teams[team_name].id
          user_id   = data.pagerduty_user.team_members[member].id
        }
      ]
    ]) : pair.key => pair
  }

  team_id = each.value.team_id
  user_id = each.value.user_id
  role    = "responder"
}
```

## Creating Escalation Policies

Define escalation policies that determine how alerts are routed and escalated:

```hcl
# escalation.tf - Define escalation policies for each team
resource "pagerduty_escalation_policy" "team_escalation" {
  for_each  = var.teams
  name      = "${each.key}-escalation-${var.environment}"
  num_loops = 2  # Repeat escalation twice before giving up

  # Level 1: On-call engineer for the team
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.team_oncall[each.key].id
    }
  }

  # Level 2: Team lead
  rule {
    escalation_delay_in_minutes = 15

    target {
      type = "user_reference"
      id   = data.pagerduty_user.team_members[each.value.members[0]].id
    }
  }

  # Level 3: Management
  rule {
    escalation_delay_in_minutes = 30

    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.management_oncall.id
    }
  }

  teams = [pagerduty_team.teams[each.key].id]
}
```

## Setting Up On-Call Schedules

Create on-call schedules that rotate responsibility among team members:

```hcl
# schedules.tf - Define on-call schedules
resource "pagerduty_schedule" "team_oncall" {
  for_each  = var.teams
  name      = "${each.key}-oncall-${var.environment}"
  time_zone = "America/New_York"

  layer {
    name                         = "Primary On-Call"
    start                        = "2025-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2025-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # Weekly rotation

    users = [
      for member in each.value.members :
      data.pagerduty_user.team_members[member].id
    ]
  }

  teams = [pagerduty_team.teams[each.key].id]
}

# Management on-call schedule for final escalation
resource "pagerduty_schedule" "management_oncall" {
  name      = "management-oncall-${var.environment}"
  time_zone = "America/New_York"

  layer {
    name                         = "Management On-Call"
    start                        = "2025-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2025-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800

    users = [
      data.pagerduty_user.team_members[var.teams["platform"].members[0]].id
    ]
  }
}
```

## Creating PagerDuty Services

Define services that represent the components being monitored:

```hcl
# services.tf - Create PagerDuty services for each monitored component
variable "monitored_services" {
  description = "Services to monitor with their owning team"
  type = map(object({
    description = string
    team        = string
    urgency     = string
  }))
  default = {
    "api-gateway" = {
      description = "API Gateway service"
      team        = "platform"
      urgency     = "high"
    }
    "user-service" = {
      description = "User management microservice"
      team        = "backend"
      urgency     = "high"
    }
    "web-frontend" = {
      description = "Customer-facing web application"
      team        = "frontend"
      urgency     = "high"
    }
    "background-jobs" = {
      description = "Background job processing"
      team        = "backend"
      urgency     = "low"
    }
  }
}

resource "pagerduty_service" "services" {
  for_each = var.monitored_services

  name              = "${each.key}-${var.environment}"
  description       = each.value.description
  escalation_policy = pagerduty_escalation_policy.team_escalation[each.value.team].id

  # Auto-resolve after 4 hours if not acknowledged
  auto_resolve_timeout    = 14400
  # Alert creation timeout
  acknowledgement_timeout = 1800

  alert_creation = "create_alerts_and_incidents"

  incident_urgency_rule {
    type    = "constant"
    urgency = each.value.urgency
  }
}

# Create integration keys for each service
resource "pagerduty_service_integration" "cloudwatch" {
  for_each = var.monitored_services

  name    = "CloudWatch Integration"
  service = pagerduty_service.services[each.key].id
  vendor  = data.pagerduty_vendor.cloudwatch.id
}

data "pagerduty_vendor" "cloudwatch" {
  name = "Amazon CloudWatch"
}
```

## Setting Up AWS SNS Integration

Connect AWS CloudWatch alarms to PagerDuty through SNS:

```hcl
# sns.tf - Create SNS topics that bridge AWS and PagerDuty
resource "aws_sns_topic" "incident_alerts" {
  for_each = var.monitored_services

  name = "incident-${each.key}-${var.environment}"

  tags = {
    Environment = var.environment
    Service     = each.key
    ManagedBy   = "terraform"
  }
}

# HTTPS subscription to PagerDuty Events API
resource "aws_sns_topic_subscription" "pagerduty" {
  for_each = var.monitored_services

  topic_arn              = aws_sns_topic.incident_alerts[each.key].arn
  protocol               = "https"
  endpoint               = "https://events.pagerduty.com/integration/${pagerduty_service_integration.cloudwatch[each.key].integration_key}/enqueue"
  endpoint_auto_confirms = true
}
```

## Creating CloudWatch Alarms That Trigger Incidents

```hcl
# alarms.tf - CloudWatch alarms that trigger PagerDuty incidents
resource "aws_cloudwatch_metric_alarm" "service_health" {
  for_each = var.monitored_services

  alarm_name          = "${each.key}-health-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High error rate detected for ${each.key}"

  alarm_actions = [aws_sns_topic.incident_alerts[each.key].arn]
  ok_actions    = [aws_sns_topic.incident_alerts[each.key].arn]
}
```

## Building Response Automation with Lambda

Create automated response actions that run when incidents are triggered:

```hcl
# automation.tf - Lambda function for automated incident response
resource "aws_lambda_function" "incident_response" {
  function_name = "incident-response-${var.environment}"
  runtime       = "python3.11"
  handler       = "handler.lambda_handler"
  role          = aws_iam_role.incident_response.arn
  timeout       = 60

  filename         = data.archive_file.incident_response.output_path
  source_code_hash = data.archive_file.incident_response.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT   = var.environment
      SLACK_WEBHOOK = var.slack_webhook_url
    }
  }
}

variable "slack_webhook_url" {
  type      = string
  sensitive = true
  default   = ""
}

# Subscribe Lambda to the incident SNS topics
resource "aws_sns_topic_subscription" "lambda_response" {
  for_each = var.monitored_services

  topic_arn = aws_sns_topic.incident_alerts[each.key].arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.incident_response.arn
}

# Allow SNS to invoke the Lambda function
resource "aws_lambda_permission" "sns_invoke" {
  for_each = var.monitored_services

  statement_id  = "AllowSNS-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.incident_response.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.incident_alerts[each.key].arn
}
```

## Outputs

```hcl
# outputs.tf - Export incident management identifiers
output "pagerduty_service_ids" {
  description = "PagerDuty service IDs"
  value       = { for k, v in pagerduty_service.services : k => v.id }
}

output "sns_topic_arns" {
  description = "SNS topic ARNs for incident alerts"
  value       = { for k, v in aws_sns_topic.incident_alerts : k => v.arn }
}

output "escalation_policy_ids" {
  description = "Escalation policy IDs per team"
  value       = { for k, v in pagerduty_escalation_policy.team_escalation : k => v.id }
}
```

## Conclusion

Managing incident management infrastructure with Terraform brings the same rigor to your operational processes that you apply to your application code. Every escalation policy, schedule, and service integration is version-controlled and reviewable. When you need to onboard a new team or add a new service, the patterns established here make it straightforward. For a complete operational setup, combine this with [on-call schedule infrastructure](https://oneuptime.com/blog/post/2026-02-23-how-to-create-on-call-schedule-infrastructure-with-terraform/view) and [alerting pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-create-alerting-pipelines-with-terraform/view) to build a comprehensive incident response system.
