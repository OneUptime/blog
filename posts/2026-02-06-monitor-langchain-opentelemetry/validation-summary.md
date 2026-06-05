# Validation Summary: How to Monitor LangChain Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- LangChain Python
- LangChain callbacks and LCEL runnables
- LangChain OpenAI integration
- Chroma vector store integration
- OpenTelemetry Python tracing and metrics
- OTLP exporters
- FastAPI OpenTelemetry instrumentation
- Python

## Sources Consulted
- LangChain Python callbacks reference: https://reference.langchain.com/python/langchain-core/callbacks/base/
- LangChain `on_chat_model_start` callback reference: https://reference.langchain.com/python/langchain-core/callbacks/base/AsyncCallbackHandler/on_chat_model_start
- LangChain ChatPromptTemplate reference: https://reference.langchain.com/python/langchain-core/prompts/chat/ChatPromptTemplate
- LangChain agents documentation: https://docs.langchain.com/oss/python/langchain/agents
- LangChain Chroma integration documentation: https://docs.langchain.com/oss/python/integrations/vectorstores/chroma
- LangChain `create_agent` reference: https://reference.langchain.com/python/langchain/agents/factory/create_agent
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python span status API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model.md

## Issues Found
- The callback handler used `langchain.callbacks.base.BaseCallbackHandler`, while current LangChain callback APIs are documented under `langchain_core.callbacks`. Updated the import to `from langchain_core.callbacks import BaseCallbackHandler`.
- The handler only implemented `on_llm_start`, but LangChain calls `on_chat_model_start` for chat models such as `ChatOpenAI`. Added an explicit `on_chat_model_start` implementation with the documented signature.
- The handler created spans with `tracer.start_span()` but did not use `parent_run_id` to set parent contexts. That meant nested chain, retriever, tool, and model spans would not reliably match the trace trees shown in the article. Added parent span lookup using `parent_run_id` and `trace.set_span_in_context(...)`.
- Error callbacks popped spans but left timer entries behind. Centralized span completion so successful and error paths both clean up span and timer state.
- The installation commands omitted packages required by later examples: `langchain-chroma`, `fastapi`, and `opentelemetry-instrumentation-fastapi`. Updated the install commands.
- The examples used older LangChain import paths for prompts and output parsers. Updated them to `langchain_core.prompts` and `langchain_core.output_parsers`.
- The RAG example used the legacy `RetrievalQA` chain and imported Chroma from `langchain_community.vectorstores`. Replaced it with a current LCEL RAG chain and `from langchain_chroma import Chroma`.
- The agent example used `AgentExecutor` and `create_openai_tools_agent`. Updated it to the current `create_agent` API shown in LangChain v1 documentation.
- The OpenAI examples used `gpt-4`. Updated the model strings to `gpt-5.5` based on current official OpenAI model guidance.
- The diagrams and trace tree still referenced `RetrievalQA` and `StuffDocumentsChain`. Updated them to match the LCEL RAG example and the corrected chat model span naming.

## Review Notes
The Python code blocks were syntax-checked with `ast.parse`. Runtime execution was not performed because the workspace does not have LangChain or OpenTelemetry packages installed. The custom callback handler is suitable for explaining manual instrumentation, but production systems should also consider concurrency behavior if the same handler instance is shared across simultaneous requests.
