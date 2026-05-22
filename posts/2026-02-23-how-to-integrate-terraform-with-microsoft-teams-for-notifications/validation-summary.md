# Validation Summary: How to Integrate Terraform with Microsoft Teams for Notifications

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Terraform language
- Terraform provisioners
- HCP Terraform / Terraform Enterprise notification configurations
- HashiCorp TFE Terraform provider
- Microsoft Teams Incoming Webhooks and Workflows
- Microsoft Teams Message Cards and Adaptive Cards
- Power Automate HTTP triggers
- Azure DevOps YAML pipelines
- Bash and curl

## Sources Consulted
- Microsoft Teams Incoming Webhooks documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Teams Microsoft 365 connectors deprecation and management documentation: https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors
- Microsoft Teams card type reference: https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference
- Microsoft Teams actionable messages / Adaptive Cards through Incoming Webhooks: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp null provider `null_resource` documentation: https://github.com/hashicorp/terraform-provider-null/blob/main/docs/resources/resource.md
- HashiCorp TFE provider `tfe_notification_configuration` documentation: https://github.com/hashicorp/terraform-provider-tfe/blob/main/website/docs/r/notification_configuration.html.markdown
- HashiCorp TFE provider `tfe_workspace` documentation: https://github.com/hashicorp/terraform-provider-tfe/blob/main/website/docs/r/workspace.html.markdown
- HCP Terraform workspace notification configurations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- Azure Pipelines YAML steps schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps

## Issues Found
- The post presented classic Teams Incoming Webhook connectors as the default setup path. Microsoft documentation now states that Microsoft 365 Connectors are nearing deprecation and recommends Teams Workflows for new webhook setups. Updated the setup guidance to prefer Teams Workflows and describe classic connectors as existing-setup usage.
- The Terraform examples used `null_resource` for provisioner-only actions. The official null provider documentation recommends `terraform_data` for Terraform 1.4 and later. Updated the examples to use `terraform_data` with `triggers_replace`.
- The HCP Terraform notification example used `url`, which stores the webhook URL in Terraform state. The current TFE provider recommends `url_wo` as a write-only alternative for Terraform 1.11 and later. Updated the prerequisite and the example accordingly.
- The Adaptive Card example used schema version `1.4`. Microsoft Teams mobile support is documented up to Adaptive Card version `1.2`, so the example now uses version `1.2` for broader Teams client compatibility.
- The custom MessageCard script included a `potentialAction` button. Microsoft notes that Teams Workflows support Message Card format but do not support button rendering, so the button was removed to keep the payload compatible with the recommended Teams Workflows path.
- The Azure DevOps example used `TerraformCLI@0` and `IncomingWebhook@1`, which are not built-in Azure Pipelines tasks. Replaced the snippet with built-in `script` steps that call `terraform` and `curl` directly, and noted that Terraform must be installed on the build agent first.
- Updated "Terraform Cloud" wording to "HCP Terraform" where the post discussed current HashiCorp-hosted Terraform notifications.

## Review Notes
The remaining direct JSON-in-shell examples are valid for simple values, but production scripts should JSON-escape user-controlled values such as environment names, status details, and initiator names. For larger payloads, Teams Incoming Webhooks have a documented 28 KB message size limit and rate limits, so plan summaries should be concise.
