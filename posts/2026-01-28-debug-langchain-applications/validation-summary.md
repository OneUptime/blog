# Validation Summary: How to Debug LangChain Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LangChain (Python)
- LangChain callbacks (BaseCallbackHandler)
- LangSmith (hosted tracing)
- LangChain Agents (AgentExecutor)
- LangChain RAG / retrievers
- LangChain output parsers (PydanticOutputParser, RetryWithErrorOutputParser)
- LangChain text splitters (RecursiveCharacterTextSplitter)
- OpenAI via `langchain_openai` (ChatOpenAI, get_openai_callback)
- tiktoken (token counting)
- tenacity (retry/backoff)
- Pydantic (BaseModel/Field)

## Sources Consulted
- LangChain Python API reference: https://python.langchain.com/api_reference/
- LangChain callbacks documentation: https://python.langchain.com/docs/concepts/callbacks/
- LangChain globals / `set_verbose` documentation: https://python.langchain.com/api_reference/langchain/globals/langchain.globals.set_verbose.html
- LangSmith tracing environment variables: https://docs.smith.langchain.com/observability/how_to_guides/tracing/trace_with_langchain
- `langchain_openai.ChatOpenAI` reference: https://python.langchain.com/api_reference/openai/chat_models/langchain_openai.chat_models.base.ChatOpenAI.html
- `get_openai_callback` reference (langchain_community): https://python.langchain.com/api_reference/community/callbacks/langchain_community.callbacks.manager.get_openai_callback.html
- tiktoken README: https://github.com/openai/tiktoken
- tenacity documentation: https://tenacity.readthedocs.io/

## Issues Found
- **Deprecated `langchain.verbose = True` pattern.** The post showed enabling verbose mode by importing `langchain` and setting `langchain.verbose = True` directly. This pattern has been deprecated since LangChain 0.1 in favor of `from langchain.globals import set_verbose; set_verbose(True)`. Updated the snippet under "Enabling Verbose Mode" to use the modern API.

## Review Notes
- `LLMChain` is used throughout the post but has been deprecated in favor of LCEL (`prompt | llm | parser`-style `RunnableSequence`) since LangChain 0.1.17. It still works with deprecation warnings and is widely understood, so no changes were made — the debugging concepts (verbose, callbacks, token tracking) apply equally to LCEL chains.
- The `early_stopping_method="generate"` value on `AgentExecutor` is still accepted but emits a deprecation warning in recent LangChain releases; `"force"` is the safer choice going forward. Left as-is since the value is functional.
- `request_timeout` on `ChatOpenAI` is the legacy parameter name; it is still accepted via Pydantic alias for `timeout`. Left as-is.
- The callback method signatures (`on_chain_start`, `on_llm_start`, `on_retriever_start`, `on_agent_action`, etc.) match `BaseCallbackHandler` and remain correct.
- The `from langchain import hub` import in the agent example is unused but harmless.
- The agent example references variables (`agent`, `tools`, `prompt`, `retriever`, `llm`) that are not defined in the snippet — acceptable for an illustrative tutorial that focuses on the debugging hooks rather than full setup.
- LangSmith environment variables (`LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`) are correct. Newer LangSmith docs also accept the `LANGSMITH_*` prefix variants, but the `LANGCHAIN_*` form continues to work.
