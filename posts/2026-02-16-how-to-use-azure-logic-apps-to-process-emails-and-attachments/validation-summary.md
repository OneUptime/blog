# Validation Summary: How to Use Azure Logic Apps to Process Emails and Attachments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Logic Apps
- Office 365 Outlook connector
- Azure Blob Storage connector
- Logic Apps Workflow Definition Language
- Logic Apps workflow expressions
- HTTP actions and Azure Functions integration

## Sources Consulted
- Microsoft Learn: Office 365 Outlook connector reference - https://learn.microsoft.com/en-us/connectors/office365connector/
- Microsoft Learn: Connect to Office 365 Outlook from workflows in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/connectors/connectors-create-api-office365-outlook
- Microsoft Learn: Create workflows with multiple Azure services - https://learn.microsoft.com/en-us/azure/logic-apps/tutorial-process-email-attachments-workflow
- Microsoft Learn: Workflow Definition Language schema reference - https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-schema
- Microsoft Learn: Schema reference for trigger and action types in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Reference for functions in workflow expressions - https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference
- Microsoft Learn: Create parameters for workflow inputs - https://learn.microsoft.com/en-us/azure/logic-apps/create-parameters-workflows
- Microsoft Learn: Edit app and host settings for Standard Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/edit-app-settings-host-settings

## Issues Found
- The post used older PascalCase email and attachment payload properties with the current Office 365 Outlook V3 trigger. Updated examples to use the Graph-style V3 properties such as `attachments`, `contentType`, `contentBytes`, `name`, `body`, `subject`, `from`, `receivedDateTime`, and `id`.
- The trigger examples did not account for the connector trigger response being wrapped in a `value` array. Added `splitOn` so each email is processed as an individual workflow run.
- The HTTP action examples used `@appsetting()` directly in workflow action inputs. Replaced these with `parameters()` expressions, which are the appropriate workflow-level references for configurable URLs.
- The Forward email example used non-current body parameter names. Updated the request body to use `ToRecipients` and `message_id` for the Office 365 Outlook connector action.
- The Move email examples used `DestinationId`, which does not match the connector's documented `folderPath` parameter. Updated the examples to use `folderPath` and URL-encode the message ID in the path.
- The large attachment section described the limit as simply "about 50 MB for the entire email" and used a non-documented attachment listing path before downloading content. Updated the explanation to match the documented Exchange-admin-or-50-MB behavior and revised the example to use trigger attachment metadata with the Get Attachment (V2) operation by ID.
- The security section implied the Office 365 Outlook connector could use managed identity or service-principal authentication. Updated the wording to clarify that the connector signs in with Office 365 credentials and that managed identity applies to other Azure resources in the workflow.
- The body extraction section mentioned regex, but the example uses Logic Apps string expressions. Updated the wording to avoid implying native regex usage in the shown workflow expression.

## Review Notes
The JSON snippets are illustrative fragments rather than complete deployable workflow definitions because they omit full connection parameter declarations and surrounding workflow metadata. This is acceptable for the tutorial style, but a future update could include a complete ARM/Bicep or Standard Logic Apps workflow sample.
