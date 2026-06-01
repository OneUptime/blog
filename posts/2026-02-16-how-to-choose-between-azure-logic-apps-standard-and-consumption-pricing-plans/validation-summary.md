# Validation Summary: How to Choose Between Azure Logic Apps Standard and Consumption Pricing Plans

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Logic Apps Consumption
- Azure Logic Apps Standard
- Azure Logic Apps connectors
- Azure Workflow Service Plan
- Azure App Service Environment v3
- Visual Studio Code Azure Logic Apps extensions
- Azure virtual network integration

## Sources Consulted
- Microsoft Learn: Usage metering, billing, and pricing for Azure Logic Apps - https://learn.microsoft.com/azure/logic-apps/logic-apps-pricing
- Microsoft Learn: Differences between Standard and Consumption logic apps - https://learn.microsoft.com/azure/logic-apps/single-tenant-overview-compare
- Microsoft Learn: Create Standard workflows with Visual Studio Code - https://learn.microsoft.com/azure/logic-apps/create-single-tenant-workflows-visual-studio-code
- Microsoft Learn: Manage Logic Apps workflows in Visual Studio Code - https://learn.microsoft.com/azure/logic-apps/manage-logic-apps-visual-studio-code
- Microsoft Learn: Export Consumption workflows to Standard - https://learn.microsoft.com/azure/logic-apps/export-from-consumption-to-standard-logic-app
- Microsoft Learn: Built-in connector overview - https://learn.microsoft.com/azure/connectors/built-in
- Microsoft Learn: Create and run .NET code from Standard workflows - https://learn.microsoft.com/azure/logic-apps/create-run-custom-code-functions
- Azure pricing page and Azure Retail Prices API for Logic Apps East US list prices - https://azure.microsoft.com/pricing/details/logic-apps/ and https://prices.azure.com/api/retail/prices

## Issues Found
- The post described Logic Apps Standard as running on an App Service plan. Updated this to the current Standard model: the single-tenant Azure Logic Apps runtime is hosted as an extension on the Azure Functions runtime, with reserved compute through Workflow Service Plan or App Service Environment v3.
- The comparison table said Consumption designer support was Azure portal only. Updated this because Microsoft documents VS Code code-first tooling for Consumption workflows, while Standard remains the model with local run/debug and project-based development.
- The post used the built-in action execution price as the Standard connector price and understated Enterprise connector pricing. Updated the East US pricing references to $0.000025 for built-in action executions, $0.000125 for Standard connector calls, and $0.001 for Enterprise connector calls.
- The Standard WS1 and WS2 monthly estimates were low for current East US list prices. Updated WS1 to roughly $180/month and WS2 to roughly $360/month, based on vCPU and memory duration meters.
- The break-even calculation incorrectly framed Standard connector calls as avoided by Standard. Updated the calculation to use built-in action executions and added a note that managed connector calls are still billed separately in Standard.
- Scenario 1 and Scenario 2 cost calculations used the wrong connector rates. Updated the arithmetic while preserving the same examples.

## Review Notes
Pricing is region-sensitive and changes over time. The corrected numbers use East US retail list prices checked on 2026-06-01; future readers should use the Azure pricing calculator or their contracted Azure pricing for final estimates.
