# How to Create AWS Budget Actions for Automatic Cost Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Budgets, Cost Management, Automation

Description: Learn how to set up AWS Budget Actions to automatically respond when spending exceeds thresholds, including IAM policy changes and service control policies.

---

Budget alerts tell you when spending is out of control. Budget Actions actually do something about it. Instead of just sending an email that someone might read hours later, Budget Actions can automatically apply IAM policies that prevent new resource creation, or apply Service Control Policies that restrict an entire account. It's the difference between a smoke detector and a sprinkler system.

Let's set up automated cost control that kicks in when spending gets out of hand.

## How Budget Actions Work

When a budget threshold is crossed, Budget Actions can take three types of actions:

1. **Apply an IAM policy**: Attach a restrictive policy to users, groups, or roles that prevents creating new resources.
2. **Apply a Service Control Policy (SCP)**: Restrict an entire AWS account (requires AWS Organizations).
3. **Target a specific resource**: Stop or terminate specific resources like EC2 instances.

Actions can run automatically or require manual approval. For production environments, I'd recommend starting with manual approval until you're confident the actions won't disrupt legitimate workloads.

## Setting Up the IAM Role

Budget Actions needs an IAM role with permission to apply policies. Create this first.

This Terraform configuration creates the IAM role that Budget Actions will assume.

```hcl
resource "aws_iam_role" "budget_actions" {
  name = "budget-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "budgets.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "budget_actions" {
  name = "budget-actions-permissions"
  role = aws_iam_role.budget_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:AttachGroupPolicy",
          "iam:DetachGroupPolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:AttachUserPolicy",
          "iam:DetachUserPolicy"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "organizations:AttachPolicy",
          "organizations:DetachPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Creating the Deny Policy

The deny policy is what gets applied when the budget is exceeded. It should prevent creating new expensive resources while allowing existing ones to keep running.

This IAM policy prevents launching new EC2 instances and creating new RDS databases.

```hcl
resource "aws_iam_policy" "budget_exceeded_deny" {
  name        = "budget-exceeded-deny-new-resources"
  description = "Denies creation of new expensive resources when budget is exceeded"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyNewEC2Instances"
        Effect = "Deny"
        Action = [
          "ec2:RunInstances",
          "ec2:StartInstances"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyNewRDSInstances"
        Effect = "Deny"
        Action = [
          "rds:CreateDBInstance",
          "rds:CreateDBCluster"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyNewECSServices"
        Effect = "Deny"
        Action = [
          "ecs:CreateService",
          "ecs:UpdateService"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyNewLambdaFunctions"
        Effect = "Deny"
        Action = [
          "lambda:CreateFunction"
        ]
        Resource = "*"
      }
    ]
  })
}
```

Be deliberate about what you deny. You don't want to block operations that keep existing services running. Don't deny `ec2:DescribeInstances` or basic read operations, for example.

## Creating a Budget with Actions

Now create the budget and attach the action.

```bash
# Step 1: Create the budget
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "dev-account-controlled",
    "BudgetType": "COST",
    "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
    "TimeUnit": "MONTHLY"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 90,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "team@example.com"}
      ]
    }
  ]'

# Step 2: Create the budget action
aws budgets create-budget-action \
  --account-id 123456789012 \
  --budget-name "dev-account-controlled" \
  --notification-type ACTUAL \
  --action-type APPLY_IAM_POLICY \
  --action-threshold '{
    "ActionThresholdValue": 100,
    "ActionThresholdType": "PERCENTAGE"
  }' \
  --definition '{
    "IamActionDefinition": {
      "PolicyArn": "arn:aws:iam::123456789012:policy/budget-exceeded-deny-new-resources",
      "Groups": ["developers"]
    }
  }' \
  --execution-role-arn "arn:aws:iam::123456789012:role/budget-actions-role" \
  --approval-model AUTOMATIC \
  --subscribers '[
    {"SubscriptionType": "EMAIL", "Address": "finance@example.com"}
  ]'
```

The `approval-model` can be either `AUTOMATIC` or `MANUAL`. With `MANUAL`, the action waits for someone to approve it in the Budgets console before executing.

## Terraform Configuration for Budget Actions

Here's the complete Terraform setup for a budget with automatic actions.

```hcl
resource "aws_budgets_budget" "dev_controlled" {
  name         = "dev-account-controlled"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "LinkedAccount"
    values = ["111111111111"]
  }

  # Alert at 80%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@example.com"]
  }

  # Alert at 100% forecast
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["team@example.com", "finance@example.com"]
  }
}

resource "aws_budgets_budget_action" "deny_new_resources" {
  budget_name        = aws_budgets_budget.dev_controlled.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_actions.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.budget_exceeded_deny.arn
      groups     = ["developers"]
    }
  }

  subscriber {
    subscription_type = "EMAIL"
    address           = "finance@example.com"
  }
}
```

## Multi-Tier Action Strategy

A mature cost control setup has multiple tiers, each more aggressive than the last.

This configuration creates three escalation levels.

```hcl
# Tier 1: At 80%, warn via SNS (for Slack integration)
resource "aws_budgets_budget_action" "tier1_warn" {
  budget_name        = aws_budgets_budget.production.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "MANUAL"  # Require approval
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_actions.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 80
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.warn_only.arn  # Lightweight restrictions
      groups     = ["developers"]
    }
  }

  subscriber {
    subscription_type = "SNS"
    address           = aws_sns_topic.budget_alerts.arn
  }
}

# Tier 2: At 100%, restrict non-production resource creation
resource "aws_budgets_budget_action" "tier2_restrict" {
  budget_name        = aws_budgets_budget.production.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_actions.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.budget_exceeded_deny.arn
      groups     = ["developers"]
    }
  }

  subscriber {
    subscription_type = "EMAIL"
    address           = "finance@example.com"
  }
}

# Tier 3: At 120%, apply SCP to the account (nuclear option)
resource "aws_budgets_budget_action" "tier3_lockdown" {
  budget_name        = aws_budgets_budget.production.name
  action_type        = "APPLY_SCP_POLICY"
  approval_model     = "MANUAL"  # Always require approval for this
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_actions.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 120
  }

  definition {
    scp_action_definition {
      policy_id = aws_organizations_policy.emergency_restrict.id
    }
  }

  subscriber {
    subscription_type = "EMAIL"
    address           = "cto@example.com"
  }
}
```

## Monitoring Budget Actions

Check the status of your budget actions to see what's been triggered.

```bash
# List all budget actions
aws budgets describe-budget-actions-for-budget \
  --account-id 123456789012 \
  --budget-name "dev-account-controlled"

# Check the history of action executions
aws budgets describe-budget-action-histories \
  --account-id 123456789012 \
  --budget-name "dev-account-controlled" \
  --action-id "action-id-here" \
  --time-period Start=2026-01-01,End=2026-02-12
```

## Reversing Actions

When a new billing period starts or when the cost issue is resolved, you'll want to reverse the applied policies. Budget Actions can handle this automatically - when actual spend drops below the threshold (like at the start of a new month), the action is reversed.

You can also manually reverse actions through the console or CLI.

```bash
aws budgets execute-budget-action \
  --account-id 123456789012 \
  --budget-name "dev-account-controlled" \
  --action-id "action-id-here" \
  --execution-type REVERSE_ACTION
```

## Best Practices

1. **Start with manual approval** for production accounts. Switch to automatic only after you've validated the policies don't break anything critical.
2. **Don't block read operations**. Your deny policies should prevent new resource creation, not break monitoring or access to existing resources.
3. **Test with a low budget first**. Set up a $100 test budget in a sandbox account to verify everything works before applying to production.
4. **Always notify before acting**. Set an alert threshold below your action threshold so people get a warning first.
5. **Document the reversal process**. When someone hits the budget cap and can't create resources, they need to know who to contact and how to get it resolved.

For setting up the budget alerts themselves, see our post on [setting up AWS Budgets for cost alerts](https://oneuptime.com/blog/post/2026-02-12-setup-aws-budgets-cost-alerts/view).

## Wrapping Up

Budget Actions transform AWS Budgets from a passive monitoring tool into an active cost control mechanism. Set up tiered actions that escalate from warnings to restrictions as spending increases. Use IAM policies for fine-grained control and SCPs for account-level lockdowns. Start with manual approval to build confidence, and always ensure your deny policies don't break existing workloads. The combination of alerts and automated actions gives you a safety net that catches runaway costs before they become catastrophic.
