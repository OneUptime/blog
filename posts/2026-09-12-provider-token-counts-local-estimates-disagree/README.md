# Why Provider Token Counts and Local Estimates Disagree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LLM

Description: Explain token accounting differences caused by serialization, tools, caching, reasoning, and partial streams, and record both evidence and estimates.

Your local tokenizer reports 1,240 input tokens, while the provider reports 1,391. That discrepancy does not immediately mean the provider is wrong or your code is broken. The two counters may be measuring different representations of the request.

Treat token usage as a measurement with a source, scope, and completeness state. That makes disagreements diagnosable and prevents estimates from becoming unexplained billing numbers.

## Compare Like with Like

A local estimate may tokenize only the user's text. The actual request can also contain system instructions, message boundaries, conversation history, tool schemas, tool results, images, and provider-specific serialization. Model families can use different tokenizers, and a model alias can change the serving model over time.

Record the tokenizer implementation and version, model requested, resolved model when returned, and the exact classes of input included in the estimate. Without these fields, a daily difference graph cannot distinguish a changed tokenizer from a larger tool schema.

Provider token-counting endpoints are useful for preflight checks, but they are not always identical to final usage. Anthropic explicitly describes its counting endpoint as an estimate and notes that actual message input counts can differ. [Anthropic token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting).

That makes preflight counts suitable for admission and context budgeting, with appropriate margin. Final response usage is stronger evidence of what the provider says the completed attempt consumed. An invoice or usage export remains the final reconciliation source for charges.

## Keep the Original Categories

Do not collapse every usage field into one integer before understanding its semantics. Input, output, cache reads, cache creation, and reasoning categories may have different relationships and prices. Some are subsets of broader counts, while others are separate categories in a provider's response schema.

A safe normalized record preserves the provider payload alongside a documented interpretation:

```json
{
  "attempt_id": "attempt-0042",
  "provider": "configured-provider",
  "requested_model": "configured-model",
  "usage_status": "final",
  "provider_usage": {
    "input_tokens": 1391,
    "output_tokens": 212
  },
  "local_estimate": {
    "input_tokens": 1240,
    "tokenizer_id": "application-tokenizer-v3",
    "scope": "rendered-text-only"
  },
  "pricing_revision": "internal-price-table-2026-09"
}
```

This is an application schema, not a provider response example. Its category mapping must be defined separately for each supported provider. Preserve only usage and permitted identifiers in the raw usage field; there is no need to retain the entire prompt to reconcile token counts.

## Handle Streaming Usage Correctly

A stream can contain deltas, cumulative usage snapshots, or a final usage event. The adapter must know which representation it receives. For example, Anthropic documents cumulative usage in `message_delta` events. Summing those snapshots inflates totals. [Anthropic streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming).

Use an attempt ID to replace the current cumulative observation rather than append it as another charge. Finalize the row when the attempt completes. Keep the latest partial value and a partial status if the stream is interrupted.

Do not add a local output estimate to provider-reported output usage. They are two observations of overlapping work. Similarly, do not count both an SDK callback and a provider gateway event unless they represent different attempts.

## Make Missing Usage Visible

A timeout after the provider accepts a request can leave consumption unknown. The absence of response usage does not prove zero cost. Record `unknown` or `partial`, then reconcile later if the provider exposes request-level usage or billing exports.

For operational dashboards, show how much traffic has final, estimated, partial, and unknown accounting. A cost chart with 20 percent missing usage should not look as authoritative as one with complete response data.

A small helper can select a display value without destroying provenance:

```python
def choose_input_count(provider_count, local_count):
    if provider_count is not None:
        return {"value": provider_count, "source": "provider"}
    if local_count is not None:
        return {"value": local_count, "source": "estimate"}
    return {"value": None, "source": "unknown"}
```

Check for `None`, not truthiness: zero can be a valid reported count. The helper only chooses a display value; it does not assert that the two sources have the same billing meaning.

## Investigate a Difference Systematically

Start with one synthetic request and disable application retries or record them separately. Include only a simple user message, then add the system prompt, history, and tools one feature at a time. Compare changes rather than only absolute totals.

If a discrepancy appears after adding tools, inspect whether the local counter includes the tool schemas. If it appears after enabling caching, inspect the provider's cache categories. If it appears only during streaming, check whether usage snapshots are cumulative and whether the final event is consumed.

Keep comparisons grouped by model and request shape. A ratio measured on English prose may not transfer to code, another language, or image-heavy input. Do not apply a universal correction factor to every provider based on one workload.

When calculating estimated cost, use the correct category-specific prices and effective date. Recompute historic estimates only with an explicit policy; silently changing old totals when a price table updates makes incident and finance comparisons confusing.

## Conclusion

Record final provider usage and local estimates separately, with their scope and status intact. Most disagreements become explainable once you account for serialization, category semantics, stream completion, and retries.

## Official Documentation

- [Anthropic token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Anthropic streaming usage semantics](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [LangChain model token usage](https://docs.langchain.com/oss/python/langchain/models)
