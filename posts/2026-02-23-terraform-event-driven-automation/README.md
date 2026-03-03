# How to Use Terraform with Event-Driven Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Event-Driven, Automation, DevOps, Infrastructure as Code, Lambda

Description: Learn how to build event-driven infrastructure automation with Terraform, using cloud events to trigger infrastructure changes and auto-remediation workflows.

---

Event-driven automation takes infrastructure management beyond scheduled runs and manual triggers. Instead of waiting for someone to run `terraform apply`, your infrastructure responds to events in real time. A security vulnerability is detected and Terraform automatically patches the affected resources. A traffic spike fires an alert and Terraform scales up the cluster. A cost threshold is breached and Terraform downsizes non-critical workloads.

In this guide, we will build event-driven automation patterns that use Terraform as the execution engine for infrastructure changes triggered by cloud events, monitoring alerts, and custom application signals.

## The Event-Driven Infrastructure Model

Traditional Terraform workflows are imperative: someone decides to make a change and runs the plan. Event-driven Terraform flips this model. Events from monitoring systems, cloud platforms, and applications trigger Terraform runs automatically, with the appropriate variables set based on the event context.

```text
Event Source (CloudWatch, Datadog, GitHub, etc.)
    |
    v
Event Router (EventBridge, SNS, SQS)
    |
    v
Event Processor (Lambda, Step Functions)
    |
    v
Terraform Cloud API (trigger run with variables)
    |
    v
Infrastructure Changes Applied
    |
    v
Notification Sent (Slack, PagerDuty)
```

## Setting Up EventBridge for Infrastructure Events

AWS EventBridge is an excellent event router for Terraform automation. You can capture events from AWS services, SaaS applications, and custom sources, then route them to trigger Terraform runs.

```hcl
# Create an EventBridge event bus for infrastructure events
resource "aws_cloudwatch_event_bus" "infrastructure" {
  name = "infrastructure-events"
}

# Rule: Trigger Terraform when a security finding is detected
resource "aws_cloudwatch_event_rule" "security_finding" {
  name           = "security-finding-remediation"
  description    = "Trigger auto-remediation when Security Hub findings are detected"
  event_bus_name = aws_cloudwatch_event_bus.infrastructure.name

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Severity = {
          Label = ["CRITICAL", "HIGH"]
        }
        Workflow = {
          Status = ["NEW"]
        }
      }
    }
  })
}

# Route the event to a Lambda function that triggers Terraform
resource "aws_cloudwatch_event_target" "remediation_lambda" {
  rule           = aws_cloudwatch_event_rule.security_finding.name
  event_bus_name = aws_cloudwatch_event_bus.infrastructure.name
  arn            = aws_lambda_function.terraform_trigger.arn
}

# Rule: Trigger Terraform when EC2 instances are terminated unexpectedly
resource "aws_cloudwatch_event_rule" "instance_terminated" {
  name        = "instance-terminated"
  description = "Detect when instances are terminated outside of Terraform"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Instance State-change Notification"]
    detail = {
      state = ["terminated"]
    }
  })
}

resource "aws_cloudwatch_event_target" "instance_recovery" {
  rule = aws_cloudwatch_event_rule.instance_terminated.name
  arn  = aws_lambda_function.terraform_trigger.arn

  input_transformer {
    input_paths = {
      instance_id = "$.detail.instance-id"
      state       = "$.detail.state"
    }
    input_template = <<-EOT
      {
        "action": "reconcile",
        "workspace": "production-compute",
        "message": "Instance <instance_id> was <state> outside of Terraform",
        "variables": {
          "reconcile_instance_id": "<instance_id>"
        }
      }
    EOT
  }
}
```

## Building the Event Processor

The Lambda function that processes events and triggers Terraform runs.

```python
# lambda/terraform_trigger.py
# Process infrastructure events and trigger Terraform Cloud runs

import json
import os
import urllib.request

TFC_TOKEN = os.environ["TFC_TOKEN"]
TFC_ORG = os.environ["TFC_ORGANIZATION"]
TFC_API = "https://app.terraform.io/api/v2"

# Map event types to workspaces and configurations
EVENT_CONFIG = {
    "security-remediation": {
        "workspace": "security-remediation",
        "auto_apply": True,
        "require_approval": False
    },
    "auto-scaler": {
        "workspace": "auto-scaler",
        "auto_apply": True,
        "require_approval": False
    },
    "reconcile": {
        "workspace": None,  # Determined by event payload
        "auto_apply": False,
        "require_approval": True
    }
}

def handler(event, context):
    """Process an infrastructure event and trigger Terraform."""
    print(f"Received event: {json.dumps(event)}")

    # Determine the action and workspace
    action = event.get("action", "unknown")
    workspace_name = event.get("workspace")
    message = event.get("message", f"Triggered by event: {action}")
    variables = event.get("variables", {})

    config = EVENT_CONFIG.get(action, {})
    if not workspace_name:
        workspace_name = config.get("workspace")

    if not workspace_name:
        return {"statusCode": 400, "body": "No workspace determined for event"}

    # Get workspace ID
    workspace_id = get_workspace_id(workspace_name)

    # Set workspace variables from the event
    for key, value in variables.items():
        set_workspace_variable(workspace_id, key, value)

    # Trigger the run
    auto_apply = config.get("auto_apply", False)
    run_id = create_run(workspace_id, message, auto_apply)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "run_id": run_id,
            "workspace": workspace_name,
            "auto_apply": auto_apply
        })
    }

def get_workspace_id(name):
    """Look up workspace ID by name."""
    url = f"{TFC_API}/organizations/{TFC_ORG}/workspaces/{name}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {TFC_TOKEN}",
        "Content-Type": "application/vnd.api+json"
    })
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["data"]["id"]

def set_workspace_variable(workspace_id, key, value):
    """Create or update a workspace variable."""
    data = {
        "data": {
            "type": "vars",
            "attributes": {
                "key": key,
                "value": str(value),
                "category": "terraform",
                "hcl": False,
                "sensitive": False
            },
            "relationships": {
                "workspace": {
                    "data": {"type": "workspaces", "id": workspace_id}
                }
            }
        }
    }
    url = f"{TFC_API}/workspaces/{workspace_id}/vars"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {TFC_TOKEN}",
            "Content-Type": "application/vnd.api+json"
        }
    )
    urllib.request.urlopen(req)

def create_run(workspace_id, message, auto_apply):
    """Create a new Terraform run."""
    data = {
        "data": {
            "attributes": {
                "message": message,
                "auto-apply": auto_apply
            },
            "relationships": {
                "workspace": {
                    "data": {"type": "workspaces", "id": workspace_id}
                }
            },
            "type": "runs"
        }
    }
    url = f"{TFC_API}/runs"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {TFC_TOKEN}",
            "Content-Type": "application/vnd.api+json"
        }
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["data"]["id"]
```

## Auto-Scaling with Event-Driven Terraform

Use monitoring alerts to trigger Terraform-based scaling operations.

```hcl
# auto-scaler/main.tf
# This workspace is triggered by scaling events

variable "desired_capacity" {
  description = "Desired number of instances, set by event trigger"
  type        = number
  default     = 3
}

variable "scaling_reason" {
  description = "Reason for the scaling event"
  type        = string
  default     = "manual"
}

resource "aws_autoscaling_group" "app" {
  name                = "app-cluster"
  min_size            = 2
  max_size            = 20
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "ScalingReason"
    value               = var.scaling_reason
    propagate_at_launch = true
  }

  tag {
    key                 = "LastScaledBy"
    value               = "terraform-event-automation"
    propagate_at_launch = true
  }
}

# CloudWatch alarm that triggers scaling via EventBridge
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "app-cluster-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization exceeds 80% for 3 minutes"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  alarm_actions = [aws_sns_topic.scaling_events.arn]
}

resource "aws_sns_topic" "scaling_events" {
  name = "scaling-events"
}
```

## Step Functions for Complex Event Workflows

For multi-step event-driven workflows, AWS Step Functions can orchestrate the entire process.

```hcl
# Step Function that handles complex event-driven automation
resource "aws_sfn_state_machine" "infrastructure_automation" {
  name     = "infrastructure-automation"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Event-driven infrastructure automation workflow"
    StartAt = "AnalyzeEvent"
    States = {
      AnalyzeEvent = {
        Type     = "Task"
        Resource = aws_lambda_function.analyze_event.arn
        Next     = "DecideAction"
      }
      DecideAction = {
        Type = "Choice"
        Choices = [
          {
            Variable     = "$.action"
            StringEquals = "scale_up"
            Next         = "ScaleUp"
          },
          {
            Variable     = "$.action"
            StringEquals = "remediate"
            Next         = "Remediate"
          },
          {
            Variable     = "$.action"
            StringEquals = "notify"
            Next         = "NotifyOnly"
          }
        ]
        Default = "NotifyOnly"
      }
      ScaleUp = {
        Type     = "Task"
        Resource = aws_lambda_function.terraform_trigger.arn
        Next     = "WaitForApply"
      }
      WaitForApply = {
        Type    = "Wait"
        Seconds = 120
        Next    = "VerifyChanges"
      }
      VerifyChanges = {
        Type     = "Task"
        Resource = aws_lambda_function.verify_changes.arn
        Next     = "NotifyResult"
      }
      Remediate = {
        Type     = "Task"
        Resource = aws_lambda_function.terraform_trigger.arn
        Next     = "WaitForApply"
      }
      NotifyOnly = {
        Type     = "Task"
        Resource = aws_lambda_function.send_notification.arn
        End      = true
      }
      NotifyResult = {
        Type     = "Task"
        Resource = aws_lambda_function.send_notification.arn
        End      = true
      }
    }
  })
}
```

## Guardrails for Event-Driven Automation

Automated infrastructure changes need safety guardrails to prevent runaway automation.

```hcl
# Rate limiting for event-driven Terraform runs
resource "aws_dynamodb_table" "automation_rate_limit" {
  name         = "terraform-automation-rate-limit"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "workspace"
  range_key    = "timestamp"

  attribute {
    name = "workspace"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  ttl {
    attribute_name = "expiry"
    enabled        = true
  }
}
```

## Best Practices

Implement rate limiting. Prevent a flood of events from triggering dozens of simultaneous Terraform runs. Use DynamoDB or Redis to track recent triggers and enforce cooldown periods.

Always require approval for destructive changes. Even in event-driven workflows, Terraform plans that destroy resources should require human approval before applying.

Use dead letter queues. If an event fails to trigger a Terraform run, it should land in a DLQ for later investigation rather than being silently dropped.

Test with non-production events first. Route non-critical events to a staging workspace to validate your automation before connecting it to production.

For more on Terraform automation patterns, see our guide on [Terraform Pipeline with GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view).

## Conclusion

Event-driven automation transforms Terraform from a manually triggered tool into a responsive system that adapts to changing conditions in real time. By connecting cloud events, monitoring alerts, and application signals to Terraform runs, you create infrastructure that heals itself, scales automatically, and responds to security threats without human intervention. Start with simple event-to-run mappings and evolve toward complex workflows with Step Functions as your automation needs grow.
