# Validation Summary: How to Build a Multi-Tool Agent with Vertex AI Agent Builder and Custom APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI extensions
- Gemini models on Vertex AI
- LangChain
- langchain-google-vertexai
- OpenAPI 3.0
- Cloud Run service-to-service authentication
- Python

## Sources Consulted
- Google Cloud Vertex AI extensions documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/extensions/create-extension
- Google Cloud Gemini 2.5 Pro model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro
- Google Cloud Cloud Run service-to-service authentication documentation: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- LangChain `create_tool_calling_agent` API reference: https://api.python.langchain.com/en/latest/agents/langchain.agents.tool_calling_agent.base.create_tool_calling_agent.html
- LangChain `ChatVertexAI` reference: https://reference.langchain.com/python/langchain-google-vertexai/chat_models/ChatVertexAI

## Issues Found
- The install command omitted packages used by the examples. I updated it to include `langchain`, `requests`, and `google-auth` along with `langchain-google-vertexai`.
- The post implied the later LangChain sample directly used the OpenAPI specs as Vertex AI Agent Builder tools. I clarified that OpenAPI specs apply when registering Vertex AI extensions, while the LangChain sample mirrors those operations as Python `@tool` functions.
- The LangChain example used `create_react_agent` with a chat prompt structured for tool-calling. I changed it to `create_tool_calling_agent`, which matches the prompt shape and chat-model tool-calling flow.
- The model ID used `gemini-1.5-pro`, which is outdated for a 2026 tutorial. I updated it to the currently documented `gemini-2.5-pro` model ID.
- The Cloud Run authenticated request helper used the full request URL as the token audience. I changed the example to use the Cloud Run service origin as the audience, matching Google Cloud guidance.

## Review Notes
All Python code blocks were checked with `python3` AST parsing after edits. The OpenAPI snippets are valid Python dictionary literals and align with OpenAPI 3.0 structure, but a production Vertex AI extension import would still need an extension import request with `apiSpec` and `authConfig`.
