# Validation Summary: Count Tokens in Streaming LangGraph Without Breaking Callbacks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- LangGraph streaming
- LangChain callbacks and runnable configuration
- LLM token-usage accounting
- OpenTelemetry and LLM observability concepts

## Sources Consulted
- [LangChain `UsageMetadataCallbackHandler` implementation](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/usage.py)
- [LangChain runnable configuration and `merge_configs` implementation](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/runnables/config.py)
- [LangGraph streaming guide](https://docs.langchain.com/oss/python/langgraph/streaming)
- [LangGraph `Pregel.stream` implementation](https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/langgraph/pregel/main.py)
- [LangGraph Python API reference](https://reference.langchain.com/python/langgraph/pregel/main/Pregel)

## Issues Found
No technical issues found.

## Review Notes
The examples intentionally depend on provider-supplied final usage metadata. The post correctly warns that support varies by provider and that missing metadata must not be treated as zero usage. The explicit `version="v1"` argument is valid in the current LangGraph graph-stream API and preserves the `(message, metadata)` shape for `stream_mode="messages"`; applications using a different installed LangGraph version should follow the post's version caveat.
