# How to Create AWS Budgets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Budget, Cost Management, Infrastructure as Code

Description: Learn how to create AWS Budgets with OpenTofu to monitor spending, receive alerts when costs exceed thresholds, and enforce budget limits with automatic actions.

AWS Budgets provide spending visibility and alerts when your costs, usage, or Savings Plans coverage deviate from your targets. Managing budgets in OpenTofu ensures financial guardrails are consistently applied across all accounts.

## Monthly Cost Budget

```hcl
resource "aws_budgets_budget" "monthly_total" {
  name         = "monthly-total-spend"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80  # Alert at 80% of budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100  # Alert when budget exceeded
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com", "engineering@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 110  # Alert on forecasted overage
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["finops@example.com"]
  }
}
```

## Service-Specific Budget

```hcl
resource "aws_budgets_budget" "ec2_budget" {
  name         = "ec2-monthly"
  budget_type  = "COST"
  limit_amount = "3000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Filter to EC2 only
  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["engineering@example.com"]
  }
}

resource "aws_budgets_budget" "rds_budget" {
  name         = "rds-monthly"
  budget_type  = "COST"
  limit_amount = "2000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["platform@example.com"]
  }
}
```

## Budget with Automatic Action (Apply restrictive IAM policy)

```hcl
resource "aws_budgets_budget_action" "stop_nonprod" {
  budget_name        = aws_budgets_budget.monthly_total.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"  # or MANUAL
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_action.arn

  action_threshold {
    action_threshold_type  = "ABSOLUTE_VALUE"
    action_threshold_value = 12000  # USD - apply policy when spend reaches $12k
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.stop_instances.arn
      roles      = [aws_iam_role.budget_action.name]
    }
  }

  subscriber {
    address           = "finops@example.com"
    subscription_type = "EMAIL"
  }
}
```

## Tagged Resource Budget

```hcl
resource "aws_budgets_budget" "project_budget" {
  name         = "project-alpha-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Budget for resources tagged with Project=alpha
  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Project$alpha"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["project-alpha-team@example.com"]
  }
}
```

## Multiple Team Budgets

```hcl
locals {
  team_budgets = {
    platform  = 5000
    backend   = 3000
    frontend  = 1000
    data      = 4000
  }
}

resource "aws_budgets_budget" "teams" {
  for_each     = local.team_budgets
  name         = "${each.key}-monthly-budget"
  budget_type  = "COST"
  limit_amount = tostring(each.value)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$${each.key}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["${each.key}-team@example.com", "finops@example.com"]
  }
}
```

## Conclusion

AWS Budgets in OpenTofu provide financial guardrails for your cloud spending. Set monthly cost budgets per service, per team (using cost allocation tags), and for overall account spending. Configure multiple notification thresholds (80%, 100%, forecasted) so teams are warned before budgets are exceeded. Use budget actions to automatically stop non-production instances when spending spikes unexpectedly.
