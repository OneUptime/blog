# Validation Summary: How to Use Azure OpenAI Function Calling to Build Tool-Using AI Agents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI
- OpenAI Python SDK
- Chat Completions API
- Function calling / tool calling
- JSON Schema
- Python
- asyncio

## Sources Consulted
- Microsoft Learn: How to use function calling with Azure OpenAI in Azure AI Foundry Models - https://learn.microsoft.com/azure/ai-services/openai/how-to/function-calling
- Microsoft Learn: Azure OpenAI in Azure AI Foundry Models REST API reference - https://learn.microsoft.com/en-us/azure/ai-services/openai/reference
- OpenAI API docs: Function calling - https://platform.openai.com/docs/guides/function-calling
- OpenAI API reference: Chat Completions - https://platform.openai.com/docs/api-reference/chat/create-chat-completion
- OpenAI Python SDK: Azure OpenAI usage - https://github.com/openai/openai-python

## Issues Found
- The parallel tool execution example said to use `asyncio.gather`, but the code awaited executor tasks one by one after scheduling them. The code was updated to use `asyncio.get_running_loop()` and `asyncio.gather()` explicitly.
- The best-practices section said models work best with "10-20 tools." OpenAI's current guidance is to keep the number of functions small and aim for fewer than 20 at one time, so the wording was corrected.

## Review Notes
The Azure OpenAI Chat Completions examples use the current `tools`, `tool_choice`, `tool_calls`, and `role: "tool"` pattern. The post intentionally uses placeholder Azure endpoint, API key, and deployment values; readers must replace those with their own Azure OpenAI resource details.
