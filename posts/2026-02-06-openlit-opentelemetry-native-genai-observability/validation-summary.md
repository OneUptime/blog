# Validation Summary: How to Set Up OpenLIT for OpenTelemetry-Native GenAI Observability

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- OpenLIT Python SDK
- OpenTelemetry and OTLP export
- OneUptime OTLP ingestion
- OpenAI Python SDK and Chat Completions
- LangChain RAG chains
- Chroma vector store
- NVIDIA GPU metrics
- Python

## Sources Consulted
- OpenLIT SDK configuration documentation: https://docs.openlit.io/latest/sdk/configuration
- OpenLIT distributed tracing documentation: https://docs.openlit.io/latest/sdk/features/tracing
- OpenLIT GPU monitoring documentation: https://docs.openlit.io/latest/sdk/features/gpu
- OpenLIT 1.42.0 package metadata and `openlit.init()` signature from PyPI package inspection
- OpenLIT GPU instrumentation source in the installed 1.42.0 package
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OpenAI Chat Completions OpenAPI specification: https://api.openai.com/v1/chat/completions
- OpenAI GPT-4o mini model documentation: https://developers.openai.com/api/docs/models/gpt-4o-mini
- LangChain RetrievalQA deprecation reference: https://api.python.langchain.com/en/latest/langchain/chains/langchain.chains.retrieval_qa.base.RetrievalQA.html
- LangChain recursive text splitter documentation: https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter
- LangChain Chroma integration documentation: https://docs.langchain.com/oss/python/integrations/vectorstores/chroma
- OpenTelemetry Python system metrics instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/system_metrics/system_metrics.html
- PyPI metadata for `nvidia-ml-py` and `opentelemetry-instrumentation-system-metrics`

## Issues Found
- The post used `pip install openlit[gpu]`, but the current OpenLIT package does not expose a `gpu` extra. Changed the GPU setup command to install the OpenTelemetry system metrics instrumentation package and NVIDIA NVML Python bindings.
- The examples used the deprecated OpenLIT `application_name` parameter. Updated examples to use `service_name`.
- The examples used `trace_content`, which is not the current OpenLIT Python SDK parameter. Updated it to `capture_message_content`.
- The examples used deprecated GPU options `collect_gpu_stats` and `gpu_stats_interval`. Updated the examples to use `collect_system_metrics`; removed the unsupported interval option from the code.
- The OpenLIT environment variable examples used non-current variable names. Updated them to `OTEL_SERVICE_NAME`, `OTEL_DEPLOYMENT_ENVIRONMENT`, `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT`, and `OPENLIT_COLLECT_SYSTEM_METRICS`.
- The OneUptime OTLP endpoint examples used an older alternate endpoint. Updated them to the documented `https://oneuptime.com/otlp` endpoint.
- The OpenAI examples used the older `gpt-4` model string. Updated them to `gpt-4o-mini`, which is documented for Chat Completions.
- The LangChain RAG example used deprecated `RetrievalQA` and older import paths. Updated it to `create_retrieval_chain`, `create_stuff_documents_chain`, `langchain_text_splitters`, and `langchain_chroma`.
- The LangChain example did not include the extra LangChain integration packages needed for the snippet. Added a focused install command for those packages.
- The GPU metrics comments described GPU memory metrics as bytes, but OpenLIT's SDK GPU instrumentor emits those memory values in megabytes. Updated the comments.

## Review Notes
The Python snippets were parsed with `ast.parse` after edits and all parsed successfully. I could not create a virtualenv because `python3-venv` is not installed in the environment, so package install verification was done with `pip --target --dry-run` for the GPU-related dependencies.
