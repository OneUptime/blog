# Validation Summary: Attach Prompt, Model, and Embedding Versions to LLM Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Python
- OpenTelemetry tracing and span attributes
- LangSmith traces, runs, metadata, and tags
- LangChain runnable configuration propagation
- LLM configuration versioning
- Embedding and retrieval index versioning

## Sources Consulted

- [OpenTelemetry Python manual instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [LangSmith: Trace LangChain applications](https://docs.langchain.com/langsmith/trace-with-langchain)
- [LangSmith: Add metadata and tags to traces](https://docs.langchain.com/langsmith/add-metadata-tags)
- [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts)

## Issues Found
No technical issues found.

## Review Notes
The Python examples are syntactically correct and use current APIs. The OpenTelemetry attribute names beginning with `app.` are correctly identified as custom application attributes rather than semantic-convention fields. Attribute values supplied to `set_attribute` must remain valid OpenTelemetry attribute types; the demonstrated manifest fields are strings as intended. If no recording span is active, calls on the span returned by `get_current_span()` do not produce exported attributes, so deployment instrumentation still needs to establish and export the relevant spans. LangSmith documentation confirms that metadata and tags configured on a runnable are inherited by child runnables.
