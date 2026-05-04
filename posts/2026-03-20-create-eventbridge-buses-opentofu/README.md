# How to Create AWS EventBridge Event Buses with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EventBridge, Event Bus, Infrastructure as Code

Description: Learn how to create custom AWS EventBridge event buses with OpenTofu for cross-account event routing, application decoupling, and event-driven architectures.

Custom EventBridge event buses allow you to decouple services by routing events through a central bus. They support cross-account publishing, fine-grained access policies, and schema discovery. Managing them in OpenTofu keeps your event architecture documented.

## Creating a Custom Event Bus

```hcl
resource "aws_cloudwatch_event_bus" "application" {
  name = "myapp-events"

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

## Event Bus Policy (Cross-Account Publishing)

```hcl
# Allow another AWS account to publish events to this bus

resource "aws_cloudwatch_event_bus_policy" "cross_account" {
  event_bus_name = aws_cloudwatch_event_bus.application.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountPublish"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.source_account_id}:root"
        }
        Action   = "events:PutEvents"
        Resource = aws_cloudwatch_event_bus.application.arn
      }
    ]
  })
}
```

## Archive for Replay

```hcl
# Archive all events for 30 days to enable replay
resource "aws_cloudwatch_event_archive" "application" {
  name             = "myapp-events-archive"
  event_source_arn = aws_cloudwatch_event_bus.application.arn
  description      = "Archive for event replay during incident recovery"
  retention_days   = 30

  # Omitting event_pattern archives all events sent to the bus.
}
```

## Schema Discovery

```hcl
resource "aws_schemas_discoverer" "application" {
  source_arn  = aws_cloudwatch_event_bus.application.arn
  description = "Auto-discover schemas from myapp events"
}
```

## Cross-Account Event Routing

```hcl
# Source account: publish to central event bus
resource "aws_cloudwatch_event_rule" "forward_to_central" {
  name           = "forward-to-central-bus"
  description    = "Forward application events to central event bus"
  event_bus_name = "default"

  event_pattern = jsonencode({
    source = ["myapp.orders", "myapp.users", "myapp.payments"]
  })
}

resource "aws_cloudwatch_event_target" "central_bus" {
  rule      = aws_cloudwatch_event_rule.forward_to_central.name
  target_id = "central-event-bus"
  arn       = "arn:aws:events:us-east-1:${var.central_account_id}:event-bus/central-events"
  role_arn  = aws_iam_role.eventbridge_cross_account.arn
}

resource "aws_iam_role" "eventbridge_cross_account" {
  name = "eventbridge-cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "eventbridge_cross_account" {
  role = aws_iam_role.eventbridge_cross_account.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "events:PutEvents"
      Resource = "arn:aws:events:us-east-1:${var.central_account_id}:event-bus/central-events"
    }]
  })
}
```

## Multiple Domain Event Buses

```hcl
locals {
  event_buses = ["orders", "inventory", "payments", "notifications"]
}

resource "aws_cloudwatch_event_bus" "domain_buses" {
  for_each = toset(local.event_buses)
  name     = "myapp-${each.key}"

  tags = {
    Domain      = each.key
    ManagedBy   = "opentofu"
  }
}

# Output bus ARNs for application configuration
output "event_bus_arns" {
  value = {
    for k, v in aws_cloudwatch_event_bus.domain_buses : k => v.arn
  }
}
```

## Conclusion

Custom EventBridge event buses in OpenTofu enable clean event-driven architectures. Create separate buses per domain, configure cross-account policies for multi-account setups, and enable archiving for event replay capability. Use schema discovery to automatically document your event contracts as they evolve.
