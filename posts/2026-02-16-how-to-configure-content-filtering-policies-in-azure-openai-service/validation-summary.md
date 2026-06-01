# Validation Summary: How to Configure Content Filtering Policies in Azure OpenAI Service

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure OpenAI Service / Azure OpenAI in Microsoft Foundry Models
- Azure AI Foundry content filters and guardrails
- OpenAI Python SDK for Azure OpenAI chat completions
- Azure Monitor and Log Analytics KQL
- OpenAI Moderations API comparison

## Sources Consulted
- Microsoft Learn: Azure OpenAI content filtering concepts - https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/content-filter
- Microsoft Learn: Configure content filters - https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/content-filters
- Microsoft Learn: Azure AI Foundry content filtering - https://learn.microsoft.com/en-us/azure/ai-studio/concepts/content-filtering
- Microsoft Learn: Work with chat completion models - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/chatgpt
- Microsoft Learn: Guardrail annotations - https://learn.microsoft.com/en-us/azure/foundry-classic/openai/concepts/content-filter-annotations
- Microsoft Learn: Monitor Azure OpenAI - https://learn.microsoft.com/en-gb/azure/foundry-classic/openai/how-to/monitor-openai
- Microsoft Learn: Azure Monitor diagnostic settings - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- OpenAI OpenAPI specification: `/v1/moderations` endpoint - https://api.openai.com/v1/moderations

## Issues Found
- The post stated that blocked content always returns a 400 error. I changed this to distinguish prompt filtering, which returns a 400 `content_filter` error, from completion filtering, which can return a successful response with `finish_reason` set to `content_filter`.
- The portal instructions referenced Azure OpenAI Studio at `oai.azure.com`. I updated them to use Azure AI Foundry at `ai.azure.com`, with the current "Guardrails + controls", "Content filters", and "Models + endpoints" navigation.
- The filter threshold list described only "Off" as the nonblocking option. I updated it to mention "Annotate only" and "No filters", both of which require approval for Azure OpenAI resources.
- The protected material description covered only copyrighted text. I updated it to include protected text and code, matching the current Microsoft documentation.
- The groundedness description omitted current constraints. I clarified that groundedness detection applies to supported streaming RAG scenarios.
- The Python handling example only caught `BadRequestError`. I added a `finish_reason == "content_filter"` check for filtered model output.
- The filter inspection example assumed `content_filter_results` is always a plain dictionary. I added a `model_dump()` guard so the example also works when the SDK returns a Pydantic model-like object.
- The monitoring section claimed Azure Monitor exposes a `ContentFilter` category with `resultType_s` and `filterCategory_s` fields. I replaced the fabricated schema-specific query with a conservative AzureDiagnostics query that inspects request logs for 400 responses or `content_filter` markers.

## Review Notes
The example uses the older Azure-specific `AzureOpenAI` client shape with an explicit `api_version`, which is still recognizable and compatible with OpenAI Python 1.x, although current Microsoft examples increasingly show the unified OpenAI client with `base_url` ending in `/openai/v1/`. Future updates could modernize the sample, but it is not technically incorrect.
