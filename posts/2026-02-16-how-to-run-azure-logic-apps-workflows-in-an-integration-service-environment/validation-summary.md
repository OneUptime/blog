# Validation Summary: How to Run Azure Logic Apps Workflows in an Integration Service Environment

## Status
validated

## Post Type
Technical guide / migration reference

## Technologies Covered
- Azure Logic Apps Consumption
- Azure Logic Apps Standard
- Integration Service Environment (ISE)
- Azure Virtual Network
- Azure CLI
- Azure Resource Manager REST API
- Azure Monitor metrics

## Sources Consulted
- Microsoft Lifecycle: Integration Services Environment - https://learn.microsoft.com/lifecycle/products/integration-services-environment
- Azure Logic Apps overview - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-overview
- Integration Service Environments REST API, Create or Update - https://learn.microsoft.com/en-us/rest/api/logic/integration-service-environments/create-or-update?view=rest-logic-2019-05-01
- Integration Service Environments REST API, List by Subscription - https://learn.microsoft.com/en-us/rest/api/logic/integration-service-environments/list-by-subscription?view=rest-logic-2019-05-01
- Azure Quickstart Template: Integration Service Environment - https://learn.microsoft.com/samples/azure/azure-quickstart-templates/integration-service-environment/
- Azure CLI: az appservice plan - https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Azure CLI: az logicapp - https://learn.microsoft.com/en-us/cli/azure/logicapp
- Azure CLI: az webapp vnet-integration - https://learn.microsoft.com/en-us/cli/azure/webapp/vnet-integration
- Azure Monitor supported metrics for Microsoft.Logic/IntegrationServiceEnvironments - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-logic-integrationserviceenvironments-metrics
- Azure Logic Apps built-in connectors overview - https://learn.microsoft.com/en-us/azure/connectors/built-in

## Issues Found
- ISE availability was described as retired only for new deployments. Updated the note to state that ISE retired on August 31, 2024, based on Microsoft Lifecycle.
- The ISE networking requirements and creation example used one subnet. Updated the requirements and REST example to use four empty ISE subnets, matching Microsoft REST examples and the official ISE quickstart template.
- The post said no NSGs or route tables could be used on ISE subnets. Updated this to state that NSGs or route tables require the documented ISE traffic allowances.
- The ISE connector examples listed "HTTP ISE". HTTP is a built-in/core operation, not an ISE-labeled managed connector. Replaced it with Service Bus ISE.
- The sample private IP address overlapped with one of the corrected ISE subnets. Changed the example internal API address to a separate private subnet range.
- The on-premises HTTP example used `appsetting()` in an ISE/Consumption-style workflow snippet. Changed the credentials to workflow parameters, which are supported by the Workflow Definition Language.
- The migration section said Logic Apps Standard required WS3 or higher, while the example used WS2. Updated the text to refer generally to Workflow Standard plans.
- The VNET integration command used `az logicapp vnet-integration add`, which is not the documented CLI command. Changed it to `az webapp vnet-integration add`.

## Review Notes
ISE is retired and should not be used for new builds. The remaining ISE deployment commands are retained only as historical/reference examples for understanding existing environments; new network-isolated workloads should use Logic Apps Standard with VNET integration or ASEv3 where appropriate.
