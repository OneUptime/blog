# Attach Prompt, Model, and Embedding Versions to LLM Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LLM

Description: Record immutable prompt, model, embedding, index, and application versions so LLM regressions can be compared against the configuration actually served.

An answer-quality regression appears just after deployment, but three things changed: the prompt alias moved, the embedding pipeline rebuilt an index, and the provider began serving a different model revision. A release SHA alone cannot explain the difference.

Attach the resolved versions of every behavior-changing component to the request. The useful record describes what actually executed, not only what the application intended to request.

## Record a Configuration Manifest

Create a manifest when the request resolves its configuration. Include the application release, prompt revision, requested model, generation settings, tool schema revision, embedding configuration, index revision, reranker revision, and evaluation rubric version where applicable.

Distinguish an alias from its resolved value. A prompt labeled `production` is an operational convenience, not an immutable identity. If the prompt service returns a concrete version, record it at fetch time and associate it with the content used for that request.

Use an explicit unknown value when the provider does not expose a serving revision. Do not invent a resolved model ID from the requested alias. Preserve provider response metadata when available, with the minimum fields needed for diagnosis.

LangSmith supports metadata and tags on traces and nested LangChain calls. That makes it suitable for carrying a configuration manifest, provided you preserve the invocation configuration through custom boundaries. [Trace LangChain applications](https://docs.langchain.com/langsmith/trace-with-langchain).

## Hash the Actual Behavior-Changing Configuration

Keep human-readable versions and a deterministic digest. The digest quickly groups requests with the same configuration, while individual fields explain what differs.

```python
import hashlib
import json


def configuration_manifest(*, release, prompt_revision,
                           model, temperature, embedding,
                           index_revision, tool_schema_revision):
    config = {
        "schema": 1,
        "release": release,
        "prompt_revision": prompt_revision,
        "requested_model": model,
        "temperature": temperature,
        "embedding": embedding,
        "index_revision": index_revision,
        "tool_schema_revision": tool_schema_revision,
    }
    encoded = json.dumps(
        config, sort_keys=True, separators=(",", ":"),
        allow_nan=False,
    ).encode()
    return {**config, "config_sha256": hashlib.sha256(encoded).hexdigest()}
```

This helper hashes configuration identifiers, not raw customer input. The `embedding` value can be a dictionary with provider, model, dimensions, normalization behavior, and pipeline version. Include the settings your system actually uses and version the manifest schema itself.

A configuration digest is not a security boundary. It should not contain secrets, even indirectly through a stringified client configuration. Keep connection credentials and user-specific values out of this manifest.

## Attach Versions at Their Owning Stage

Put the overall application release and manifest digest on the request or agent span. Put the prompt revision on generation, index revision on retrieval, and evaluator version on evaluation. Repeating a few bounded identifiers on relevant children can simplify searches, but avoid copying a large manifest onto every HTTP span.

With OpenTelemetry, add application attributes to the current logical span:

```python
from opentelemetry import trace


def annotate_generation(manifest, resolved_model=None):
    span = trace.get_current_span()
    span.set_attribute("app.config.sha256", manifest["config_sha256"])
    span.set_attribute("app.prompt.revision", manifest["prompt_revision"])
    span.set_attribute("app.model.requested", manifest["requested_model"])
    if resolved_model is not None:
        span.set_attribute("app.model.resolved", resolved_model)
```

The `app.*` fields are custom application attributes. OpenTelemetry supports span attributes, but it does not automatically discover your prompt repository or embedding pipeline. [Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

## Version the Corpus as Well as the Embedding Model

Two retrieval requests can use the same embedding model and still behave differently because the source corpus, chunking, metadata filters, or index configuration changed. Record an immutable index build ID and the document revision selected for each retrieved chunk.

For incremental indexes, define what an index revision means. It might be a snapshot, a high-water mark, or a build plus update sequence. A timestamp named `latest` does not provide enough information to reproduce a retrieval result if deletions and updates occur concurrently.

Also record query preprocessing and reranking revisions. A changed query rewrite can move relevant documents out of the candidate set before the unchanged reranker sees them.

## Compare Cohorts Before Declaring Causality

Group failures by manifest digest and compare against a previous stable configuration. Keep request class, tenant cohort, language, input size, and traffic source in mind. A new version receiving harder requests can look worse without a regression.

Use a representative evaluation dataset to replay old and new configurations. Change one component at a time when feasible: old prompt with new model, new prompt with old model, and the same query against each index. This separates a correlation in production from evidence about the responsible component.

Maintain evaluator versions independently. If both application and rubric change at once, a drop in score may reflect the evaluator rather than the application. Preserve scores from comparable rubrics and mark migrations explicitly.

## Verify Deployment Coverage

Send a request through every serving path: direct HTTP, a queue worker, a fallback model, and a resumed graph. Assert that required version fields exist and match the component that served the request.

Test cache hits as well. A cached response should retain the generating configuration and distinguish it from the configuration currently deployed. Otherwise a rollback can make old cached answers appear to have been produced by the new model.

Track missing-version rates as an instrumentation health metric. A manifest only helps root cause analysis if the troublesome requests actually carry it.

## Conclusion

Record immutable resolved versions for prompts, models, retrieval, tools, and evaluators. A compact configuration manifest turns a vague deployment correlation into a set of concrete comparisons you can test.

## Official Documentation

- [LangSmith trace metadata and tags](https://docs.langchain.com/langsmith/trace-with-langchain)
- [OpenTelemetry Python span attributes](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [LangSmith observability data model](https://docs.langchain.com/langsmith/observability-concepts)
