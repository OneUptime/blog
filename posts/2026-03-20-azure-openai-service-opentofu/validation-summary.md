# Validation Summary: How to Create Azure OpenAI Service with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm` provider)
- Azure OpenAI / Azure Cognitive Services
- Azure Private Endpoint
- Azure RBAC
- HCL

## Sources Consulted
- AzureRM provider: `azurerm_cognitive_account` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cognitive_account
- AzureRM provider: `azurerm_cognitive_deployment` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cognitive_deployment
- AzureRM provider: `azurerm_private_endpoint` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- Azure OpenAI model availability - https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
- Azure OpenAI model retirements - https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/model-retirements
- Azure OpenAI RBAC guidance - https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/role-based-access-control
- Azure OpenAI private networking guidance - https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/network
- OpenTofu CLI `plan` command - https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The deployment examples used the older `scale` block on `azurerm_cognitive_deployment`. I changed each deployment to use the current `sku` block because the current AzureRM provider documentation defines `sku` as the required configuration shape.
- The post deployed `gpt-35-turbo`, which Microsoft documents as retired on November 14, 2025. I replaced that example with `gpt-4o-mini` and updated the surrounding description text so the tutorial no longer points readers at a retired model.
- The examples pinned model versions that would go stale or were already outdated for a general-purpose tutorial. I removed the explicit `version` fields so Azure can assign the current default version available in the target region, which matches the current provider behavior.
- The variable declarations mixed multiple attributes onto single-line HCL blocks, which is not valid HCL for those examples. I rewrote the variable blocks in standard multiline form so the configuration snippets parse correctly.
- Two inline comments were imprecise: one implied that `custom_subdomain_name` itself restricted network access, and another described the assigned RBAC role too loosely. I corrected both comments to match the actual Azure behavior and role name.

## Review Notes
- Model names, versions, and availability vary by Azure region and quota. The current AzureRM provider documentation notes that available model values can be checked with `az cognitiveservices account list-models`.
- The private endpoint snippet is valid for creating the endpoint itself. In a full production setup, Azure private DNS configuration is typically also required for end-to-end private name resolution.
