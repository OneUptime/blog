# Validation Summary: How to Create Azure Cognitive Services in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure AI Services / Cognitive Services
- Azure OpenAI
- Azure Virtual Network service endpoints
- Azure Key Vault
- Microsoft Entra ID managed identity authentication

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_cognitive_account` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cognitive_account
- HashiCorp Terraform Registry: `azurerm_cognitive_deployment` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/3.83.0/docs/resources/cognitive_deployment
- HashiCorp Terraform Registry: AzureRM provider features block documentation, https://registry.terraform.io/providers/hashicorp/azurerm/3.92.0/docs/guides/features-block
- HashiCorp AzureRM 4.0 upgrade guide, https://library.tf/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft Learn: Configure Foundry Tools virtual networks, https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-virtual-networks
- Microsoft Learn: Azure virtual network service endpoints, https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Microsoft Learn: Azure OpenAI model retirements, https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-retirements
- Microsoft Learn: Retired Azure OpenAI models, https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/legacy-models
- Microsoft Learn: Azure AI Translator text translation overview, https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation-overview
- Microsoft Learn: Translator REST quickstart, https://learn.microsoft.com/en-us/azure/ai-services/translator/quickstart-text-rest-api

## Issues Found
- The multi-service account example included comments implying that `custom_question_answering_search_service_id` accepts responsible AI terms. That argument is for Custom Question Answering on `TextAnalytics`, not for accepting general responsible AI terms. I replaced the misleading commented argument with a note that some services require first-time terms acceptance in the Azure portal.
- The Azure OpenAI deployment used `gpt-4` version `0613`, which is retired and no longer valid for new deployments. I changed the example to deploy `gpt-4.1` version `2025-04-14`, which is listed as a current GA model as of the reviewed documentation.
- The network security example set `public_network_access_enabled = false` while also configuring virtual network and IP firewall rules. For service endpoint and IP firewall access, the public endpoint should remain enabled and restricted with network ACLs; disabling public network access is for private endpoint-only access. I changed the example to keep public access enabled and restrict it with `network_acls`.
- The post used the former "Azure AD" name in authentication guidance. I updated those references to Microsoft Entra ID to match current Azure documentation terminology.

## Review Notes
- Terraform CLI is not installed in the workspace, so I could not run `terraform validate`. The HCL snippets were reviewed manually against the AzureRM provider documentation.
- The post pins AzureRM to `~> 3.80`. AzureRM 4.x is current and requires an explicit `subscription_id` or `ARM_SUBSCRIPTION_ID`; the 3.x examples remain consistent with the pinned provider version, but future updates should consider a full AzureRM 4.x refresh.
