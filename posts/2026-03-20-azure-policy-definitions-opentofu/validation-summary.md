# Validation Summary: How to Create Azure Policy Definitions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Policy
- OpenTofu
- HCL
- AzureRM provider
- Azure Resource Manager policy assignments

## Sources Consulted
- Azure Policy definition structure basics: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Azure Policy definition structure policy rule: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Azure Policy pattern: tags: https://learn.microsoft.com/en-us/azure/governance/policy/samples/pattern-tags
- Azure Policy definitions modify effect: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-modify
- Remediate non-compliant resources: https://learn.microsoft.com/en-us/azure/governance/policy/how-to/remediate-resources
- Tutorial: Create a custom policy definition: https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-custom-policy-definition
- AzureRM provider docs for `azurerm_policy_definition`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/policy_definition.html.markdown
- AzureRM provider docs for `azurerm_resource_group_policy_assignment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/resource_group_policy_assignment.html.markdown

## Issues Found
- The Step 1 tag policy used `mode = "All"` while targeting resource tags. I changed it to `Indexed`, which Microsoft recommends for tag and location policies that target resources instead of resource groups or subscriptions.
- The Step 1 deny rule used `allOf` with missing-tag checks, which only denied resources when both tags were missing. I changed it to a `count` expression over the `requiredTags` parameter so any missing required tag triggers `deny`, and the parameter is now actually used by the rule.
- The Step 1 `requiredTags` default included `Owner`, but the description and assignment example only required `Environment` and `CostCenter`. I aligned the default value with the rest of the post.
- The Step 2 HTTPS audit rule checked `supportsHttpsTrafficOnly` with `equals = "false"`. I changed it to `notEquals = "true"` to match Microsoft's documented custom policy pattern for storage accounts and to catch non-compliant states consistently.
- The Step 3 heading/comment and final summary implied that a `modify` policy definition alone auto-remediates existing resources. I corrected the wording to reflect Azure Policy behavior: `modify` updates matching resources during create or update, and existing resources require remediation tasks after assignment.

## Review Notes
- `modify` policies that remediate existing resources require a managed identity on the policy assignment and the roles listed in `roleDefinitionIds`. The post's assignment example targets the `deny` policy, so no assignment identity block was needed there.
