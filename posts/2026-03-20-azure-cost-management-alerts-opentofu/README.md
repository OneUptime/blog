# How to Create Azure Cost Management Alerts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Cost Management, Budget, Infrastructure as Code

Description: Learn how to create Azure Cost Management budgets and alerts with OpenTofu to monitor and control Azure spending across subscriptions and resource groups.

Azure Cost Management budgets notify teams when spending exceeds thresholds. Managing budgets in OpenTofu ensures every subscription and resource group has appropriate cost guardrails from day one.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

## Subscription-Level Budget

```hcl
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "production-monthly-budget"
  subscription_id = var.subscription_id

  amount     = 50000  # USD
  time_grain = "Monthly"

  time_period {
    start_date = "2026-05-01T00:00:00Z"
    # end_date is optional - if omitted, Azure sets it to 10 years after start_date
  }

  notification {
    enabled        = true
    threshold      = 70
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = ["finops@example.com"]
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = ["finops@example.com", "engineering@example.com"]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = ["finops@example.com", "cto@example.com"]
  }

  notification {
    enabled        = true
    threshold      = 110
    operator       = "GreaterThan"
    threshold_type = "Forecasted"
    contact_emails = ["finops@example.com"]
  }
}
```

Resource Group Budget

```hcl
resource "azurerm_consumption_budget_resource_group" "app" {
  name              = "app-rg-budget"
  resource_group_id = azurerm_resource_group.app.id

  amount     = 10000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-05-01T00:00:00Z"
  }

  # Filter to specific resource types
  filter {
    dimension {
      name     = "ResourceType"
      operator = "In"
      values   = [
        "Microsoft.Compute/virtualMachines",
        "Microsoft.ContainerService/managedClusters",
      ]
    }
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = ["platform-team@example.com"]
    contact_roles  = ["Owner"]
  }
}
```

## Tagged Resource Budget

```hcl
resource "azurerm_consumption_budget_subscription" "by_team" {
  name            = "backend-team-budget"
  subscription_id = var.subscription_id
  amount          = 20000
  time_grain      = "Monthly"

  time_period {
    start_date = "2026-05-01T00:00:00Z"
  }

  # Budget for resources tagged with Team=backend
  filter {
    tag {
      name     = "Team"
      operator = "In"
      values   = ["backend"]
    }
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = ["backend-team@example.com", "finops@example.com"]
  }
}
```

## Multiple Team Budgets

```hcl
locals {
  team_budgets = {
    platform = 20000
    backend  = 15000
    frontend = 5000
    data     = 25000
  }
}

resource "azurerm_consumption_budget_subscription" "teams" {
  for_each        = local.team_budgets
  name            = "${each.key}-budget"
  subscription_id = var.subscription_id
  amount          = each.value
  time_grain      = "Monthly"

  time_period {
    start_date = "2026-05-01T00:00:00Z"
  }

  filter {
    tag {
      name     = "Team"
      operator = "In"
      values   = [each.key]
    }
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = ["${each.key}@example.com", "finops@example.com"]
  }
}
```

## Conclusion

Azure Cost Management budgets in OpenTofu provide proactive spending visibility. Set budgets at the subscription level for overall control and at the resource group level for team-level accountability. Configure multiple notification thresholds (70%, 90%, 100%) and add forecasted alerts to catch spending trends before budgets are exceeded. Use tag-based filters to align budgets with your team and project structure.
