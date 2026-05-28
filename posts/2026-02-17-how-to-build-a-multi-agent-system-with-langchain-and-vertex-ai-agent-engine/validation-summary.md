# Validation Summary: How to Build a Multi-Agent System with LangChain and Vertex AI Agent Engine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Google Cloud Vertex AI Agent Engine
- Vertex AI SDK for Python
- LangChain
- LangChain Google Vertex AI integration
- Gemini models on Vertex AI

## Sources Consulted
- LangChain agents documentation: https://docs.langchain.com/oss/python/langchain/agents
- LangChain overview and `create_agent` example: https://docs.langchain.com/oss/python/langchain/overview
- LangChain `create_agent` API reference: https://reference.langchain.com/python/langchain/agents/factory/create_agent
- LangChain callback handler reference: https://reference.langchain.com/python/langchain-core/callbacks/base/BaseCallbackHandler
- LangChain Google Vertex AI `ChatVertexAI` reference: https://api.python.langchain.com/en/latest/google_vertexai/chat_models/langchain_google_vertexai.chat_models.ChatVertexAI.html
- Google Cloud Agent Engine setup documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/set-up
- Google Cloud custom Agent Engine development documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/develop/custom
- Google Cloud Agent Engine LangChain usage documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/use/langchain
- Google Cloud Gemini model lifecycle documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Google Cloud Gemini 3.5 Flash model documentation: https://cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash

## Issues Found
- The post used `create_react_agent` and `AgentExecutor` from the older LangChain agent API. Current LangChain documentation recommends `create_agent`, which accepts a model, tools, and `system_prompt`, and uses message-based invocation. Updated the research, action, router, execution, error handling, and callback examples accordingly.
- The original ReAct prompt examples omitted required ReAct prompt variables such as `tools` and `tool_names`, so they would not work as written with the older API. Replacing them with `create_agent` removed the invalid prompt construction.
- The post used `gemini-1.5-pro`, which is retired in Vertex AI model lifecycle documentation. Updated model IDs to `gemini-3.5-flash`, a GA model listed in current Google Cloud documentation.
- The prerequisites listed Python 3.9+. Current LangChain documentation requires Python 3.10+, so the prerequisite was corrected.
- The install command installed plain `google-cloud-aiplatform` but omitted the Agent Engine and LangChain extras recommended by Google Cloud. Updated the command to install `google-cloud-aiplatform[agent_engines,langchain]>=1.112.0`.
- The Agent Engine deployment example used `google.cloud.aiplatform.init()` and initialized runtime objects in `__init__`. Current Google Cloud documentation uses `vertexai.Client(...)` for Agent Engine service interactions and recommends keeping constructors pickleable while doing runtime initialization in `set_up()`. Updated the deployment snippet and added `client.agent_engines.create(...)`.

## Review Notes
The snippets are still illustrative and use placeholder project IDs plus mock tools. They are syntactically valid, but a production deployment should keep all runtime initialization inside the deployable class's `set_up()` method.
