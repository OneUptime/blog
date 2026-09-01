# How to Evaluate a RAG System with a Local LLM That Produces Invalid JSON

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Evaluation, Data Quality, Local LLM, JSON

Description: Make local-model Ragas evaluation reliable by using the modern structured-output adapter, probing schema compliance, and treating malformed judge output as missing data.

---

When Ragas reports invalid JSON from a local LLM, the malformed output usually comes from the evaluator model responding to a metric prompt-not from the RAG application being evaluated. Modern LLM-based collections metrics use structured outputs for intermediate decisions such as claim extraction and verdicts. A local model can answer conversationally while still failing that contract; deterministic collections metrics do not make this judge call.

The solution is to test the evaluator path independently, use the adapter documented for your endpoint, reduce systematic causes of truncation, and preserve failures instead of converting them into misleading scores.

## Use a Supported Integration Shape

Ragas’ current quickstart shows an OpenAI-compatible Ollama endpoint. Use an async client for the collections-metric `ascore` path used later in this post:

```python
from openai import APITimeoutError, AsyncOpenAI
from ragas.llms import llm_factory

client = AsyncOpenAI(
    api_key="ollama",  # placeholder; a local Ollama server does not require a real key
    base_url="http://localhost:11434/v1",
    timeout=120.0,
    max_retries=1,
)

evaluator_llm = llm_factory(
    "mistral",
    provider="openai",
    client=client,
)
```

Ragas’ modern `llm_factory` returns a Ragas LLM wrapper configured through a structured-output adapter, and it automatically selects the adapter, with explicit `instructor` or `litellm` options available when needed. That adapter does **not** make the underlying local model or server schema-compliant. Do not copy an old `LangchainLLMWrapper` tutorial into a collections-based metric without following the migration guide.

Endpoint compatibility varies by server and model. Verify the exact local model name, OpenAI-compatible base URL, and server’s support for the request fields emitted by the adapter. Pin Ragas, the OpenAI client, adapter packages, transitive integrations, local server, model weights, and prompt template. For Ragas 0.4.3, include `langchain-community==0.3.31` in that lock; an unconstrained install can select 0.4.x, which removed a module that Ragas imports.

## Prove the Local Endpoint First

Test three layers separately:

1. **Server health:** list or invoke the chosen model directly.
2. **Structured output:** request a tiny fixed schema through the same client and adapter used by Ragas.
3. **Metric call:** score one short known-good example.

Capture raw provider output and finish reasons in a restricted debug environment when the adapter, exception, or server logs expose them. Useful failure signatures include prose before the JSON object, Markdown fences, a missing required field, wrong field type, trailing text, truncated closing braces, or an empty response. Avoid logging evaluation content that contains private data.

If a tiny endpoint probe consistently truncates output or ignores the schema, changing RAG inputs alone is unlikely to fix it. Choose a model/server combination with reliable instruction and structured-output behavior or use a different supported adapter/client pairing.

## Run One Modern Metric in Isolation

Use the collections API so errors stay close to the failing call:

```python
import asyncio
from ragas.metrics.collections import Faithfulness

async def main():
    metric = Faithfulness(llm=evaluator_llm)
    result = await metric.ascore(
        user_input="Where is the Eiffel Tower?",
        response="The Eiffel Tower is in Paris.",
        retrieved_contexts=["The Eiffel Tower is located in Paris, France."],
    )
    print(result.value, result.reason)

asyncio.run(main())
```

If this works, increase context and answer length gradually. Then add the next metric. Different metrics use different prompts and number of model calls; success on one does not certify all of them.

## Fix Systematic JSON Failures

Work through these causes in order:

- **Model capability:** use an instruction-tuned model that you have measured to follow the metric’s schema consistently.
- **Output truncation:** provide enough output tokens for the structured response and inspect finish reasons.
- **Context overflow:** reduce irrelevant retrieved text or select an evaluator with a sufficient context window; do not silently truncate supported production cases.
- **Unsupported parameters:** update the client/server or configure an adapter compatible with the endpoint.
- **Prompt wrappers:** remove duplicate prompt or chat-template wrapping configured in a proxy, server, or surrounding client layer.
- **Stop sequences:** ensure a custom stop token does not cut off the closing JSON.
- **Concurrency:** lower parallelism if the local server is overloaded, rejecting requests, or timing out.
- **Sampling:** use the most deterministic settings the selected model supports, while recognizing that low temperature does not guarantee schema compliance.

Do not “repair” arbitrary JSON with regex and count it as equivalent. Removing code fences around an otherwise valid object can be a documented parser normalization; inventing missing verdicts or extracting whichever number appears first changes the metric.

## Configure Retries for the Right Failures

Current Ragas guidance configures timeout and retries on the provider client for collections metrics. Provider-client retries are appropriate for transient connection resets, overload responses, and other retryable HTTP statuses; they do not retry a successful response merely because schema parsing fails. Adapter-level schema-validation retries are separate. Keep both retry layers bounded because repeatedly sending an incompatible schema request wastes compute and can conceal an incompatible model.

Classify results:

```python
from math import isfinite

try:
    result = metric.score(**sample)
    if not isfinite(result.value):
        raise ValueError("metric returned a non-finite score")
    save_score(case_id, result.value)
except APITimeoutError as exc:
    save_error(case_id, "timeout", str(exc))
except Exception as exc:
    save_error(case_id, "invalid_or_provider_error", str(exc))
    raise
```

Use the actual exception classes raised by your client and Ragas version. During diagnosis, allow exceptions to surface. In batch production, report valid score coverage and failure reasons. A missing judgment is not zero and must not be silently removed from an average.

## Separate Local and Fallback Judge Results

A hosted fallback can be useful for cases the local judge cannot parse, but it creates a mixed measurement. Store `judge_provider` and model per row, report results separately, and calibrate both against the same human labels. Do not present a single trend as if the judge were unchanged.

Another option is a cascade: deterministic checks first, a local judge for clear cases, and a stronger judge or human only for invalid or uncertain results. Define the routing policy in advance and include fallback cost and rate in the report.

## Qualify the Judge Before Scaling

Build controls for valid output, long context, multilingual text, code, adversarial instructions embedded in the candidate, and empty input. Measure structured-output success, human agreement, repeated-run stability, latency, and tokens. A local judge that returns valid JSON 100% of the time may still apply the rubric incorrectly.

Run the evaluation from a locked environment and preserve server/model metadata. Changing quantization, context settings, or chat templates changes the evaluator and should trigger requalification.

## Official Documentation

- [Ragas: Quickstart, including local Ollama models](https://docs.ragas.io/en/stable/getstarted/quickstart/)
- [Ragas: LLMs and `llm_factory`](https://docs.ragas.io/en/stable/references/llms/)
- [Ragas: Customize models](https://docs.ragas.io/en/stable/howtos/customizations/customize_models/)
- [Ragas: Run configuration](https://docs.ragas.io/en/stable/howtos/customizations/run_config/)
- [Ragas: v0.3 to v0.4 migration](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/)

## Conclusion

Invalid JSON is an evaluator contract failure. Use Ragas’ current structured-output factory with a compatible local endpoint, prove schema compliance on a tiny call, isolate each metric, and fix capability, context, token, or concurrency causes. Preserve every malformed result as an error and qualify the local judge against humans before trusting its numeric scores.
