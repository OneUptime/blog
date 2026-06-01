# Validation Summary: How to Handle Rate Limiting and Throttling in Azure OpenAI API Calls

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure OpenAI in Microsoft Foundry Models
- OpenAI Python SDK
- Python
- Tenacity
- Azure Monitor
- HTTP 429 rate-limit handling

## Sources Consulted
- Microsoft Learn: Azure OpenAI in Microsoft Foundry Models quotas and limits - https://learn.microsoft.com/en-gb/azure/foundry/openai/quotas-limits
- Microsoft Learn: Manage Azure OpenAI in Microsoft Foundry Models quota - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/quota
- Microsoft Learn: Azure OpenAI dynamic quota - https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/dynamic-quota
- OpenAI Python SDK README - https://github.com/openai/openai-python
- OpenAI Python SDK retry implementation - https://github.com/openai/openai-python/blob/main/src/openai/_base_client.py
- Tenacity API reference - https://tenacity.readthedocs.io/en/latest/api.html

## Issues Found
- The post described TPM as the total actual input and output tokens processed per minute. Updated it to state that Azure OpenAI rate limiting uses an estimated maximum processed-token count based on the prompt and settings such as `max_tokens`.
- The post said RPM is calculated as `TPM / 1000 * 6` for most models. Updated this because Microsoft documents that the RPM-to-TPM ratio varies by model; the 6 RPM per 1,000 TPM ratio applies to older chat models, not all current models.
- The post referred to Azure OpenAI Studio for deployment quota management. Updated this to Azure AI Foundry to match current Microsoft documentation.
- The post said 429 responses provide `Retry-After` in seconds. Updated the text and sample response to use Azure's documented `retry-after-ms` header in milliseconds.
- The Python retry examples used `getattr(e, 'retry_after', None)`, which is not the documented OpenAI Python SDK way to access response headers. Updated them to read `retry-after-ms` or `retry-after` from `e.response.headers`.
- The load-balancer code block used `time` and `openai` without importing them. Added the missing imports.
- Added a short note that custom Tenacity retry logic should be used with SDK retries disabled (`max_retries=0`) to avoid layered retries.

## Review Notes
The OpenAI Python SDK already retries 429 and transient errors by default with exponential backoff, and Microsoft recommends configuring the SDK retry behavior for most applications. Custom Tenacity retry logic is still valid when more control is needed, provided built-in retries are disabled to avoid unexpected retry multiplication.
