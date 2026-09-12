# Validation Summary: How to Log the Exact Prompt and Context LangChain Sent to the Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- LangChain Core callbacks and runnables
- LangSmith tracing and sensitive-data controls
- LLM observability
- OpenTelemetry

## Sources Consulted
- [LangChain `BaseCallbackHandler` callback definitions](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/base.py)
- [LangChain `on_chat_model_start` reference](https://reference.langchain.com/python/langchain-core/callbacks/base/AsyncCallbackHandler/on_chat_model_start)
- [LangChain messages reference, including `messages_to_dict`](https://reference.langchain.com/python/langchain-core/messages)
- [LangSmith tracing with LangChain](https://docs.langchain.com/langsmith/trace-with-langchain)
- [LangSmith sensitive-data controls](https://docs.langchain.com/langsmith/mask-inputs-outputs)

## Issues Found
- The text instructed readers to carry a context capture ID in invocation metadata and store it with the model run ID, but the example neither supplied metadata nor recorded it. Updated `invoke_with_capture` to accept a context capture ID and pass it as `RunnableConfig` metadata, and updated the callback to record the inherited metadata value with each model-run capture.

## Review Notes
- The callback captures LangChain's structured chat-model input, not the provider's byte-for-byte HTTP payload; the post states this boundary accurately.
- `on_chat_model_start`, invocation-time callback configuration, metadata inheritance to child runs, and `messages_to_dict` are current LangChain Core APIs as of the validation date.
- LangSmith's input/output and metadata masking controls do not govern the separate custom capture sink shown in the post. The post correctly tells readers to verify separately collected metadata and enforce a storage policy in the capture function.
