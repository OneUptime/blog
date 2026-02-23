# How to Use Dynamic Blocks for Notification Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, SNS, Notifications, Infrastructure as Code

Description: Learn how to configure notification channels and alerting rules dynamically in Terraform using dynamic blocks for SNS, SES, EventBridge, and S3 notifications.

---

Notification configurations in AWS span multiple services - SNS topics and subscriptions, S3 event notifications, CloudWatch alarm actions, EventBridge rules, and SES notification settings. When managed across environments with different notification requirements, dynamic blocks keep things organized.

## SNS Topic Subscriptions

The most basic notification pattern is an SNS topic with multiple subscriptions:

```hcl
variable "sns_subscriptions" {
  description = "Subscriptions for the notification topic"
  type = list(object({
    protocol = string  # "email", "sms", "lambda", "https", "sqs"
    endpoint = string
    filter_policy = optional(string)  # JSON filter policy
  }))
  default = [
    {
      protocol = "email"
      endpoint = "ops-team@example.com"
    },
    {
      protocol = "email"
      endpoint = "dev-team@example.com"
      filter_policy = jsonencode({
        severity = ["critical"]
      })
    },
    {
      protocol = "https"
      endpoint = "https://hooks.slack.com/services/xxx/yyy/zzz"
    }
  ]
}

resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-alerts"

  tags = {
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "alerts" {
  for_each = { for idx, sub in var.sns_subscriptions : "${sub.protocol}-${idx}" => sub }

  topic_arn     = aws_sns_topic.alerts.arn
  protocol      = each.value.protocol
  endpoint      = each.value.endpoint
  filter_policy = each.value.filter_policy
}
```

## S3 Event Notifications

S3 buckets can send notifications to SNS, SQS, or Lambda when objects are created, deleted, or restored. Dynamic blocks handle the different notification targets:

```hcl
variable "s3_notifications" {
  description = "S3 bucket notification configuration"
  type = object({
    lambda_functions = optional(list(object({
      lambda_function_arn = string
      events             = list(string)
      filter_prefix      = optional(string)
      filter_suffix      = optional(string)
    })), [])

    queues = optional(list(object({
      queue_arn     = string
      events        = list(string)
      filter_prefix = optional(string)
      filter_suffix = optional(string)
    })), [])

    topics = optional(list(object({
      topic_arn     = string
      events        = list(string)
      filter_prefix = optional(string)
      filter_suffix = optional(string)
    })), [])
  })
  default = {
    lambda_functions = []
    queues           = []
    topics           = []
  }
}

resource "aws_s3_bucket_notification" "main" {
  bucket = aws_s3_bucket.main.id

  # Lambda function notifications
  dynamic "lambda_function" {
    for_each = var.s3_notifications.lambda_functions
    content {
      lambda_function_arn = lambda_function.value.lambda_function_arn
      events              = lambda_function.value.events
      filter_prefix       = lambda_function.value.filter_prefix
      filter_suffix       = lambda_function.value.filter_suffix
    }
  }

  # SQS queue notifications
  dynamic "queue" {
    for_each = var.s3_notifications.queues
    content {
      queue_arn     = queue.value.queue_arn
      events        = queue.value.events
      filter_prefix = queue.value.filter_prefix
      filter_suffix = queue.value.filter_suffix
    }
  }

  # SNS topic notifications
  dynamic "topic" {
    for_each = var.s3_notifications.topics
    content {
      topic_arn     = topic.value.topic_arn
      events        = topic.value.events
      filter_prefix = topic.value.filter_prefix
      filter_suffix = topic.value.filter_suffix
    }
  }
}
```

## Example S3 Notification Configuration

```hcl
s3_notifications = {
  lambda_functions = [
    {
      lambda_function_arn = "arn:aws:lambda:us-east-1:123456789:function:process-uploads"
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "uploads/"
      filter_suffix       = ".csv"
    },
    {
      lambda_function_arn = "arn:aws:lambda:us-east-1:123456789:function:process-images"
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "images/"
    }
  ]
  queues = [
    {
      queue_arn     = "arn:aws:sqs:us-east-1:123456789:audit-queue"
      events        = ["s3:ObjectRemoved:*"]
      filter_prefix = ""
    }
  ]
  topics = [
    {
      topic_arn = "arn:aws:sns:us-east-1:123456789:backup-notifications"
      events    = ["s3:ObjectCreated:*"]
      filter_prefix = "backups/"
    }
  ]
}
```

## EventBridge Rules with Dynamic Targets

EventBridge rules can route events to multiple targets. Dynamic blocks handle the target configuration:

```hcl
variable "eventbridge_rules" {
  description = "EventBridge rules and their targets"
  type = map(object({
    description    = string
    event_pattern  = string  # JSON event pattern
    schedule       = optional(string)
    enabled        = optional(bool, true)
    targets = list(object({
      arn       = string
      role_arn  = optional(string)
      input     = optional(string)
      input_path = optional(string)
    }))
  }))
}

resource "aws_cloudwatch_event_rule" "rules" {
  for_each = var.eventbridge_rules

  name           = each.key
  description    = each.value.description
  event_pattern  = each.value.event_pattern != null ? each.value.event_pattern : null
  schedule_expression = each.value.schedule
  is_enabled     = each.value.enabled
}

# Flatten targets for each rule
locals {
  event_targets = flatten([
    for rule_key, rule in var.eventbridge_rules : [
      for idx, target in rule.targets : {
        key       = "${rule_key}-target-${idx}"
        rule_name = rule_key
        target_id = "${rule_key}-${idx}"
        arn       = target.arn
        role_arn  = target.role_arn
        input     = target.input
        input_path = target.input_path
      }
    ]
  ])
}

resource "aws_cloudwatch_event_target" "targets" {
  for_each = { for t in local.event_targets : t.key => t }

  rule      = aws_cloudwatch_event_rule.rules[each.value.rule_name].name
  target_id = each.value.target_id
  arn       = each.value.arn
  role_arn  = each.value.role_arn
  input     = each.value.input
  input_path = each.value.input_path
}
```

## CloudWatch Alarm Actions

CloudWatch alarms can notify different endpoints based on the alarm state:

```hcl
variable "alarm_notifications" {
  description = "Notification configuration per alarm severity"
  type = map(object({
    alarm_actions             = list(string)
    ok_actions                = optional(list(string), [])
    insufficient_data_actions = optional(list(string), [])
  }))
  default = {
    critical = {
      alarm_actions = [
        "arn:aws:sns:us-east-1:123456789:pagerduty-critical",
        "arn:aws:sns:us-east-1:123456789:ops-team"
      ]
      ok_actions = [
        "arn:aws:sns:us-east-1:123456789:ops-team"
      ]
    }
    warning = {
      alarm_actions = [
        "arn:aws:sns:us-east-1:123456789:ops-team"
      ]
      ok_actions = [
        "arn:aws:sns:us-east-1:123456789:ops-team"
      ]
    }
    info = {
      alarm_actions = [
        "arn:aws:sns:us-east-1:123456789:dev-team"
      ]
    }
  }
}

variable "metric_alarms" {
  type = map(object({
    severity            = string
    description         = string
    metric_name         = string
    namespace           = string
    comparison_operator = string
    threshold           = number
    evaluation_periods  = number
    period              = number
    statistic           = string
    dimensions          = map(string)
  }))
}

resource "aws_cloudwatch_metric_alarm" "main" {
  for_each = var.metric_alarms

  alarm_name          = each.key
  alarm_description   = each.value.description
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  comparison_operator = each.value.comparison_operator
  threshold           = each.value.threshold
  evaluation_periods  = each.value.evaluation_periods
  period              = each.value.period
  statistic           = each.value.statistic
  dimensions          = each.value.dimensions

  # Look up notification endpoints based on severity
  alarm_actions             = lookup(var.alarm_notifications, each.value.severity, { alarm_actions = [] }).alarm_actions
  ok_actions                = lookup(var.alarm_notifications, each.value.severity, { ok_actions = [] }).ok_actions
  insufficient_data_actions = lookup(var.alarm_notifications, each.value.severity, { insufficient_data_actions = [] }).insufficient_data_actions
}
```

## SES Notification Configuration

SES email identities can have notifications for bounces, complaints, and deliveries:

```hcl
variable "ses_identities" {
  description = "SES email identities with notification configuration"
  type = map(object({
    email_address = string
    notifications = optional(map(object({
      topic_arn         = string
      include_headers   = optional(bool, false)
    })), {})
  }))
}

resource "aws_ses_email_identity" "main" {
  for_each = var.ses_identities
  email    = each.value.email_address
}

# Flatten notification configurations
locals {
  ses_notifications = flatten([
    for identity_key, identity in var.ses_identities : [
      for notif_type, notif in identity.notifications : {
        key            = "${identity_key}-${notif_type}"
        identity       = identity.email_address
        notification_type = notif_type  # "Bounce", "Complaint", "Delivery"
        topic_arn      = notif.topic_arn
        include_headers = notif.include_headers
      }
    ]
  ])
}

resource "aws_ses_identity_notification_topic" "main" {
  for_each = { for n in local.ses_notifications : n.key => n }

  identity          = aws_ses_email_identity.main[split("-", each.key)[0]].email
  notification_type = each.value.notification_type
  topic_arn         = each.value.topic_arn
  include_original_headers = each.value.include_headers
}
```

## Multi-Channel Notification Module

Here is a module pattern that sets up a complete notification pipeline:

```hcl
variable "notification_channels" {
  description = "Notification channels to configure"
  type = map(object({
    type     = string  # "email", "slack", "pagerduty", "opsgenie"
    endpoint = string
    severities = list(string)  # Which severities this channel receives
  }))
  default = {
    "ops-email" = {
      type       = "email"
      endpoint   = "ops@example.com"
      severities = ["critical", "warning"]
    }
    "slack-alerts" = {
      type       = "slack"
      endpoint   = "https://hooks.slack.com/services/xxx"
      severities = ["critical", "warning", "info"]
    }
    "pagerduty" = {
      type       = "pagerduty"
      endpoint   = "https://events.pagerduty.com/integration/xxx"
      severities = ["critical"]
    }
  }
}

locals {
  # Group channels by severity for easy lookup
  channels_by_severity = {
    for severity in ["critical", "warning", "info"] : severity => [
      for key, channel in var.notification_channels : aws_sns_topic_subscription.channels[key].arn
      if contains(channel.severities, severity)
    ]
  }

  # Map channel types to SNS protocols
  protocol_map = {
    email     = "email"
    slack     = "https"
    pagerduty = "https"
    opsgenie  = "https"
  }
}

resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "channels" {
  for_each = var.notification_channels

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = local.protocol_map[each.value.type]
  endpoint  = each.value.endpoint

  # Filter by severity
  filter_policy = jsonencode({
    severity = each.value.severities
  })
}
```

## Testing Notification Configuration

Add outputs to verify your notification setup:

```hcl
output "notification_summary" {
  description = "Summary of notification configuration"
  value = {
    topic_arn = aws_sns_topic.alerts.arn
    subscriptions = {
      for key, sub in aws_sns_topic_subscription.channels : key => {
        protocol = sub.protocol
        endpoint = sub.endpoint
      }
    }
    channels_by_severity = {
      for sev, channels in local.channels_by_severity : sev => length(channels)
    }
  }
}
```

## Summary

Notification configuration in Terraform spans many AWS services but follows the same dynamic patterns: define channels as structured data, use `for_each` to create subscriptions and targets, and use locals to group and route notifications by severity or type. The key advantage is that adding a new notification channel or changing routing rules is a data change, not a code change. For related monitoring setup, see [how to use dynamic blocks for CloudWatch metric alarms](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-cloudwatch-metric-alarms/view).
