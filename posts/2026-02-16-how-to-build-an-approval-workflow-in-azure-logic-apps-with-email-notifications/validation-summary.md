# Validation Summary: How to Build an Approval Workflow in Azure Logic Apps with Email Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Logic Apps
- Azure CLI
- Logic Apps Request trigger
- Microsoft Approvals connector
- Office 365 Outlook connector
- Azure Table Storage connector
- Workflow Definition Language

## Sources Consulted
- Microsoft Learn: Azure CLI `az logic workflow` reference - https://learn.microsoft.com/en-us/cli/azure/logic/workflow
- Microsoft Learn: Quickstart - Create and manage workflows with Azure CLI - https://learn.microsoft.com/en-us/azure/logic-apps/quickstart-logic-apps-azure-cli
- Microsoft Learn: Create callable or nestable workflows with Request triggers - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-http-endpoint
- Microsoft Learn: Schema reference for trigger and action types in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Standard Approvals connector reference - https://learn.microsoft.com/en-us/connectors/approvals/
- Microsoft Learn: Office 365 Outlook connector reference - https://learn.microsoft.com/en-us/connectors/office365connector/
- Microsoft Learn: Azure Table Storage connector reference - https://learn.microsoft.com/en-us/connectors/azuretables/
- Microsoft Learn: Azure Table Storage built-in connector reference - https://learn.microsoft.com/en-us/azure/logic-apps/connectors/built-in/reference/azuretables/

## Issues Found
- The Azure CLI creation example passed an ARM-style wrapper object inline to `--definition`. Microsoft documentation shows `az logic workflow create` using a workflow definition JSON file, whose root is the Workflow Definition Language document. I changed the example to create `approval-workflow-definition.json` with `$schema`, `contentVersion`, `triggers`, `actions`, and `outputs`, then pass that file to `--definition`.
- The approval configuration implied email notifications without explicitly enabling notifications. I added `Enable notifications: Yes` to align the described email behavior with the current Approvals connector option.
- The timeout explanation said the action status is `TimedOut`. Microsoft documentation describes asynchronous timeouts as canceled with an `ActionTimedOut` code. I updated the wording while keeping the designer guidance for configuring a timeout run-after path.
- The parallel approvals section said to list multiple assignees but did not specify the required delimiter. The Approvals connector requires semicolon-delimited email addresses, UPNs, or Microsoft Entra ID user IDs, so I added that detail.
- The Azure Table Storage example used a low-level managed connector action shape and path that was ambiguous and not aligned with current V2 connector guidance. I changed the example to instruct readers to use the "Insert Entity (V2)" action and map the entity body fields directly.

## Review Notes
The post is technically relevant and remains valid as a Logic Apps approval workflow tutorial after the corrections. The Azure CLI was not installed in the local workspace, so CLI behavior was verified against current Microsoft Learn documentation rather than local `az --help` output.
