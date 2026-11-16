# How to Detect Prompt Cache Invalidation with Per-Step Agent Latency Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, OpenAI, Observability, Performance

Description: Detect prompt cache misses across agent steps using cached-token counts, stable input fingerprints, and first-output timing.

An agent may answer quickly on its first few steps and then slow down after a tool call. The tempting explanation is that its prompt cache was invalidated. That is only one possibility: the tool may have added a large result, the provider may be queueing requests, or the next step may generate a much longer response.

Measure cache reuse at each model attempt and connect it to the exact input assembled for that step. Latency tells you that something changed; usage and request comparisons help explain what changed.

## Build a per-step record

For each attempt, capture the workflow-run ID, step number, requested and returned model, returned service tier where available, input tokens, cached input tokens, cache-write tokens when reported, first-text latency, total duration, and outcome.

Add versions or keyed fingerprints for instructions, tool definitions, output schema, and earlier conversation content. A fingerprint should detect changes without exposing the prompt. Keep the canonicalization policy stable, and do not treat hashing as a substitute for access control when the input has low entropy.

This is an application record, not an API response example:

```json
{
  "step": 4,
  "input_tokens": 18000,
  "cached_input_tokens": 0,
  "cache_write_tokens": null,
  "time_to_first_text_ms": 1840,
  "tool_schema_version": "tools-v8",
  "instructions_version": "support-v3",
  "history_prefix_fingerprint": "hmac-sha256:example",
  "cache_diagnostic_reason": "tools_changed"
}
```

Keep null distinct from zero. A model or adapter that does not report cache-write usage is different from one reporting no writes.

## Understand what a cache miss means

[OpenAI's prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) describes prefix reuse and model-specific cache behavior. An edited prefix can prevent later content from matching even when most of the request is unchanged. That is different from proving that a server deleted an existing cache entry.

The useful measurements are absolute reused tokens and the cached-input share. A share can fall merely because new tool output increased the denominator. If cached input remains 8,000 tokens while total input grows from 10,000 to 20,000, the ratio halves without proving lost reuse of the original prefix.

Also compare uncached input and cache-write quantities according to the model's billing schema. Do not assume cache writes are always an extra surcharge on top of ordinary input; use the documented rate partition for the deployed model.

## Use provider diagnostics where supported

OpenAI's [prompt cache diagnostics guide](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics) documents comparisons against a recent response for supported Responses API models. Set `prompt_cache_options.comparison_response_id` to the intended baseline and inspect `prompt_cache_diagnostics` on the completed response.

A comparison requests diagnostic information; it does not load conversation history. Continue providing the proper conversation state independently. For streaming requests, inspect the response attached to `response.completed`.

Diagnostic results can be unavailable or the baseline can expire. Preserve that outcome rather than interpreting it as a cache hit. Reported usage remains the measurement of actual reuse; diagnostic token counts answer a different comparison question.

For providers without this feature, compare your own request fingerprints and cache telemetry. You can identify a likely prefix change, but should label the conclusion as an inference rather than a provider-confirmed miss.

## Find the first divergent step

Display a table ordered by workflow step, with columns for input, cached input, first-text time, tool-schema version, and prefix version. The first sharp change is usually more informative than the slowest step later in the run.

Typical suspects include timestamps inserted into instructions, unstable ordering of tool schemas, rewriting earlier messages, switching models, changing formatting settings, and compaction. Check the actual serialized request rather than the source prompt template alone.

Tool results should normally be appended while earlier history stays stable. Replacing an old result with a newly serialized version can change a prefix even when the underlying facts are the same. Conversely, intentional compaction may improve total cost despite reducing cache reuse; evaluate the full effect instead of maximizing hit ratio in isolation.

## Confirm causality with paired runs

Replay the same representative workflow in a test environment with one controlled change: stable versus reordered tools, timestamp before versus after reusable instructions, or rewritten versus preserved history. Keep the model, output target, concurrency, and other settings fixed.

Run multiple repetitions and record actual cache usage. A single warm request is insufficient because cache availability and routing can vary. Compare first-text distributions for similar uncached input sizes and output types, and retain failed attempts.

A practical alert can combine a drop in reused tokens with a rise in first-text latency for the same feature and step class. Keep a minimum sample count and avoid alerting on a new workflow's intentionally cold first step.

The investigation is complete when the evidence identifies a specific input or setting change, the controlled comparison restores the expected reuse, and the latency improvement survives realistic traffic. A high cache-hit percentage alone is not a performance objective; useful, correctly grounded answers at acceptable latency and cost are.
