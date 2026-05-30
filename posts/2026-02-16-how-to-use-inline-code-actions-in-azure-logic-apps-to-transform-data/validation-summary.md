# Validation Summary: How to Use Inline Code Actions in Azure Logic Apps to Transform Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Logic Apps
- Inline Code action / Execute JavaScript Code action
- JavaScript
- Azure CLI
- Azure Integration Accounts
- Azure Functions

## Sources Consulted
- Microsoft Learn: Add and run JavaScript code inline with workflows for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/add-run-javascript
- Microsoft Learn: Limits and configuration reference guide for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-limits-and-config
- Microsoft Learn: Azure CLI `az logic integration-account` reference - https://learn.microsoft.com/en-us/cli/azure/logic/integration-account
- Microsoft Learn: Azure CLI `az logic workflow` reference - https://learn.microsoft.com/en-us/cli/azure/logic/workflow
- Microsoft Learn: Quickstart: Create and manage workflows with Azure CLI in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/quickstart-logic-apps-azure-cli
- Microsoft Learn: Create and manage integration accounts for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/enterprise-integration/create-integration-account

## Issues Found
- The prerequisites said all inline code actions require a linked Integration Account. Microsoft documentation says this requirement applies to Consumption workflows, while Standard workflows do not require an Integration Account for inline code. Updated the prerequisite text to distinguish Consumption from Standard.
- The Azure CLI example used `az logic workflow update --integration-account`, but the current `az logic workflow update` reference does not include an `--integration-account` option. Updated the example to use `az logic workflow create` with `--definition`, `--location`, and `--integration-account`, matching the Azure CLI workflow documentation for creating or updating a Consumption workflow from a definition file.
- The limitations said npm packages are unavailable but implied built-in Node.js modules could be imported. Microsoft documentation says the Inline Code action does not support `require()`. Updated the text to say npm packages and `require()` are unsupported.
- The execution timeout was described as "usually around 5 seconds." Microsoft's limits specify 5 seconds for Consumption workflows and 15 seconds for Standard workflows. Updated the timeout text in both places.
- Example 1 parsed the sample shipping address incorrectly, producing `street: "123 Main St, Springfield"`, an empty state, and `zip: "Springfield"` for the shown input. Updated the address parsing so the example returns the destination JSON shown in the article.
- The trigger access example used `workflowContext.trigger().outputs.body`, but the `workflowContext` object exposes `trigger` as an object, not a function. Updated it to `workflowContext.trigger.outputs.body`.
- Example 2 could calculate `NaN` when an item had a missing or nonnumeric quantity or price, even though the validation logic was intended to report invalid values. Updated the total calculation to coerce invalid values to zero.

## Review Notes
- The JavaScript snippets were syntax checked with Node.js by wrapping each inline code block in a function body, matching the way Logic Apps asks authors to write code without a method signature.
- Azure CLI was not installed locally, so CLI command validation was performed against Microsoft Learn command references.
