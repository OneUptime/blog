# How to Implement Azure Budget Alerts and Cost Management with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Cost Management, Budget Alerts, FinOps, Infrastructure as Code, Cloud Cost

Description: Learn how to set up Azure budget alerts and cost management policies using Terraform to keep cloud spending under control.

---

Cloud costs have a way of creeping up on you. You spin up a few extra VMs for testing, forget to clean up a storage account, and suddenly your monthly bill is double what you expected. Azure provides budget alerts and cost management tools to help, but setting them up through the portal means they are easy to forget and hard to replicate across subscriptions. Terraform lets you codify these guardrails so every subscription and resource group gets proper cost oversight from day one.

This post covers how to implement Azure budget alerts, cost anomaly detection, and management policies using Terraform.

## Setting Up a Subscription-Level Budget

The most common starting point is a subscription-level budget. This monitors total spend across everything in a subscription and sends alerts at configurable thresholds.

```hcl
# main.tf
# Configures the Azure provider and sets up a subscription-level budget

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Get the current subscription details
data "azurerm_subscription" "current" {}

# Create a monthly budget for the subscription
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "monthly-subscription-budget"
  subscription_id = data.azurerm_subscription.current.id

  # Budget amount in the subscription's billing currency
  amount     = 5000
  time_grain = "Monthly"

  # Budget period - start from the beginning of the current month
  time_period {
    start_date = "2026-02-01T00:00:00Z"
    end_date   = "2027-02-01T00:00:00Z"
  }

  # Alert at 50% of budget - early warning
  notification {
    enabled   = true
    threshold = 50.0
    operator  = "GreaterThan"

    contact_emails = [
      "engineering-leads@example.com",
    ]
  }

  # Alert at 80% of budget - time to investigate
  notification {
    enabled   = true
    threshold = 80.0
    operator  = "GreaterThan"

    contact_emails = [
      "engineering-leads@example.com",
      "finops@example.com",
    ]
  }

  # Alert at 100% of budget - budget exceeded
  notification {
    enabled        = true
    threshold      = 100.0
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = [
      "engineering-leads@example.com",
      "finops@example.com",
      "vp-engineering@example.com",
    ]
  }

  # Forecasted alert at 110% - projected overspend
  notification {
    enabled        = true
    threshold      = 110.0
    operator       = "GreaterThan"
    threshold_type = "Forecasted"

    contact_emails = [
      "finops@example.com",
    ]
  }
}
```

The key thing to notice is the `threshold_type` parameter. The default is `Actual`, which triggers when real spend crosses the threshold. Setting it to `Forecasted` triggers based on Azure's projection of where spending is headed. Forecasted alerts give you time to react before costs actually exceed the budget.

## Resource Group Budgets

Subscription-level budgets are useful for overall visibility, but they do not tell you which team or project is responsible for the spend. Resource group budgets let you get more granular.

```hcl
# Resource group budget with filters
# This targets a specific resource group and can further filter by resource type

resource "azurerm_consumption_budget_resource_group" "team_api" {
  name              = "team-api-monthly-budget"
  resource_group_id = azurerm_resource_group.api.id

  amount     = 1500
  time_grain = "Monthly"

  time_period {
    start_date = "2026-02-01T00:00:00Z"
    end_date   = "2027-02-01T00:00:00Z"
  }

  # Optional filter to only track specific resource types or tags
  filter {
    tag {
      name = "team"
      values = [
        "api-team",
      ]
    }
  }

  notification {
    enabled   = true
    threshold = 75.0
    operator  = "GreaterThan"

    contact_emails = [
      "api-team-lead@example.com",
    ]
  }

  notification {
    enabled        = true
    threshold      = 100.0
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = [
      "api-team-lead@example.com",
      "finops@example.com",
    ]
  }
}
```

## Triggering Action Groups for Automated Responses

Email alerts are fine for awareness, but sometimes you want automated responses when budgets are exceeded. Azure Action Groups let you trigger webhooks, Azure Functions, or Logic Apps.

```hcl
# Create an action group that triggers a webhook when budget alerts fire
resource "azurerm_monitor_action_group" "cost_alert" {
  name                = "cost-alert-actions"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "costAlert"

  email_receiver {
    name          = "finops-team"
    email_address = "finops@example.com"
  }

  # Trigger a webhook to Slack or PagerDuty
  webhook_receiver {
    name        = "slack-webhook"
    service_uri = var.slack_webhook_url
  }

  # Trigger an Azure Function that can take action
  azure_function_receiver {
    name                     = "cost-shutdown-function"
    function_app_resource_id = azurerm_linux_function_app.cost_management.id
    function_name            = "shutdown-non-prod"
    http_trigger_url         = "https://${azurerm_linux_function_app.cost_management.default_hostname}/api/shutdown-non-prod"
  }
}

# Reference the action group in the budget notification
resource "azurerm_consumption_budget_subscription" "with_actions" {
  name            = "budget-with-automated-actions"
  subscription_id = data.azurerm_subscription.current.id

  amount     = 5000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-02-01T00:00:00Z"
    end_date   = "2027-02-01T00:00:00Z"
  }

  notification {
    enabled        = true
    threshold      = 90.0
    operator       = "GreaterThan"
    threshold_type = "Actual"

    # Use both email and action group
    contact_emails = [
      "finops@example.com",
    ]

    contact_groups = [
      azurerm_monitor_action_group.cost_alert.id,
    ]
  }
}
```

## Using Variables for Multi-Subscription Deployment

If you manage multiple subscriptions, variables and locals make it easy to deploy consistent budgets everywhere.

```hcl
# variables.tf
# Define budget configuration as a variable for reuse

variable "budgets" {
  description = "Map of budget configurations per resource group"
  type = map(object({
    amount          = number
    alert_emails    = list(string)
    warning_percent = number
    critical_percent = number
  }))
  default = {
    "team-api" = {
      amount          = 1500
      alert_emails    = ["api-lead@example.com"]
      warning_percent = 70
      critical_percent = 90
    }
    "team-frontend" = {
      amount          = 800
      alert_emails    = ["frontend-lead@example.com"]
      warning_percent = 75
      critical_percent = 95
    }
    "shared-infra" = {
      amount          = 3000
      alert_emails    = ["infra-team@example.com"]
      warning_percent = 60
      critical_percent = 85
    }
  }
}
```

```hcl
# budgets.tf
# Create budgets dynamically from the variable map

resource "azurerm_consumption_budget_resource_group" "per_team" {
  for_each = var.budgets

  name              = "${each.key}-monthly-budget"
  resource_group_id = azurerm_resource_group.teams[each.key].id

  amount     = each.value.amount
  time_grain = "Monthly"

  time_period {
    start_date = "2026-02-01T00:00:00Z"
    end_date   = "2027-02-01T00:00:00Z"
  }

  # Warning notification
  notification {
    enabled   = true
    threshold = each.value.warning_percent
    operator  = "GreaterThan"

    contact_emails = each.value.alert_emails
  }

  # Critical notification
  notification {
    enabled        = true
    threshold      = each.value.critical_percent
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = concat(each.value.alert_emails, ["finops@example.com"])
  }
}
```

## Cost Anomaly Alerts

Beyond static budgets, Azure can detect unusual spending patterns. While Terraform does not have a direct resource for cost anomaly alerts at the time of writing, you can set up metric alerts that watch for cost spikes.

```hcl
# Set up a cost anomaly alert using Azure Monitor
resource "azurerm_monitor_metric_alert" "cost_spike" {
  name                = "cost-spike-detection"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [data.azurerm_subscription.current.id]
  description         = "Alert when daily cost exceeds normal patterns"
  severity            = 2
  frequency           = "PT1H"
  window_size         = "P1D"

  criteria {
    metric_namespace = "Microsoft.CostManagement/externalBillingAccounts"
    metric_name      = "BillingCurrency"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 500
  }

  action {
    action_group_id = azurerm_monitor_action_group.cost_alert.id
  }
}
```

## Tagging Policy for Cost Attribution

Budgets work best when resources are properly tagged. You can enforce tagging requirements with Azure Policy, also managed through Terraform.

```hcl
# Enforce that all resources must have a "cost-center" tag
resource "azurerm_subscription_policy_assignment" "require_cost_center" {
  name                 = "require-cost-center-tag"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef391786e56f"
  description          = "Require cost-center tag on all resources"
  display_name         = "Require cost-center tag"

  parameters = jsonencode({
    tagName = {
      value = "cost-center"
    }
  })
}
```

## Exporting Cost Data

For teams that want to analyze costs in their own tools, Terraform can set up cost exports to storage accounts.

```hcl
# Export daily cost data to a storage account for analysis
resource "azurerm_subscription_cost_management_export" "daily" {
  name                    = "daily-cost-export"
  subscription_id         = data.azurerm_subscription.current.id
  recurrence_type         = "Daily"
  recurrence_period_start = "2026-02-01T00:00:00Z"
  recurrence_period_end   = "2027-02-01T00:00:00Z"

  export_data_storage_location {
    container_id = azurerm_storage_container.cost_exports.resource_manager_id
    root_folder_path = "/cost-exports"
  }

  export_data_options {
    type       = "ActualCost"
    time_frame = "MonthToDate"
  }
}
```

## Putting It All Together

A comprehensive cost management setup in Terraform typically includes subscription-level budgets for overall visibility, resource group budgets for team accountability, action groups for automated response, tagging policies for proper attribution, and cost exports for analysis. Start by getting the subscription budget in place with reasonable thresholds, then layer on the more granular controls as your organization matures.

The real power here is that these cost guardrails are versioned and reviewed just like your infrastructure code. When someone asks "what happens if we exceed our budget?", the answer is right there in the Terraform configuration, not buried in some portal setting that nobody remembers creating.
