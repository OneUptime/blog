# Validation Summary: How to Use Azure OpenAI Assistants API with File Search and Code Interpreter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI Assistants API
- Azure OpenAI File Search
- Azure OpenAI Code Interpreter
- OpenAI Python SDK
- Python
- Vector stores

## Sources Consulted
- Microsoft Learn: Azure OpenAI Assistants API concepts - https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/assistants
- Microsoft Learn: Azure OpenAI Assistants file search tool - https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/file-search
- Microsoft Learn: Azure OpenAI Assistants Code Interpreter - https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/code-interpreter
- Microsoft Learn: Azure OpenAI supported languages and Python SDK installation guidance - https://learn.microsoft.com/en-us/azure/ai-services/openai/supported-languages
- OpenAI API documentation: Assistants File Search - https://developers.openai.com/api/docs/assistants/tools/file-search
- OpenAI API documentation: Assistants Code Interpreter - https://developers.openai.com/api/docs/assistants/tools/code-interpreter
- OpenAI API documentation: Assistants message annotations - https://developers.openai.com/api/docs/assistants/deep-dive#message-annotations

## Issues Found
- The post did not mention that Azure OpenAI Assistants API is deprecated and scheduled for retirement on August 26, 2026. Added a short note near the introduction and pointed new production workloads to Microsoft Foundry Agents, matching Microsoft Learn guidance.
- The prerequisites said `openai` version 1.12+ was sufficient. That version predates current File Search/vector store helper usage, so the prerequisite and install command now recommend installing the current upgraded `openai` package.
- The assistant creation example used `model="gpt-4o"` without clarifying Azure deployment-name semantics. Updated the example to use a deployment-name placeholder and a comment because Azure OpenAI requires the `model` parameter to be the model deployment name.
- The vector store example said it waited for indexing but only printed the initial vector store status. Updated it to use `client.beta.vector_stores.file_batches.create_and_poll(...)`, which matches official SDK guidance for ensuring file ingestion is complete.
- The cost section listed fixed OpenAI-style storage prices for both uploaded files and vector stores. Replaced those bullets with Azure-accurate wording: File Search storage is billed based on vector store size, and Code Interpreter sessions have additional session charges beyond token fees.

## Review Notes
The Python code blocks were checked locally for syntax with `ast.parse` and all seven parsed successfully. The examples were not executed against Azure because no Azure OpenAI endpoint, deployment, API key, or sample files are available in this workspace.
