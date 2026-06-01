# Validation Summary: How to Deploy GPT-4 Model in Azure OpenAI Service Using the Azure Portal

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure OpenAI in Microsoft Foundry / Azure AI Foundry
- Azure Portal
- GPT-4.1 model deployments
- OpenAI Python SDK
- Azure OpenAI Chat Completions API
- Azure Private Link
- Azure Managed Identity / Microsoft Entra ID
- Azure Monitor diagnostic settings and Log Analytics

## Sources Consulted
- Microsoft Learn: Create and deploy an Azure OpenAI in Azure AI Foundry Models resource: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/create-resource?pivots=web-portal
- Microsoft Learn: Azure OpenAI in Microsoft Foundry Models REST API reference: https://learn.microsoft.com/en-us/azure/foundry/openai/reference
- Microsoft Learn: Work with chat completion models: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/chatgpt
- Microsoft Learn: Azure OpenAI model deprecations and retirements: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements
- Microsoft Learn: Manage Azure OpenAI quota: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/quota
- Microsoft Learn: Azure OpenAI quotas and limits: https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits
- Microsoft Learn: Azure OpenAI supported programming languages and authentication: https://learn.microsoft.com/en-us/azure/foundry/openai/supported-languages
- OpenAI developer/cookbook documentation for Azure OpenAI SDK authentication patterns: https://developers.openai.com/cookbook/examples/azure/chat_with_your_own_data

## Issues Found
- The post centered on legacy `gpt-4`, `gpt-4-32k`, and `gpt-4-turbo` deployment guidance. I updated the tutorial to use `gpt-4.1` and current alternatives such as `gpt-4.1-mini` / `gpt-4o`, because Microsoft lifecycle documentation now treats older GPT-4-era models as deprecated or retired while GPT-4.1-class models are current for Azure OpenAI deployments.
- The post stated that Azure OpenAI broadly requires an access application. I changed this to say that subscription access is required and that some models or modified content filtering features are limited access, matching current Microsoft Learn guidance.
- The post referenced Azure OpenAI Studio and `oai.azure.com`. I updated these references to Azure AI Foundry and `ai.azure.com`, which matches the current portal workflow in Microsoft documentation.
- The post gave fixed example regions for GPT-4. I replaced the region examples with guidance to choose a region that supports the target model and deployment type, because model availability varies by region and deployment type.
- The Python sample used API version `2024-02-01` and called it the latest stable API version. I updated the sample to `2024-10-21`, the GA data plane inference API version documented in the current Azure OpenAI REST reference.
- The deployment name examples still used `gpt4-*` names after the model update. I changed them to `gpt41-*` names for consistency.
- The temperature comment said `0 = deterministic`. I changed it to lower temperature equals more focused and higher temperature equals more creative, since deterministic behavior is not guaranteed by temperature alone.
- The cost guidance recommended `GPT-3.5-turbo`, which is no longer a good current recommendation in Azure OpenAI documentation. I updated it to recommend a smaller current model such as GPT-4.1 mini for simpler tasks.

## Review Notes
The Chat Completions API sample remains technically valid, and the post correctly notes that Azure OpenAI API calls use the deployment name. Microsoft now also documents the Responses API for newer capabilities, so a future refresh could add a note about choosing Responses API for new application features, but that was outside the scope of this narrow correctness fix.
