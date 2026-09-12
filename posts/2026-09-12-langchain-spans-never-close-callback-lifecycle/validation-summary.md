# Validation Summary: LangChain Spans Never Close: Find Callback and Lifecycle Bugs

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- LangChain callback handlers and run lifecycle events
- OpenTelemetry Python span lifecycle and batch export
- Python asynchronous generators and `contextlib.aclosing`
- Python `asyncio` task cancellation
- Concurrent and streaming LLM execution

## Sources Consulted

- [LangChain callback handler definitions](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/base.py)
- [LangChain chat model implementation](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/language_models/chat_models.py)
- [OpenTelemetry Python manual instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [OpenTelemetry Python exporters](https://opentelemetry.io/docs/languages/python/exporters/)
- [Python `contextlib.aclosing` documentation](https://docs.python.org/3/library/contextlib.html#contextlib.aclosing)
- [Python task cancellation documentation](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)
- [Python `asyncio.CancelledError` documentation](https://docs.python.org/3/library/asyncio-exceptions.html#asyncio.CancelledError)

## Issues Found
No technical issues found.

## Review Notes
The callback probe correctly implements the current model lifecycle pairing: chat and text model runs start through `on_chat_model_start` and `on_llm_start`, respectively, while both terminate through `on_llm_end` or `on_llm_error`. LangChain uses `on_llm_start` as a fallback for a chat model only when `on_chat_model_start` is not implemented, so the probe does not double-count normal chat starts.

The streaming example requires Python 3.10 or newer because `contextlib.aclosing` was added in Python 3.10. This is consistent with the current OpenTelemetry Python support baseline. `asyncio.CancelledError` has inherited directly from `BaseException` since Python 3.8, and the example correctly re-raises it after recording the cancellation outcome. The advice to flush or shut down batch export during graceful termination is correct, though the exact method belongs to the application's configured OpenTelemetry provider or distribution.
