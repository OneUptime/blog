# How to Handle Multi-Account Cost Tracking with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Account, Cost Tracking, AWS Organizations, FinOps

Description: Learn how to implement cost tracking across multiple cloud accounts using Terraform with consolidated billing, cross-account budgets, and centralized reporting.

---

Organizations with multiple cloud accounts face unique cost tracking challenges. Spending is distributed across accounts, making it difficult to get a unified view. Terraform can provision the infrastructure needed for centralized cost tracking across all your accounts. This guide covers multi-account cost tracking strategies for AWS, Azure, and GCP.

## AWS Organizations Cost Tracking

Set up consolidated billing and cost tracking across an AWS Organization:

```hcl
# Organization-level budget
resource "aws_budgets_budget" "organization" {
  name         = "organization-total-budget"
  budget_type  = "COST"
  limit_amount = "50000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@company.com"]
  }
}

# Per-account budgets
variable "account_budgets" {
  default = {
    production = { account_id = "111111111111", limit = 20000 }
    staging    = { account_id = "222222222222", limit = 5000 }
    dev        = { account_id = "333333333333", limit = 3000 }
    shared     = { account_id = "444444444444", limit = 8000 }
  }
}

resource "aws_budgets_budget" "per_account" {
  for_each = var.account_budgets

  name         = "${each.key}-account-budget"
  budget_type  = "COST"
  limit_amount = tostring(each.value.limit)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "LinkedAccount"
    values = [each.value.account_id]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@company.com", "cto@company.com"]
  }
}
```

## Centralized CUR for All Accounts

Set up a Cost and Usage Report in the management account:

```hcl
# CUR in management account covers all member accounts
resource "aws_cur_report_definition" "organization" {
  report_name                = "organization-cur"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cur.id
  s3_region                  = "us-east-1"
  s3_prefix                  = "organization-cur"
  report_versioning          = "OVERWRITE_REPORT"
  refresh_closed_reports     = true
}

# Athena for querying cross-account costs
resource "aws_athena_named_query" "cost_by_account" {
  name     = "monthly-cost-by-account"
  database = aws_glue_catalog_database.cur.name

  query = <<-SQL
    SELECT
      line_item_usage_account_id AS account_id,
      DATE_FORMAT(line_item_usage_start_date, '%Y-%m') AS month,
      SUM(line_item_unblended_cost) AS total_cost
    FROM organization_cur
    WHERE year = '2026' AND month = '02'
    GROUP BY line_item_usage_account_id, DATE_FORMAT(line_item_usage_start_date, '%Y-%m')
    ORDER BY total_cost DESC
  SQL
}

resource "aws_athena_named_query" "cost_by_account_service" {
  name     = "monthly-cost-by-account-and-service"
  database = aws_glue_catalog_database.cur.name

  query = <<-SQL
    SELECT
      line_item_usage_account_id AS account_id,
      product_product_name AS service,
      SUM(line_item_unblended_cost) AS total_cost
    FROM organization_cur
    WHERE year = '2026' AND month = '02'
    GROUP BY line_item_usage_account_id, product_product_name
    HAVING SUM(line_item_unblended_cost) > 10
    ORDER BY account_id, total_cost DESC
  SQL
}
```

## Cross-Account Cost Anomaly Detection

Set up anomaly detection across accounts:

```hcl
resource "aws_ce_anomaly_monitor" "organization" {
  name              = "organization-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "alerts" {
  name = "organization-anomaly-alerts"

  monitor_arn_list = [aws_ce_anomaly_monitor.organization.arn]

  subscriber {
    type    = "EMAIL"
    address = "finops@company.com"
  }

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  frequency = "DAILY"
}
```

## Azure Multi-Subscription Cost Tracking

```hcl
# Management group budget covering all subscriptions
resource "azurerm_consumption_budget_management_group" "org" {
  name                = "organization-budget"
  management_group_id = azurerm_management_group.root.id

  amount     = 50000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2027-01-01T00:00:00Z"
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 80
    contact_emails = ["finance@company.com"]
  }
}

# Per-subscription budgets
resource "azurerm_consumption_budget_subscription" "per_sub" {
  for_each = var.subscription_budgets

  name            = "${each.key}-budget"
  subscription_id = each.value.subscription_id

  amount     = each.value.limit
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2027-01-01T00:00:00Z"
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 80
    contact_emails = [each.value.owner_email]
  }
}
```

## GCP Multi-Project Cost Tracking

```hcl
# Billing budget spanning multiple projects
resource "google_billing_budget" "organization" {
  billing_account = data.google_billing_account.main.id
  display_name    = "Organization Budget"

  budget_filter {
    projects = [
      "projects/prod-project",
      "projects/staging-project",
      "projects/dev-project",
      "projects/shared-services",
    ]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "50000"
    }
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.finops.name
    ]
  }
}
```

## Centralized Cost Dashboard

Create a dashboard aggregating costs across all accounts:

```hcl
resource "aws_cloudwatch_dashboard" "multi_account_costs" {
  dashboard_name = "MultiAccountCosts"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          title   = "Monthly Cost by Account"
          metrics = [
            for name, config in var.account_budgets :
            ["AWS/Billing", "EstimatedCharges", "LinkedAccount", config.account_id, "Currency", "USD",
             { label = name }]
          ]
          period = 86400
          stat   = "Maximum"
          region = "us-east-1"
        }
      }
    ]
  })
}
```

## Best Practices

Use consolidated billing through AWS Organizations, Azure Management Groups, or GCP billing accounts. Create budgets at both the organization and individual account levels. Set up centralized CUR or cost exports for cross-account analysis. Implement anomaly detection to catch unexpected spending in any account. Use consistent tagging across all accounts for accurate cost allocation. Establish a central FinOps team with visibility into all accounts. Review cross-account costs monthly and adjust budgets as needed.

## Conclusion

Multi-account cost tracking with Terraform provides centralized visibility into distributed cloud spending. By leveraging consolidated billing, cross-account budgets, and centralized reporting, you can maintain financial control even as your cloud footprint grows across multiple accounts. Terraform ensures that cost tracking infrastructure is consistently deployed and version-controlled across your entire organization.

For related guides, see [How to Create AWS Budget Alerts with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aws-budget-alerts-with-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
