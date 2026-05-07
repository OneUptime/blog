# Validation Summary: How to Create Azure Logic Apps with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Azure Logic Apps Consumption
- Azure Logic Apps Standard
- Azure Resource Manager (`azurerm`) provider
- HCL

## Sources Consulted
- AzureRM provider docs: `azurerm_logic_app_workflow` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/logic_app_workflow.html.markdown
- AzureRM provider docs: `azurerm_logic_app_trigger_http_request` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/logic_app_trigger_http_request.html.markdown
- AzureRM provider docs: `azurerm_logic_app_action_http` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/logic_app_action_http.html.markdown
- AzureRM provider docs: `azurerm_logic_app_trigger_recurrence` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/logic_app_trigger_recurrence.html.markdown
- AzureRM provider docs: `azurerm_logic_app_standard` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/logic_app_standard.html.markdown
- Microsoft Learn: Create Standard logic app workflows with Visual Studio Code - https://learn.microsoft.com/en-us/azure/logic-apps/create-standard-workflows-visual-studio-code
- Microsoft Learn: DevOps deployment for Standard logic apps - https://learn.microsoft.com/en-us/azure/logic-apps/devops-deployment-single-tenant-azure-logic-apps
- OpenTofu docs: `init` - https://opentofu.org/docs/cli/init/
- OpenTofu docs: `plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The output used `azurerm_logic_app_workflow.order_notification.access_endpoint`, which is the workflow access endpoint, not the HTTP request trigger callback URL. Updated the output to use `azurerm_logic_app_trigger_http_request.order_trigger.callback_url`, which is the provider's documented trigger URL attribute.
- The action example was labeled as an Office 365 connector example, but it used `azurerm_logic_app_action_http`, which is a generic HTTP action. The snippet also referenced `variables('apiToken')` without defining that variable anywhere. Updated the example to a generic webhook notification action with a valid JSON payload and only the `Content-Type` header.
- The recurrence trigger was attached to the same Logic App workflow as the HTTP request example. That mixed unrelated trigger scenarios into one workflow example while the action example depended on request-body fields from the HTTP trigger. Split the recurrence example into its own `azurerm_logic_app_workflow` so the examples are internally consistent.
- The Standard section overstated what OpenTofu manages by implying that Standard workflow definitions are managed directly the same way as Consumption triggers and actions. Updated the text to reflect Azure's documented model: `azurerm_logic_app_standard` provisions the Standard resource and hosting infrastructure, while Standard workflows live in project `workflow.json` files and are deployed separately.

## Review Notes
- The deployment commands `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` are valid according to current OpenTofu CLI documentation.
- The `azurerm_logic_app_standard` example aligns with the current provider resource shape for a Windows Workflow Standard plan.
- The storage account name example assumes `var.environment` resolves to a lowercase alphanumeric suffix that still satisfies Azure storage account naming and uniqueness requirements.
- The local environment did not have the `tofu` binary installed, so CLI command validation was performed against official OpenTofu documentation rather than local `--help` output.
