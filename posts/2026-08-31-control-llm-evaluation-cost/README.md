# How to Control LLM Evaluation Cost with Sampling, Caching, and Cascaded Judges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Cost Optimization, Sampling, Caching

Description: Reduce LLM evaluation spend without hiding regressions by combining representative samples, version-safe caches, and calibrated judge cascades.

---

LLM evaluation cost grows multiplicatively. A rough budget is:

```text
cases × candidates × generation repeats × metrics × judge calls × tokens per call
```

A metric may also make several hidden calls. For example, response-relevancy methods can generate multiple synthetic questions before comparing embeddings. Estimate the call graph rather than multiplying only dataset rows by one advertised model price.

Cost control should preserve the probability of detecting important regressions. Running every metric on every case with the strongest judge is rarely necessary, but evaluating only easy random examples produces inexpensive confidence rather than reliable evidence.

## Measure Cost at the Case and Stage Level

Log input tokens, output tokens, model, retries, latency, cache status, and failure status for candidate generation and every grader. Aggregate them by metric, dataset slice, and pipeline stage. This identifies whether spend comes from long contexts, repeated parsing failures, an unnecessarily expensive judge, or too many low-value metrics.

Build a small estimate before launching a full run:

```python
estimated_cost = 0.0
for stage in planned_stages:
    estimated_cost += (
        stage.case_count
        * stage.expected_calls_per_case
        * stage.estimated_cost_per_call
    )

if estimated_cost > run_budget:
    raise RuntimeError("Evaluation plan exceeds its budget")
```

Treat retry and parse-failure rates as budget variables. A cheap local judge that emits invalid structured output repeatedly can cost more-and produce less usable evidence-than a reliable hosted judge called once.

## Sample Without Losing Critical Coverage

Use a small, fixed smoke set on every change and a larger stratified set on pull requests or scheduled runs. Strata should include common traffic, known production failures, rare but costly intents, languages, long contexts, safety cases, and unanswerable questions. Keep critical cases as an always-run census even if their traffic share is small.

For the remaining population, sample within each stratum and retain sampling weights if you want a production-weighted aggregate. Rotate a portion of the sample so the same easy rows do not become the entire evaluation. Keep a stable anchor subset to make trends comparable across runs.

Adaptive sampling can spend more calls near a decision boundary or in slices showing unusual change. Record the selection rule and do not report an adaptively selected sample as though it were a simple random sample. Confirm a promising or alarming discovery on a locked set.

## Cache Only Reusable Computation

Cache deterministic preprocessing and embeddings for immutable text. Reuse a saved candidate output when the goal is to re-score that exact generation, and reuse a judge result only when the goal is to reuse that exact judgment. Fixed generation settings do not guarantee identical model output, so cached generations or judgments must not be counted as fresh repetitions in a variance study. A safe cache key includes every value that can change the result:

```text
hash(
  case + candidate_model + system_prompt + generation_settings +
  retrieved_context + tool_schema + metric_version + rubric +
  judge_model + judge_prompt + parser_version
)
```

Never key only by user question. That can silently reuse a score after a prompt, model, corpus, or rubric change. Store the full provenance next to the value, set a retention policy for sensitive data, and provide a deliberate cache-bypass mode for audits and repeated-run measurements. Treat a disk cache as another copy of evaluation prompts, responses, and possibly private source material: apply the same access control, encryption, locality, and deletion requirements as the underlying dataset, or do not cache that content.

Ragas exposes a `CacheInterface` and a persistent `DiskCacheBackend`; the latter uses the `diskcache` package, which Ragas v0.4.3 declares as a core dependency. Whether using that backend or an internal store, test cache invalidation explicitly. Provider-side prompt caching is different: OpenAI's prompt caching reuses computation for shared prompt prefixes. Put stable instructions and rubrics before case-specific content to make shared prefixes possible, while following the provider's current eligibility and retention rules.

## Use a Calibrated Judge Cascade

Route each case through the least expensive reliable stage:

1. deterministic checks for schema validity, exact IDs, required citations, and forbidden strings;
2. a small judge for clear semantic cases;
3. a stronger judge for low-confidence, disputed, high-impact, or boundary cases;
4. human review for consequential ambiguity and cascade audits.

The router can use disagreement between two cheap checks, distance from a decision threshold, parse confidence, or a high-risk label. Do not let the same weak judge assign its own confidence without validation. Calibrate routing rules against human labels and measure false negatives-especially regressions the early stages incorrectly pass.

Keep a random audit sample from every early-exit branch. Without it, the cascade's errors become invisible because only escalated cases receive a stronger label. Compare cascade decisions with the reference judge or humans periodically and after any prompt or model update.

## Reduce Tokens Without Changing the Task

Remove duplicated instructions, irrelevant metadata, verbose few-shot examples, and source passages outside the evaluation target. Precompute atomic claims once if several metrics reuse them. Batch embedding requests where the provider supports batching, and use asynchronous concurrency to reduce elapsed time-but remember that concurrency changes latency, not per-token spend.

Do not truncate a response or retrieved context in a way that makes the evaluated task easier. If production answers can be 4,000 tokens, a grader tested only on the first 500 may miss the hallucination at the end. Instead, use claim-level chunking with a final aggregation rule, and validate that it agrees with whole-answer human review.

Some provider features address different cost/latency needs. OpenAI's Batch API processes asynchronous groups of requests and documents its own pricing and completion behavior; it is a good fit for non-blocking scheduled evaluation, not a substitute for sampling. Always consult current pricing and API documentation rather than hard-coding a percentage into the evaluation design.

## Schedule Evaluation by Risk

A practical cadence is layered:

- per commit: deterministic checks and a small fixed smoke set;
- pull request: representative sample plus changed-component slices;
- nightly: larger rotating sample and strong-judge audit;
- release: locked golden set, critical cases, variance checks, and human review where required.

Set separate budgets for normal calls, retries, and escalations. Fail loudly if parse errors or missing scores exceed a threshold; silently skipping expensive failures makes both cost and quality reports misleading. Publish coverage next to spend: number of cases, slices represented, cache hit rate, escalation rate, judge failure rate, and estimated uncertainty.

The goal is an efficient decision system, not the cheapest score. A run that costs half as much but cannot detect a critical regression is not an optimization.

## Official Documentation

- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI Prompt Caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [OpenAI Batch API](https://developers.openai.com/api/docs/guides/batch)
- [Ragas Cache Reference](https://docs.ragas.io/en/stable/references/cache/)
- [Ragas LLM Reference](https://docs.ragas.io/en/stable/references/llms/)

## Conclusion

Control evaluation cost by understanding the full call graph, preserving high-risk coverage through stratified sampling, caching only fully versioned computations, and escalating uncertain cases through a calibrated judge cascade. Track coverage and error rates beside spend so savings never masquerade as evidence that quality is stable.
