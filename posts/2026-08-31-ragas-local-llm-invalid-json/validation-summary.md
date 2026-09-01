# Validation Summary: How to Evaluate a RAG System with a Local LLM That Produces Invalid JSON

## Status
validated

## Post Type
Technical guide / Troubleshooting guide

## Technologies Covered
- Ragas 0.4.3 collections metrics
- Ragas `llm_factory`, Instructor, and LiteLLM structured-output adapters
- Ragas `Faithfulness` metric and `MetricResult`
- Python and `asyncio`
- OpenAI Python SDK (`AsyncOpenAI`)
- Ollama's OpenAI-compatible API
- JSON, JSON Schema, Pydantic validation, and structured LLM output
- RAG evaluation and LLM-as-a-judge qualification
- LangChain Community as a Ragas transitive dependency

## Sources Consulted
- [Ragas Quickstart](https://docs.ragas.io/en/stable/getstarted/quickstart/) - verified the documented Ollama OpenAI-compatible client, placeholder API key, `/v1` base URL, model name, and `llm_factory` call.
- [Ragas LLM reference](https://docs.ragas.io/en/stable/references/llms/) - verified the `llm_factory` signature, return type, async-client support, and `auto`, `instructor`, and `litellm` adapter options.
- [Ragas Faithfulness documentation](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) and [v0.4.3 Faithfulness source](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/faithfulness/metric.py) - verified the collections import, `ascore` arguments, two-stage statement/verdict pipeline, and `MetricResult` behavior.
- [Ragas metrics reference](https://docs.ragas.io/en/stable/references/metrics/) - verified synchronous and asynchronous score methods and the `.value` and optional `.reason` result fields.
- [Ragas run configuration guide](https://docs.ragas.io/en/stable/howtos/customizations/run_config/) - verified that collections metrics configure timeout and transport retries on the provider client.
- [Ragas model customization guide](https://docs.ragas.io/en/stable/howtos/customizations/customize_models/) and [LLM adapters guide](https://docs.ragas.io/en/stable/howtos/llm-adapters/) - verified structured-output adapter behavior and provider/client requirements.
- [Ragas v0.3-to-v0.4 migration guide](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/) - verified the collections API migration and `LangchainLLMWrapper` deprecation.
- [OpenAI Python SDK error handling, retries, and timeouts](https://github.com/openai/openai-python#handling-errors) - verified `AsyncOpenAI` client options, retryable failures, and the `APITimeoutError` exception.
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) - verified the endpoint URL, ignored placeholder key, supported Chat Completions fields, JSON mode, tools, output-token controls, and model availability requirements.
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs) and [Ollama FAQ](https://docs.ollama.com/faq) - verified JSON Schema support, deterministic-output guidance, context configuration, and overload/concurrency behavior.
- [Ragas issue #2745](https://github.com/vibrantlabsai/ragas/issues/2745) and [Ragas pull request #2923](https://github.com/vibrantlabsai/ragas/pull/2923) - verified the current Ragas 0.4.3 import incompatibility with `langchain-community` 0.4.x.

## Issues Found
1. **Incorrect timeout exception** - The error-classification example caught Python's built-in `TimeoutError`, but the configured OpenAI SDK client raises `openai.APITimeoutError` for request timeouts. Imported and caught `APITimeoutError` so timeouts reach the intended branch.
2. **Incorrect `llm_factory` return-type description** - The post said that `llm_factory` returns an adapter. It returns an `InstructorBaseRagasLLM` implementation created through the selected structured-output adapter. Updated the wording to distinguish the returned LLM wrapper from the internal adapter.
3. **Missing current dependency compatibility constraint** - A fresh Ragas 0.4.3 installation can resolve `langchain-community` 0.4.x, which removed a Vertex AI module that Ragas imports unconditionally and therefore prevents `ragas.llms` from importing. Added the tested `langchain-community==0.3.31` lock-file constraint.
4. **Provider retries and schema retries were conflated** - OpenAI client `max_retries` covers connection errors and retryable HTTP responses; it does not retry a schema-invalid HTTP 200 response. Clarified that structured-output validation retries are a separate adapter layer and that both layers should remain bounded.
5. **Non-finite metric results were saved as valid scores** - Collections `Faithfulness` can return `NaN` when statement extraction produces no statements. Added an `isfinite` check so this missing judgment follows the error path instead of being stored as a valid score.
6. **Several troubleshooting claims were too broad** - Qualified raw-output and finish-reason access as adapter/provider dependent, softened the absolute claim that changing inputs can never help, replaced model size with measured schema reliability, clarified where duplicate prompt templates can arise, and aligned overload symptoms with documented rejection and timeout behavior.

## Review Notes
- All Python code blocks are syntactically valid. In an isolated Ragas 0.4.3 environment with the documented dependency pin, the `AsyncOpenAI` client, `llm_factory`, and collections `Faithfulness` metric constructed successfully. A mocked OpenAI-compatible two-call response exercised the full `ascore` path and returned `MetricResult(value=1.0)`.
- `Faithfulness` exposes `result.reason`, but its current implementation normally leaves that optional field as `None`; printing it is valid.
- The local machine did not have an Ollama daemon available, so live model inference was not run. The endpoint contract and supported request fields were checked against current official Ollama documentation.
- Every external link in the post resolved successfully. The author link redirects from `www.github.com` to GitHub's canonical hostname.
