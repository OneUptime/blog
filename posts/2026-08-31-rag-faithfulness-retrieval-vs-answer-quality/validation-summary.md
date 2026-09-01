# Validation Summary: Measure RAG Faithfulness Separately from Retrieval and Answer Quality

## Status
validated

## Post Type
Technical guide / Evaluation guide

## Technologies Covered
- Retrieval-Augmented Generation (RAG)
- Ragas v0.4.3 collections metrics API
- Ragas `Faithfulness`, context precision, and context recall metrics
- Python and `asyncio`
- OpenAI Python SDK (`AsyncOpenAI`)
- OpenAI `gpt-4o-mini`
- Information-retrieval ranking metrics
- LLM-as-a-judge evaluation

## Sources Consulted
- [Ragas: Faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) - metric definition, calculation, collections example, and legacy API designation.
- [Ragas v0.4.3 `Faithfulness` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/faithfulness/metric.py) - exact `ascore` signature, statement/verdict pipeline, result construction, and `NaN` branches.
- [Ragas v0.4.3 `MetricResult` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/result.py) - `.value` and `.reason` behavior.
- [Ragas: LLM references](https://docs.ragas.io/en/stable/references/llms/) - `llm_factory` signature and support for `AsyncOpenAI` clients.
- [Ragas: Context precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/) - rank-sensitive context precision and response-dependent context utilization.
- [Ragas: Context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/) - reference-claim coverage definition and formula.
- [Ragas: v0.3 to v0.4 migration](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/) - collections imports, keyword scoring inputs, `MetricResult.value`, and legacy API migration.
- [Ragas 0.4.3 on PyPI](https://pypi.org/project/ragas/0.4.3/) - published version, Python requirement, and package artifact.
- [Python: `asyncio.run`](https://docs.python.org/3/library/asyncio-runner.html#asyncio.run) - validation of the example's async entry point.
- [OpenAI: GPT-4o Mini](https://developers.openai.com/api/docs/models/gpt-4o-mini) - current model ID and availability.
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) - component-level evaluation, logging, task-specific metrics, and human calibration guidance.

## Issues Found
1. **Overlapping claim labels** - `unsupported` was defined as neither supported nor contradicted, while `insufficient_context` was defined as evidence being unable to decide. Those definitions represented the same claim-to-context outcome and made the categories non-exclusive. Replaced `insufficient_context` with `unscorable` for missing or malformed evaluation data, restricted the score denominator to scorable material factual claims, and required unscorable claims to be reported separately.
2. **Non-rank-sensitive precision signal** - The retrieval-precision row asked whether useful chunks were ranked early but listed `precision@k`, which does not distinguish different orderings within a fixed top-k set. Replaced it with `average precision@k`, a rank-sensitive signal consistent with the question and with Ragas context precision.

## Review Notes
- The Python example is syntactically valid. Its imports, `llm_factory` call, `Faithfulness` construction, `ascore` keyword arguments, and `.value` access match Ragas v0.4.3.
- The exact v0.4.3 implementation returns `NaN` when statement extraction produces no statements or when verdict generation produces no verdict statements, as the post states.
- `MetricResult.reason` is a valid attribute, so the example runs as written, but v0.4.3 `Faithfulness` does not populate it and it normally prints `None`.
- Running the model-backed example requires OpenAI credentials, normally through `OPENAI_API_KEY`, consistent with the official Ragas example.
- Ragas 0.4.3 is the latest published PyPI release as of validation, and the published wheel's relevant implementation matches the v0.4.3 tagged source.
- All external links in the post returned HTTP 200 and pointed to the intended resources. The author URL only performs a benign redirect from `www.github.com` to GitHub's canonical host.
- The linked OpenAI guide currently notes that the OpenAI Evals platform will become read-only on October 31, 2026 and is scheduled to shut down on November 30, 2026. The post relies only on the guide's general evaluation practices, not on the deprecated platform workflow.
