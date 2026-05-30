# Validation Summary: How to Set Up Prompt Engineering Best Practices for Azure OpenAI GPT-4

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure OpenAI in Microsoft Foundry Models
- OpenAI Chat Completions API
- GPT-4 prompt engineering
- Python
- JSON mode and structured outputs
- PostgreSQL SQL examples

## Sources Consulted
- Microsoft Learn: Azure OpenAI prompt engineering techniques, https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering
- Microsoft Learn: System message design for Azure OpenAI, https://learn.microsoft.com/en-ca/azure/foundry/openai/concepts/advanced-prompt-engineering
- Microsoft Learn: Azure OpenAI Python v1.x migration guide, https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/migration
- Microsoft Learn: Azure OpenAI REST API reference, https://learn.microsoft.com/en-us/azure/foundry/openai/reference
- OpenAI API Reference: Chat Completions, https://developers.openai.com/api/reference/resources/chat
- OpenAI API Docs: Advanced usage, https://developers.openai.com/api/docs/guides/advanced-usage

## Issues Found
- The JSON parsing example used `json.loads(...)` without importing `json`. Added `import json` to make the code syntactically complete.
- The JSON output example relied only on prompt wording for valid JSON. Added `response_format={"type": "json_object"}` because Azure OpenAI supports JSON mode for compatible chat completion models and still requires instructing the model to produce JSON.
- The chat-message anatomy section implied every chat completion request has only three roles and that the system message is processed once. Updated the wording to say typical chat requests use roles such as system, user, and assistant, and that the system message should be included with each API request where those instructions should apply.
- The chain-of-thought explanation overstated that prompting "forces" intermediate reasoning tokens and "significantly" improves accuracy. Reworded it to a more accurate claim that step-by-step structure can help the model break down the task before answering.
- The parameter example said `temperature=0` is deterministic, set `top_p=0.95` while saying it is usually left at default, and listed frequency/presence penalties as `0-2`. Updated the comments to match Azure's documented behavior: lower temperature is more focused and more deterministic but determinism is not guaranteed, `top_p` defaults to `1`, and penalties accept values from `-2.0` to `2.0`.

## Review Notes
The examples use `model="gpt4-production"` as an Azure OpenAI deployment name, which is plausible because Azure's OpenAI Python client expects the deployment name in the `model` field. For stricter production JSON extraction, Structured Outputs with `json_schema` would be stronger than JSON mode when available for the chosen deployment.
