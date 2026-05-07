# How to Manage Azure Reservations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Reservation, Cost Optimization, Infrastructure as Code

Description: Learn how to purchase and manage Azure Reservations with OpenTofu to reduce costs on VMs, SQL databases, and other Azure services with 1 or 3-year commitments.

Azure Reservations offer up to 72% savings on Azure services compared to pay-as-you-go pricing. Managing reservations in OpenTofu keeps financial commitments documented and reviewable alongside the infrastructure they support.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "azapi" {}
```

## VM Reservation

```hcl
# Azure reservations are managed via the azapi provider or Azure CLI

# The azurerm provider does not yet support purchasing reservations directly

resource "azapi_resource" "vm_reservation" {
  type      = "Microsoft.Capacity/reservationOrders@2022-11-01"
  name      = var.vm_reservation_order_id  # Must be a GUID
  location  = "eastus"
  parent_id = "/"  # Reservation orders are tenant-scoped

  body = {
    sku = {
      name = "Standard_D4s_v5"
    }
    properties = {
      reservedResourceType = "VirtualMachines"
      term                 = "P1Y"  # P1Y = 1 year, P3Y = 3 years
      billingPlan          = "Monthly"  # Monthly or Upfront
      billingScopeId       = "/subscriptions/${var.subscription_id}"
      displayName          = "production-vm-reservation"
      quantity             = 5  # Number of instances
      appliedScopeType     = "Shared"

      reservedResourceProperties = {
        instanceFlexibility = "On"  # Instance size flexibility
      }
    }
  }
}
```

## SQL Database Reservation

```hcl
resource "azapi_resource" "sql_reservation" {
  type      = "Microsoft.Capacity/reservationOrders@2022-11-01"
  name      = var.sql_reservation_order_id  # Must be a GUID
  location  = "eastus"
  parent_id = "/"  # Reservation orders are tenant-scoped

  body = {
    sku = {
      # Discover the exact SQL reservation SKU for your deployment type,
      # performance tier, and region from the reservation catalog first.
      name = var.sql_reservation_sku
    }
    properties = {
      reservedResourceType = "SqlDatabases"
      term                 = "P3Y"  # 3 year for maximum savings
      billingPlan          = "Monthly"
      billingScopeId       = "/subscriptions/${var.subscription_id}"
      displayName          = "production-sql-reservation"
      quantity             = var.sql_reservation_quantity
      appliedScopeType     = "Shared"
    }
  }
}
```

## Using Azure CLI for Reservation Purchase

```bash
# Requires the Azure CLI reservations extension (preview; auto-installs on first use)

# Get available reservation offers
az reservations catalog show \
  --subscription-id <sub-id> \
  --reserved-resource-type VirtualMachines \
  --location eastus

# Purchase a reservation
az reservations reservation-order purchase \
  --reservation-order-id <reservation-order-id> \
  --reserved-resource-type VirtualMachines \
  --display-name "prod-vm-reservation" \
  --sku "Standard_D4s_v5" \
  --applied-scope-type Shared \
  --billing-scope <sub-id> \
  --quantity 5 \
  --term P1Y \
  --billing-plan Monthly \
  --location eastus \
  --instance-flexibility On
```

## Cost Budget for Reservation Coverage

```hcl
resource "azurerm_consumption_budget_subscription" "vm_budget" {
  name            = "vm-cost-budget"
  subscription_id = "/subscriptions/${var.subscription_id}"

  amount     = 10000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-05-01T00:00:00Z"  # Use the first day of the current month
  }

  filter {
    dimension {
      name     = "ResourceType"
      operator = "In"
      values   = ["Microsoft.Compute/virtualMachines"]
    }
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = ["finops@example.com"]
  }
}
```

## Reserved Instance Exchange and Return

Azure allows self-service exchanges and refunds for eligible reservations. Instance Size Flexibility is a separate capability that lets VM reservations apply to other sizes in the same flexibility group. Manage exchanges and returns through the Azure portal or reservation APIs/CLI, not OpenTofu, as they are financial transactions subject to Azure reservation policy.

## Conclusion

Azure Reservations in OpenTofu provide documented, reviewable financial commitments. Use the azapi provider for reservation purchases until native azurerm support is available, enable instance size flexibility to automatically apply savings to different VM sizes within the same family, and monitor reservation utilization in the Azure Cost Management portal. Use shared scope across eligible subscriptions in the billing context for maximum utilization.
