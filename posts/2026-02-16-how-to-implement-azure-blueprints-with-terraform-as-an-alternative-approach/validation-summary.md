# Validation Summary: How to Implement Azure Blueprints with Terraform as an Alternative Approach

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Blueprints
- Terraform
- AzureRM Terraform provider
- AzAPI Terraform provider
- Azure Policy
- Azure RBAC
- Azure Resource Manager tags
- Azure CLI
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Azure Blueprints deprecation notice and migration guidance - https://learn.microsoft.com/en-us/azure/governance/blueprints/how-to/update-existing-assignments
- Terraform Registry: AzureRM provider latest version - https://registry.terraform.io/providers/hashicorp/azurerm/latest
- Terraform Registry: `azurerm_subscription_policy_assignment` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription_policy_assignment
- Terraform Registry: `azurerm_role_assignment` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Microsoft Learn: Azure Policy built-in "Allowed locations" example - https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-and-manage
- Microsoft Learn: Policy set definitions REST API, including Microsoft cloud security benchmark policy set ID - https://learn.microsoft.com/en-us/rest/api/policy/policy-set-definitions/list
- Microsoft Learn: `Microsoft.Resources/tags` ARM/Bicep/Terraform AzAPI reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.resources/2024-07-01/tags
- Microsoft Learn: Tags update/list behavior for resources, resource groups, and subscriptions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources-cli
- Terraform CLI docs: `terraform init` working-directory requirement - https://developer.hashicorp.com/terraform/cli/init
- HashiCorp Developer: AzureRM backend - https://developer.hashicorp.com/terraform/language/settings/backends/azurerm
- GitHub Docs: workflow artifacts with `upload-artifact` and `download-artifact` - https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts

## Issues Found
- Azure Blueprints lifecycle wording was imprecise. Updated it to state that Azure Blueprints (Preview) will be deprecated on July 11, 2026, and that Microsoft recommends Template Specs and Deployment Stacks for migration.
- The Terraform provider pin used AzureRM `~> 3.0`, while the current provider line is 4.x. Updated the example to AzureRM `~> 4.0` and added the AzAPI provider needed by the corrected subscription tagging example.
- The Azure Policy assignment used `enforcement_mode`, which is not the current AzureRM argument for `azurerm_subscription_policy_assignment`. Replaced it with `enforce = var.environment == "production"`.
- The tag policy comment claimed it applied to all resources, but the policy ID shown is for requiring tags on resource groups. Updated the comment to match the policy definition.
- The public IP policy assignment used the "Not allowed resource types" built-in policy ID without providing the required `listOfResourceTypesNotAllowed` parameter. Added the parameter with `Microsoft.Network/publicIPAddresses`.
- The "Enable Azure Defender" example assigned the Microsoft cloud security benchmark initiative, which does not by itself enable Defender plans for all resource types. Renamed the resource, display name, and comment to describe the actual policy set assignment.
- The post used nonexistent `azurerm_subscription_tag` resources. Replaced them with the documented `Microsoft.Resources/tags` resource via the AzAPI provider.
- The tracking tag example used `timestamp()`, which would create a changing value on every Terraform plan. Replaced it with explicit `landing_zone_version` and `landing_zone_applied_at` input values.
- The pipeline ran Terraform from `azure-landing-zone/environments/production`, but the shown root module and module paths are under `azure-landing-zone`. Updated the workflow to run from `azure-landing-zone` and pass `-var-file=environments/production/terraform.tfvars`.
- The apply job downloaded the plan but did not run `terraform init`. Added an init step in the apply job, and added Azure authentication environment variables to init steps so the AzureRM backend can authenticate.
- Updated "Azure AD" wording to "Microsoft Entra ID" for current terminology.

## Review Notes
The examples are still illustrative and omit supporting `variables.tf` definitions plus the internals of the networking and monitoring modules. For a production-ready post, those could be added later, but the reviewed snippets now align with the documented APIs and current provider behavior.
