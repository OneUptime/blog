# Validation Summary: How to Manage Azure Reservations with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Azure Reservations
- Azure Resource Manager
- AzAPI provider
- AzureRM provider
- Azure CLI
- Azure Cost Management budgets

## Sources Consulted
- Microsoft Learn: Microsoft.Capacity/reservationOrders ARM/AzAPI reference
  - https://learn.microsoft.com/en-us/azure/templates/microsoft.capacity/reservationorders
- Microsoft Learn: Reservation Order - Purchase REST API
  - https://learn.microsoft.com/en-us/rest/api/reserved-vm-instances/reservation-order/purchase?view=rest-reserved-vm-instances-2022-11-01
- Microsoft Learn: az reservations catalog
  - https://learn.microsoft.com/en-us/cli/azure/reservations/catalog?view=azure-cli-latest
- Microsoft Learn: az reservations reservation-order
  - https://learn.microsoft.com/en-us/cli/azure/reservations/reservation-order?view=azure-cli-latest
- Microsoft Learn: What are Azure Reservations?
  - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations
- Microsoft Learn: Buy a reservation
  - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/prepare-buy-reservation
- Microsoft Learn: Instance size flexibility for Azure Reservations
  - https://learn.microsoft.com/en-nz/azure/cost-management-billing/reservations/instance-size-flexibility
- Microsoft Learn: Self-service exchanges and cancel/refunds for Azure Reservations
  - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations
- Microsoft Learn: Changes to the Azure reservation exchange policy
  - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reservation-exchange-policy-changes
- HashiCorp AzureRM provider docs (raw source): azurerm_consumption_budget_subscription
  - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/consumption_budget_subscription.html.markdown
- Microsoft Learn: Save on compute costs with Azure Reservations - Azure SQL Database & SQL Managed Instance
  - https://learn.microsoft.com/en-us/azure/azure-sql/database/reserved-capacity-overview?view=azuresql-db

## Issues Found
- The `azapi_resource` reservation examples used the wrong scope. `Microsoft.Capacity/reservationOrders` is tenant-scoped, so `parent_id` cannot be a subscription ID. I changed `parent_id` to `/`.
- The reservation examples put `location` inside `properties` and set the resource location to `global`. The purchase API expects `location` at the top level and it must be the reserved resource region. I moved it to the resource and set it to `eastus`.
- The reservation examples omitted required purchase properties used by the documented API shape: `billingScopeId` and `displayName`. I added both.
- The examples used human-readable reservation order names directly in `name`. The purchase API and CLI use a reservation order ID. I changed the examples to use `var.*_reservation_order_id` and noted that it must be a GUID.
- The shared-scope examples incorrectly set `appliedScopes = ["Shared"]`. For shared scope, Azure documents that `appliedScopes` should not be specified. I removed it.
- The SQL reservation example used undocumented service-specific fields (`productType`, `vcoresCount`) that are not part of the current published purchase schema. I replaced them with a catalog-derived SKU variable and kept only the documented purchase fields.
- The CLI purchase example used the wrong flag name: `--reservation-order-name`. The current command requires `--reservation-order-id`. I fixed the command and added the missing `--display-name`.
- The CLI example passed `--billing-scope` as a subscription resource ID. The official CLI examples use the subscription ID value for that argument, so I aligned the example with the current CLI docs.
- The Azure CLI reservation commands come from the `reservations` extension and are marked preview. I added that requirement to the command section.
- The budget resource used `subscription_id = var.subscription_id`, which is incorrect for the documented AzureRM v3 resource input. I changed it to the subscription resource ID form.
- The budget filter block used `resource_type`, which is not a valid block for `azurerm_consumption_budget_subscription`. I replaced it with the documented `dimension` filter using `ResourceType`.
- The budget start date was a stale fixed value that would violate the provider guidance for monthly budgets. I updated it to a current-month first-of-month example and clarified the requirement in a comment.
- The exchange section conflated reservation exchange with instance size flexibility. I corrected the explanation and aligned it with the current Azure reservation exchange policy docs.
- The conclusion described maximizing utilization at the “subscription or billing account level,” which is inaccurate for shared scope. I corrected it to shared scope across eligible subscriptions in the billing context.

## Review Notes
- The post still pins `azurerm` to the 3.x major line. The examples are valid after the corrections above, but the latest AzureRM provider major is 4.x, so a future refresh could modernize the provider pinning and provider authentication examples.
