# Validation Summary: How to Set Up Azure Policy Initiatives with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Policy
- Azure Policy initiatives (policy set definitions)
- OpenTofu / HCL
- HashiCorp AzureRM provider
- Azure Storage account governance

## Sources Consulted
- Azure Policy initiative definition structure — https://learn.microsoft.com/en-us/azure/governance/policy/concepts/initiative-definition-structure
- Tutorial: Build policies to enforce compliance — https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-and-manage
- Tutorial: Create a custom policy definition — https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-custom-policy-definition
- Enforce a minimum required version of Transport Layer Security (TLS) for requests to a storage account — https://learn.microsoft.com/en-us/azure/storage/common/transport-layer-security-configure-minimum-version
- AzureRM provider docs: `azurerm_policy_definition` — https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/policy_definition.html.markdown
- AzureRM provider docs: `azurerm_policy_set_definition` — https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/policy_set_definition.html.markdown
- AzureRM provider docs: `azurerm_subscription_policy_assignment` — https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/subscription_policy_assignment.html.markdown
- Azure built-in policy source: Secure transfer to storage accounts should be enabled — https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Storage/Storage_AuditForHTTPSEnabled_Audit.json
- Azure built-in policy source: Storage account public access should be disallowed — https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Storage/ASC_Storage_DisallowPublicBlobAccess_Audit.json

## Issues Found

1. **The built-in policy ID in the storage initiative did not match the policy being described.** The post labeled the reference as storage public access, but the ID `404c3081-a854-4457-ae30-26a93ef643f9` is actually Microsoft’s built-in policy for secure transfer over HTTPS. I replaced it with `4fa4b6c0-31ca-4c0d-b10d-24b96f62a751`, which is the built-in policy for disallowing storage account public access.

2. **The custom TLS 1.2 policy did not handle unset `minimumTlsVersion` values.** Microsoft’s storage guidance for a deny policy includes both `notEquals = "TLS1_2"` and an `exists = "false"` check, because an unset property does not satisfy the intended minimum-TLS requirement. I updated the policy rule to include the missing existence check.

3. **The custom HTTPS policy rule was weaker than Microsoft’s standard custom-policy pattern.** The post checked only for `equals = "false"`, while Microsoft’s custom-policy tutorial uses a deny condition based on the property not being `true`. I updated the rule to `notEquals = "true"` so it matches the documented pattern more closely.

4. **The assignment example was not self-contained.** It referenced `data.azurerm_subscription.current.id` without defining the `azurerm_subscription` data source. I added the missing data source declaration so the snippet can work as shown.

## Review Notes
- The post now validates technically, but the built-in policy references are still unpinned. The current AzureRM provider supports specifying a `version` inside `policy_definition_reference`; without it, built-in policy behavior can change as Microsoft revs major versions over time.
- The assignment example includes a managed identity and `location`, which is valid. However, for initiatives composed only of `deny` or `audit` policies, that identity is not required unless you later add `modify` or `deployIfNotExists` policies.
