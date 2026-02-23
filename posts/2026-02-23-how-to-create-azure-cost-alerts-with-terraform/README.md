# How to Create Azure Cost Alerts with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Cost Alerts, Cost Management, FinOps

Description: Learn how to create Azure cost management alerts and budgets using Terraform to monitor spending across subscriptions and resource groups proactively.

---

Azure Cost Management provides budgets and alerts to help you monitor and control cloud spending. Managing these through Terraform ensures consistency across subscriptions and resource groups. This guide covers how to create Azure cost alerts, budgets, and anomaly detection with Terraform.

## Subscription-Level Budget

Create a monthly budget for an entire Azure subscription:

```hcl
# Get the current subscription
data "azurerm_subscription" "current" {}

# Create a subscription-level budget
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "monthly-subscription-budget"
  subscription_id = data.azurerm_subscription.current.id

  amount     = 5000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2027-01-01T00:00:00Z"
  }

  # Alert at 80%
  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 80
    threshold_type = "Actual"

    contact_emails = [
      "finance@company.com",
      "devops@company.com",
    ]
  }

  # Alert at 100%
  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 100
    threshold_type = "Actual"

    contact_emails = [
      "finance@company.com",
      "devops@company.com",
    ]
  }

  # Forecasted alert
  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 100
    threshold_type = "Forecasted"

    contact_emails = [
      "finance@company.com",
    ]
  }
}
```

## Resource Group Budget

Create budgets scoped to specific resource groups:

```hcl
resource "azurerm_consumption_budget_resource_group" "production" {
  name              = "production-rg-budget"
  resource_group_id = azurerm_resource_group.production.id

  amount     = 3000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2027-01-01T00:00:00Z"
  }

  # Filter by specific resource types
  filter {
    dimension {
      name = "ResourceType"
      values = [
        "Microsoft.Compute/virtualMachines",
        "Microsoft.Sql/servers",
      ]
    }
  }

  notification {
    enabled   = true
    operator  = "GreaterThan"
    threshold = 80

    contact_emails = ["production-team@company.com"]
  }

  notification {
    enabled   = true
    operator  = "GreaterThan"
    threshold = 100

    contact_emails = ["production-team@company.com", "management@company.com"]
  }
}
```

## Tag-Based Budgets

Filter budgets by resource tags:

```hcl
resource "azurerm_consumption_budget_subscription" "team_budget" {
  for_each = {
    platform = { amount = 2000, email = "platform@company.com" }
    backend  = { amount = 2500, email = "backend@company.com" }
    data     = { amount = 3000, email = "data@company.com" }
  }

  name            = "${each.key}-team-budget"
  subscription_id = data.azurerm_subscription.current.id

  amount     = each.value.amount
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2027-01-01T00:00:00Z"
  }

  filter {
    tag {
      name   = "Team"
      values = [each.key]
    }
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 80
    contact_emails = [each.value.email]
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 100
    contact_emails = [each.value.email, "finance@company.com"]
  }
}
```

## Budget with Action Groups

Integrate with Azure Monitor action groups for advanced notifications:

```hcl
# Create an action group for cost alerts
resource "azurerm_monitor_action_group" "cost_alerts" {
  name                = "cost-alert-group"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "CostAlerts"

  email_receiver {
    name          = "finance"
    email_address = "finance@company.com"
  }

  webhook_receiver {
    name        = "slack"
    service_uri = var.slack_webhook_url
  }

  sms_receiver {
    name         = "oncall"
    country_code = "1"
    phone_number = var.oncall_phone
  }
}

# Budget with action group
resource "azurerm_consumption_budget_subscription" "with_actions" {
  name            = "budget-with-actions"
  subscription_id = data.azurerm_subscription.current.id

  amount     = 5000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2027-01-01T00:00:00Z"
  }

  notification {
    enabled   = true
    operator  = "GreaterThan"
    threshold = 90

    contact_groups = [azurerm_monitor_action_group.cost_alerts.id]
  }
}
```

## Cost Anomaly Alerts

Set up alerts for unexpected cost spikes:

```hcl
# Create a cost anomaly alert using Azure Monitor
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "cost_anomaly" {
  name                = "cost-anomaly-alert"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = "eastus"

  evaluation_frequency = "P1D"
  window_duration      = "P1D"
  scopes               = [data.azurerm_subscription.current.id]

  severity = 2

  criteria {
    query = <<-QUERY
      AzureDiagnostics
      | where Category == "Costs"
      | summarize DailyCost = sum(todouble(cost_s)) by bin(TimeGenerated, 1d)
      | extend AvgCost = avg(DailyCost)
      | where DailyCost > AvgCost * 1.5
    QUERY

    time_aggregation_method = "Count"
    threshold               = 0
    operator                = "GreaterThan"
  }

  action {
    action_groups = [azurerm_monitor_action_group.cost_alerts.id]
  }
}
```

## Multi-Subscription Budgets

For organizations with multiple subscriptions:

```hcl
variable "subscriptions" {
  default = {
    production  = { id = "sub-prod-id", limit = 10000 }
    staging     = { id = "sub-staging-id", limit = 3000 }
    development = { id = "sub-dev-id", limit = 2000 }
  }
}

resource "azurerm_consumption_budget_subscription" "per_subscription" {
  for_each = var.subscriptions

  name            = "${each.key}-budget"
  subscription_id = "/subscriptions/${each.value.id}"

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
    contact_emails = ["finance@company.com"]
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 100
    contact_emails = ["finance@company.com", "cto@company.com"]
  }
}
```

## Best Practices

Create budgets at both subscription and resource group levels for layered monitoring. Use tag-based filtering to track costs by team, project, or environment. Set multiple threshold levels with progressive escalation. Use action groups for integration with Slack, PagerDuty, or other tools. Review and adjust budgets quarterly. Combine actual and forecasted alerts for comprehensive coverage. Apply budgets to all subscriptions including development and staging environments.

## Conclusion

Azure cost alerts managed through Terraform provide proactive spending visibility across your Azure environment. By combining subscription-level budgets, resource group budgets, and tag-based filtering, you can build a comprehensive cost monitoring system. Terraform ensures these alerts are consistent, version-controlled, and automatically deployed across all your subscriptions.

For related guides, see [How to Create AWS Budget Alerts with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aws-budget-alerts-with-terraform/view) and [How to Use Terraform Tags for Cost Allocation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-tags-for-cost-allocation/view).
