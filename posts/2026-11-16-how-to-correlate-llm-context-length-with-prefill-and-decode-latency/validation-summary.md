# Validation Summary: How to Compare LLM Prefill and Decode Latency by Context Length

## Status
validated

## Post Type
Technical guide with a JSON experiment-record example and an executable Python analysis helper.

## Technologies Covered
- LLM inference: prefill, decoding, queueing, token counts, and context windows.
- vLLM serving metrics, scheduling, and generation settings.
- OpenAI prompt caching and client-observed latency.
- Python standard library: json, collections.defaultdict, and statistics.median.
- Prometheus histograms, percentiles, and metric-label cardinality.

## Sources Consulted
- [vLLM metrics](https://docs.vllm.ai/en/latest/design/metrics/) — phase histograms, event boundaries, and timing implications of preemption.
- [vLLM optimization and tuning](https://docs.vllm.ai/en/latest/configuration/optimization/) — memory pressure, scheduling, chunked prefill, and latency tradeoffs.
- [vLLM sampling parameters](https://docs.vllm.ai/en/latest/api/vllm/sampling_params/) — output caps, minimum lengths, EOS behavior, and stopping conditions.
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) — rendered-prefix matching, compatible settings, cache availability, and reported cached tokens.
- [Python JSON documentation](https://docs.python.org/3/library/json.html) — JSON decoding and null-to-None conversion.
- [Python collections documentation](https://docs.python.org/3/library/collections.html#collections.defaultdict) — grouping records with defaultdict(list).
- [Python statistics documentation](https://docs.python.org/3/library/statistics.html#statistics.median) — median behavior and empty-input handling.
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/) — bucketed observations, quantile definitions, and aggregation limitations.
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/) — avoiding unbounded label cardinality.
- [Author profile](https://github.com/nawazdhandala) — verified the post's author link resolves to the expected profile.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. Both code blocks were reviewed; the JSON example parsed successfully, and the Python helper executed successfully under Python 3.15.0 using temporary JSON Lines fixtures.
- Execution checks covered completed-request filtering, separate concurrency/cache groups, the 2,047/2,048-token bucket boundary, request counts, even-sized medians, null timings, omitted timing fields, and groups with no available timing values. All assertions passed.
- The helper uses supported standard-library APIs. There are no terminal commands, provider API calls, or deployment configuration snippets to validate. The JSON field names are correctly identified as an application schema.
- The request-level measurement approach is sound. Separate marginal histograms do not preserve request pairing; subtracting independently aggregated percentiles cannot recover the percentile of per-request differences. This conclusion follows from the quantile definition and loss of pairing during aggregation.
- Randomized repetitions, separate warmup/cache conditions, controlled concurrency, actual output-length accounting, and quality checks are appropriate experimental controls. The example latency numbers are illustrative, not benchmark results; no model-serving performance experiment was performed during this review.
- The helper is intentionally a simple summary. Run it on a comparable experiment cohort: it does not separate deployment revisions, warmup status, or output length automatically. Its cache flag distinguishes any reuse from no reuse, rather than measuring the amount of reuse. Production analysis can stratify further using the recorded metadata.
- The requests count is the number of completed records in each group; individual timing medians can have fewer observations because unavailable timings are omitted. Per-field sample counts would be a useful future enhancement.
- First-text timing requires streaming and identification of the first text-bearing event. A non-streaming response does not expose that boundary. Client-observed timings include transport and other overhead and should not be treated as server prefill measurements.
- Server phase measurements depend on implementation and version, and may include scheduling or preemption effects. vLLM exports timing metrics in seconds; collectors populating the example's *_ms fields must convert units. Per-request subtraction also requires compatible timing boundaries and units.
- All three external links in the post resolve to the intended resources. No pinned software versions or deprecated APIs are used; the post correctly advises checking the metrics available in the deployed vLLM version.
