# Validation Summary: How to Build a Retrieval Agent with LangChain Tools and Vertex AI Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Search
- Google Cloud Discovery Engine Python client
- LangChain agents and tools
- LangChain Google Vertex AI integration
- Gemini models on Vertex AI
- Python

## Sources Consulted
- LangChain Agents documentation: https://docs.langchain.com/oss/python/langchain/agents
- LangChain Tools documentation: https://docs.langchain.com/oss/python/langchain/tools
- LangChain RAG agent tutorial: https://docs.langchain.com/oss/python/langchain/rag
- LangChain `create_tool_calling_agent` API reference for legacy comparison: https://api.python.langchain.com/en/latest/agents/langchain.agents.tool_calling_agent.base.create_tool_calling_agent.html
- LangChain `ChatVertexAI` API reference: https://api.python.langchain.com/en/latest/google_vertexai/chat_models/langchain_google_vertexai.chat_models.ChatVertexAI.html
- Google Cloud Discovery Engine `DataStoreServiceClient` reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.services.data_store_service.DataStoreServiceClient
- Google Cloud Discovery Engine `SearchRequest` reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest
- Google Cloud Discovery Engine `Document` reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.Document
- Google Cloud Discovery Engine `Document.Content` reference: https://cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.Document.Content
- Vertex AI Search data store search sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-search
- Vertex AI Gemini model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- PyPI `langchain` package metadata: https://pypi.org/project/langchain/

## Issues Found
- The prerequisites listed Python 3.9+, but the current unpinned `langchain` package requires Python 3.10+. Updated the prerequisite to Python 3.10+.
- The Vertex AI Search client examples did not set regional API endpoints for `us` or `eu` data stores. Added `ClientOptions` handling while preserving the default `global` location behavior.
- The search tool did not expose a document ID even though the follow-up document tool required one. Added `Document ID` to formatted search results using `doc.id` or the final component of `doc.name`.
- The document-details tool read full content from `derived_struct_data["content"]`, but Discovery Engine documents store raw or linked unstructured content in `Document.content`. Updated the code to read `raw_bytes`, report a `uri`, or fall back to structured metadata.
- The agent code used the older `create_react_agent` and `AgentExecutor` pattern with a chat prompt that would not match current LangChain 1.x agent usage from the unpinned install command. Updated it to `create_agent` with `system_prompt`.
- The Gemini model was `gemini-1.5-pro`, whose stable Vertex AI versions are retired. Updated the example to `gemini-2.5-pro`.
- The LangChain invocation examples used legacy `input`, `chat_history`, `output`, and `intermediate_steps` fields. Updated them to the current `messages` state shape and showed tool-call inspection from returned messages.
- The multi-turn example manually appended chat history, while current LangChain agent persistence uses a checkpointer and `thread_id`. Updated the example to use `InMemorySaver` and a stable `thread_id`.
- The retry example invoked the decorated tool with a bare string. Updated it to pass `{"query": query}` for the structured tool input.

## Review Notes
The post is technically valid after the fixes. Future maintenance should watch the Vertex AI Gemini model lifecycle dates and LangChain major-version changes because both APIs evolve quickly.
