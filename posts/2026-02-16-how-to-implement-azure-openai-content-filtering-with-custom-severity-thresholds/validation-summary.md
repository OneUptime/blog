# Validation Summary: How to Implement Azure OpenAI Content Filtering with Custom Severity Thresholds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI in Azure AI Foundry
- Azure AI Foundry content filters and RAI policies
- Azure management REST APIs for Cognitive Services accounts
- OpenAI Python SDK with AzureOpenAI
- Python logging and datetime APIs

## Sources Consulted
- Microsoft Learn - Configure content filters for Azure OpenAI: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/how-to/content-filters
- Microsoft Learn - Azure OpenAI content filtering concepts: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter
- Microsoft Learn - Content filtering annotations: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter-annotations
- Microsoft Learn - Rai Policies Create Or Update REST API: https://learn.microsoft.com/en-us/rest/api/aifoundry/accountmanagement/rai-policies/create-or-update?view=rest-aifoundry-accountmanagement-2025-06-01
- Microsoft Learn - Microsoft.CognitiveServices/accounts/raiPolicies ARM reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.cognitiveservices/accounts/raipolicies
- Microsoft Learn - Microsoft.CognitiveServices/accounts/deployments ARM reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.cognitiveservices/accounts/deployments
- OpenAI Python SDK README - AzureOpenAI and error handling: https://github.com/openai/openai-python

## Issues Found
- The post referred to the older Azure OpenAI Studio URL and navigation. Updated prerequisites and portal steps to Azure AI Foundry and the current "Guardrails + controls" / "Models + endpoints" flow.
- The REST policy creation example used the Azure OpenAI data-plane endpoint, API-key authentication, `/openai/content-filters`, and a top-level policy body. Updated it to use the Azure Resource Manager endpoint, bearer authentication, the `raiPolicies` resource path, a `properties` wrapper, and the current management API shape.
- The RAI policy example used lower-case content filter names such as `hate` and `self_harm`. Updated them to the documented RAI policy names: `Hate`, `Violence`, `Sexual`, and `Selfharm`.
- The deployment assignment example used `properties.contentFilter.policyName`, which is not the documented deployment property. Updated it to `properties.raiPolicyName` and the Azure Resource Manager deployments endpoint.
- The examples only treated HTTP 200 as success for create/update operations. Updated them to accept both 200 and 201 responses.
- The "Allow all" threshold row omitted Microsoft approval requirements for disabling filters. Added the approval caveat.
- The additional protections snippet used undocumented object keys. Updated it to show documented `contentFilters` entries for `Jailbreak`, `Protected Material Text`, and `Protected Material Code`.
- The SDK error handling caught `APIError` and accessed `status_code`, but the documented OpenAI Python class with `status_code` is `APIStatusError`. Updated the example accordingly.
- The content filter result handling assumed attribute-style SDK objects only. Updated it to handle both dict-like Azure response data and SDK objects.
- The logging example used `datetime.utcnow()`, which is deprecated in current Python. Updated it to `datetime.now(timezone.utc)`.

## Review Notes
- The tutorial is technically relevant and contains implementation code, so it was reviewed as a code blog.
- Python code blocks were parsed with Python 3 after the fixes and all six Python snippets are syntactically valid.
- The examples still use placeholder credentials and management tokens; a production implementation should obtain the Azure management token through Azure Identity or another supported Microsoft Entra authentication flow.
