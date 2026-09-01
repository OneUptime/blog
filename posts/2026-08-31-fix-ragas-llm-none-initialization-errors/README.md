# How to Fix Ragas “LLM Is None” and Metric Initialization Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Evaluation, Data Quality, Python, LLM

Description: Fix Ragas metric initialization by matching API versions, creating an explicit evaluator client, and attaching it only to metrics that require an LLM.

---

An “LLM is None” error means an LLM-based metric reached scoring without a usable evaluator model. It is a wiring problem, not a low evaluation score. The durable fix is to identify the installed Ragas API generation, build an explicit client and Ragas LLM, attach it to the metric, and verify one minimal call before evaluating a dataset.

## Do Not Mix Ragas API Generations

Ragas’ v0.3-to-v0.4 migration documentation changed several connected pieces:

| Legacy pattern | Collections pattern |
|---|---|
| `from ragas.metrics import Faithfulness` | `from ragas.metrics.collections import Faithfulness` |
| `SingleTurnSample(...)` | keyword arguments |
| `single_turn_ascore(sample)` | `score(...)` or `ascore(...)` |
| numeric return value | `MetricResult`, read `.value` |
| wrapper or multiple factories | unified `llm_factory(...)` |

Copying an old metric import into a new factory example can produce deprecation warnings, type mismatches, or a missing LLM at runtime. First record versions:

```bash
python -c 'import importlib.metadata as m; print(m.version("ragas")); print(m.version("openai"))'
```

Then use the matching versioned documentation. Pin the working dependency set so CI and local machines do not silently select different APIs.

## Initialize the Modern Metric Explicitly

Current collections-based documentation uses a provider client, `llm_factory`, and the metric constructor:

```python
import asyncio
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness

async def main():
    client = AsyncOpenAI(timeout=60.0, max_retries=2)
    evaluator_llm = llm_factory("gpt-4o-mini", client=client)
    metric = Faithfulness(llm=evaluator_llm)

    result = await metric.ascore(
        user_input="Where is the Eiffel Tower?",
        response="The Eiffel Tower is in Paris.",
        retrieved_contexts=["The Eiffel Tower is located in Paris, France."],
    )
    print(result.value)

asyncio.run(main())
```

Passing `llm=` at metric construction makes the dependency visible and testable. Avoid relying on an implicit default selected from an environment variable, especially in libraries, notebooks, and CI.

Ragas metrics have different dependencies. `Faithfulness`, `ContextRecall`, and other semantic judge metrics need an evaluator LLM. Deterministic metrics such as direct ID comparisons or exact tool-call comparisons may not. Consult the chosen metric’s current page rather than attaching an LLM to everything.

## Check the Factory Inputs

The current `llm_factory` reference expects a model, provider information when needed, and a compatible initialized client. Verify:

- the API key exists in the process running Python, not only your shell profile;
- the endpoint and provider match the client;
- the model identifier is valid for that endpoint;
- sync code uses `score` and async code awaits `ascore` consistently;
- no variable named `llm` is reassigned to `None`; and
- the metric instance being scored is the one initialized with the LLM.

A simple construction assertion catches accidental shadowing:

```python
evaluator_llm = llm_factory("gpt-4o-mini", client=client)
if evaluator_llm is None:
    raise RuntimeError("evaluator factory returned no model")

faithfulness = Faithfulness(llm=evaluator_llm)
```

Do not print API keys while debugging. Log endpoint host, provider, model ID, class names, and package versions.

## Fix Common Lifecycle Mistakes

In application code, create evaluation clients at a clear boundary and inject them:

```python
def build_metrics(evaluator_llm):
    return {
        "faithfulness": Faithfulness(llm=evaluator_llm),
        # Add other LLM-based metric instances here.
    }
```

This avoids module-level initialization before environment configuration, notebook cells executed out of order, and fixtures that close a client before scoring. In worker processes, initialize compatible clients inside the worker if the SDK does not support serialization across processes.

If a configuration object allows evaluation to be disabled, use a distinct state such as `metrics=[]`. Do not represent “disabled” by constructing LLM metrics with `llm=None` and hoping they will be skipped.

## Understand Legacy Injection

Older Ragas examples commonly pass wrapped LangChain models and call `evaluate(..., llm=...)`, or set `llm` on legacy metric instances. That can be valid for the exact legacy version, but it should not be merged with collections imports. Ragas’ current run-configuration page labels `evaluate()` plus `RunConfig` examples as legacy and recommends client-level timeout and retry settings with the collections API.

If an established project must stay on the legacy API, pin its version, instantiate the documented wrapper, pass the model in the documented location, and write a migration test. Do not silence deprecation warnings without a plan; they identify code that may stop working in a later release.

## Diagnose the Next Error Separately

After `None` is fixed, a request can still fail because of authentication, rate limits, invalid structured output, token limits, or missing embeddings. These are different faults. Test in this order:

1. construct the provider client;
2. construct the Ragas LLM;
3. score one short known-good sample;
4. add embeddings if the selected metric requires them;
5. run a small dataset with exceptions visible; and
6. scale concurrency only after the path is stable.

For the modern API, configure timeouts and retries on the provider client as Ragas documents. Retries can help transient failures but do not repair a model that cannot follow the required structured schema.

## Make Configuration Fail Fast

At process startup, validate required environment variable names, endpoint configuration, and selected metric dependencies. Run one evaluator health control that must pass and one that must fail. If initialization or controls fail, stop the evaluation with an infrastructure status rather than emitting `NaN` or an empty report.

Store the judge model, prompt or metric version, Ragas version, and provider client version with results. An evaluation score is not reproducible without the measurement configuration.

## Official Documentation

- [Ragas: LLMs and `llm_factory`](https://docs.ragas.io/en/stable/references/llms/)
- [Ragas: Customize models](https://docs.ragas.io/en/stable/howtos/customizations/customize_models/)
- [Ragas: v0.3 to v0.4 migration](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/)
- [Ragas: Run configuration](https://docs.ragas.io/en/stable/howtos/customizations/run_config/)
- [Ragas: Available metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)

## Conclusion

Fix “LLM is None” at the dependency boundary: pin and identify the Ragas API version, create a compatible provider client, build the evaluator with `llm_factory`, and inject it into each LLM-based metric. Prove the setup with one short score before adding datasets, embeddings, concurrency, or legacy compatibility.
