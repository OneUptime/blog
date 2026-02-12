# How to Set Up AWS Budgets for Cost Alerts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Budgets, Cost Management, Alerts

Description: A practical guide to setting up AWS Budgets with cost alerts to get notified before your cloud spending gets out of control.

---

Finding out you overspent after the month ends is the worst way to manage cloud costs. AWS Budgets lets you set spending limits and get notified when you're approaching or exceeding them. You can set budgets for overall costs, specific services, linked accounts, or tag-based groupings. And the alerts actually arrive in time to do something about it.

Let's set up budgets that catch problems early.

## Creating a Simple Cost Budget

The most basic budget tracks your total monthly AWS spending against a target amount.

This CLI command creates a monthly budget of $10,000 with alerts at 80% and 100%.

```bash
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "monthly-total",
    "BudgetType": "COST",
    "BudgetLimit": {
      "Amount": "10000",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "CostTypes": {
      "IncludeTax": true,
      "IncludeSubscription": true,
      "UseBlended": false,
      "IncludeRefund": false,
      "IncludeCredit": false,
      "IncludeUpfront": true,
      "IncludeRecurring": true,
      "IncludeOtherSubscription": true,
      "IncludeSupport": true,
      "IncludeDiscount": true,
      "UseAmortized": false
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "finance@example.com"
        },
        {
          "SubscriptionType": "SNS",
          "Address": "arn:aws:sns:us-east-1:123456789:budget-alerts"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "finance@example.com"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "finance@example.com"
        }
      ]
    }
  ]'
```

Notice the three notifications:

1. **80% actual**: Heads up, you're approaching your budget.
2. **100% actual**: You've hit your budget.
3. **100% forecasted**: Based on current spending patterns, you're projected to exceed your budget. This one is especially valuable because it gives you advance warning.

## Service-Specific Budgets

Set separate budgets for services that tend to spike unexpectedly.

This Terraform configuration creates budgets for your most expensive services.

```hcl
resource "aws_budgets_budget" "ec2" {
  name         = "ec2-monthly"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team@example.com"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = ["team@example.com"]
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }
}

resource "aws_budgets_budget" "rds" {
  name         = "rds-monthly"
  budget_type  = "COST"
  limit_amount = "3000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team@example.com"]
  }
}

resource "aws_budgets_budget" "data_transfer" {
  name         = "data-transfer-monthly"
  budget_type  = "COST"
  limit_amount = "1000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["AWS Data Transfer"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 50
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team@example.com"]
  }
}
```

## Tag-Based Budgets

If you tag your resources by team or project, you can create budgets per team. This makes cost accountability clear.

```hcl
resource "aws_budgets_budget" "team_platform" {
  name         = "team-platform-monthly"
  budget_type  = "COST"
  limit_amount = "8000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$platform"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["platform-team@example.com"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = ["platform-team@example.com", "finance@example.com"]
  }
}
```

The tag filter format is `user:TagKey$TagValue`. The `user:` prefix indicates it's a user-defined tag (as opposed to AWS-generated tags).

## Budget Per Linked Account

For organizations with multiple AWS accounts, set per-account budgets.

```hcl
resource "aws_budgets_budget" "dev_account" {
  name         = "dev-account-monthly"
  budget_type  = "COST"
  limit_amount = "2000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "LinkedAccount"
    values = ["111111111111"]  # Dev account ID
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 90
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["dev-team@example.com"]
  }
}
```

## Usage Budgets

Cost budgets track dollars, but sometimes you want to track usage. For example, you might want to know if EC2 running hours exceed a certain level.

```hcl
resource "aws_budgets_budget" "ec2_hours" {
  name         = "ec2-hours-monthly"
  budget_type  = "USAGE"
  limit_amount = "10000"  # hours
  limit_unit   = "Hrs"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  cost_filter {
    name   = "UsageType"
    values = ["BoxUsage"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["ops@example.com"]
  }
}
```

## Routing Alerts to Slack

Email alerts are easy to set up but easy to ignore. Route them to Slack through SNS and a Lambda function.

This Lambda function formats budget alerts and posts them to a Slack webhook.

```python
import json
import urllib.request

SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

def handler(event, context):
    """Forward budget alerts to Slack."""
    for record in event["Records"]:
        message = record["Sns"]["Message"]

        # Parse the budget alert
        slack_message = {
            "channel": "#aws-costs",
            "username": "AWS Budget Alert",
            "icon_emoji": ":money_with_wings:",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*AWS Budget Alert*\n{message}"
                    }
                }
            ]
        }

        req = urllib.request.Request(
            SLACK_WEBHOOK_URL,
            data=json.dumps(slack_message).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)

    return {"statusCode": 200}
```

Subscribe this Lambda to your budget alert SNS topic.

## Listing and Managing Budgets

Check on your existing budgets with the CLI.

```bash
# List all budgets
aws budgets describe-budgets \
  --account-id 123456789012 \
  --query 'Budgets[*].{Name:BudgetName,Limit:BudgetLimit.Amount,Actual:CalculatedSpend.ActualSpend.Amount,Forecast:CalculatedSpend.ForecastedSpend.Amount}'

# Get details on a specific budget
aws budgets describe-budget \
  --account-id 123456789012 \
  --budget-name "monthly-total"
```

## Budget Strategy Recommendations

Here's a practical approach to setting up your budget hierarchy:

1. **One overall budget**: Tracks total account/organization spending.
2. **Per-service budgets**: For your top 3-5 most expensive services.
3. **Per-team budgets**: If you have cost allocation tags.
4. **Per-environment budgets**: Especially useful for catching dev/staging waste.

Set thresholds at multiple levels:
- 50% actual: Early awareness
- 80% actual: Warning - investigate trends
- 100% forecasted: Take action now
- 100% actual: Budget exceeded

For taking automated action when budgets are exceeded, check out our post on [creating AWS Budget Actions for automatic cost control](https://oneuptime.com/blog/post/create-aws-budget-actions-automatic-cost-control/view).

## Wrapping Up

AWS Budgets is your proactive defense against bill shock. Set up layered budgets - overall, per-service, and per-team - with alerts at multiple thresholds. Use forecasted alerts to catch trends before they become problems. Route notifications to channels your team actually monitors, like Slack, not just email. And remember, budgets are just alerts - they don't stop spending automatically. For that, you need Budget Actions, which is a separate (and powerful) capability.
