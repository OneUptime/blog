# Validation Summary: How to Create and Manage Budgets in Azure Cost Management with Automated Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cost Management budgets
- Azure CLI
- Azure Resource Manager templates
- Azure Monitor action groups and common alert schema
- Azure Functions
- Azure SDK for .NET / Azure.ResourceManager.Compute

## Sources Consulted
- Microsoft Learn: Tutorial - Create and manage budgets: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets
- Microsoft Learn: az consumption budget CLI reference: https://learn.microsoft.com/en-us/cli/azure/consumption/budget?view=azure-cli-latest
- Microsoft Learn: Microsoft.Consumption/budgets ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.consumption/budgets
- Microsoft Learn: Azure billing and cost management budget scenario: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/cost-management-budget-scenario
- Microsoft Learn: Common alert schema for Azure Monitor alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema
- Microsoft Learn: Cost Management Budgets REST API: https://learn.microsoft.com/en-us/rest/api/cost-management/budgets/create-or-update?view=rest-cost-management-2025-03-01
- Microsoft Learn: Azure.ResourceManager.Compute VirtualMachineCollection.GetAllAsync: https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.compute.virtualmachinecollection.getallasync?view=azure-dotnet
- Microsoft Learn: Azure.ResourceManager.Compute VirtualMachineResource.DeallocateAsync: https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.compute.virtualmachineresource.deallocateasync?view=azure-dotnet

## Issues Found
- The portal section said the expiration date has a maximum of 10 years. Microsoft documentation states that for cost budgets there are no end-date constraints, and if an end date is omitted it defaults to 10 years from the start date. Updated the wording accordingly.
- The Azure CLI example used `az consumption budget create` with `--notifications`, `--start-date`, and `--end-date`. The current CLI reference exposes notifications through the create-or-update style command parameters using `--time-period` and `--notifications`; the basic `create` command does not accept `--notifications`. Updated the example to use `az consumption budget update` with `--time-period` and CLI-compatible notification field names.
- The C# Azure Function sample mixed the older `ComputeManagementClient` pattern with `DefaultAzureCredential` and Track 2 SDK object shapes. Updated the sample to use `ArmClient`, `ResourceGroupResource.GetVirtualMachines().GetAllAsync()`, and `VirtualMachineResource.DeallocateAsync(WaitUntil.Started)`.

## Review Notes
The Azure CLI `consumption` budget commands are still marked Preview in the official Azure CLI reference. The post now uses the documented syntax, but future CLI releases may change these commands.
