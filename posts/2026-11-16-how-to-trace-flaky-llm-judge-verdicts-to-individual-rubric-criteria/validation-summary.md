# Validation Summary: How to Trace Flaky LLM Judge Verdicts to Individual Rubric Criteria

## Status
validated

## Post Type
Technical guide with a standalone Python diagnostic and an illustrative JSON evaluation record.

## Technologies Covered
- LLM-as-a-judge evaluation and rubric design
- Python 3 and `collections.Counter`
- JSON evaluation records
- LangSmith experiments and repetitions
- Observability, traces, spans, and metric label cardinality
- Prompt engineering and prompt injection defenses

## Sources Consulted
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — model variability, scoped evaluation, logging, and human calibration.
- [LangSmith: Evaluate an existing experiment](https://docs.langchain.com/langsmith/evaluate-existing-experiment) — evaluating stored traces without re-running the application.
- [LangSmith: Evaluate with repetitions](https://docs.langchain.com/langsmith/repetition) — repeated experiment runs and inspection of individual feedback scores.
- [Python: collections.Counter](https://docs.python.org/3/library/collections.html#collections.Counter) — counting labels using the standard library.
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/) — avoiding unbounded, high-cardinality metric labels.
- [OpenTelemetry: Traces](https://opentelemetry.io/docs/concepts/signals/traces/) — spans, timing, contextual attributes, and operation status.
- [OpenAI: Safety in building agents](https://developers.openai.com/api/docs/guides/agent-builder-safety) — untrusted input, prompt injection, and limitations of mitigations.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Executed the exact Python snippet from README.md with Python 3.15.0. The supported criterion reports 5 attempts, 4 valid observations, 1 unavailable attempt, and modal disagreement 0.5. The complete criterion reports 5 attempts, 5 valid observations, 0 unavailable attempts, and modal disagreement 0.0.
- Parsed the JSON example successfully. Its fields are explicitly application-owned, not a claimed OpenAI, LangSmith, or OpenTelemetry wire schema. The sample policy and answer references are illustrative identifiers rather than external resources requiring resolution during this review.
- The formula correctly measures the fraction of valid labels outside a modal category. Its empty-input guard avoids division by zero and taking a maximum over an empty collection. `cannot_judge` is intentionally a valid rubric outcome, whereas `error` is excluded; the prose correctly distinguishes missing evidence from stochastic disagreement. This diagnostic does not establish statistical significance or accuracy.
- The recommendations to freeze inputs, preserve unsuccessful attempts, version changed criteria, and compare against held-out human labels are sound experimental practices. Identical input digests check input consistency; they do not guarantee deterministic model responses or prove the cause of a flip.
- LangSmith's repetitions example runs the target application repeatedly. Evaluating an existing experiment instead uses stored traces, and the referenced documentation currently identifies this feature as Python-only. The post correctly avoids claiming that ordinary application repetitions automatically isolate judge variance.
- The aggregation policy is presented as an application design choice, not a universal framework behavior. Separating infrastructure errors from quality verdicts and preserving critical criterion failures is consistent with that policy.
- The post correctly treats a judge's explanation as reviewable output rather than proof of internal reasoning, and does not claim that delimiters prevent prompt injection.
- All three documentation links and the author link resolved to relevant pages. No terminal commands, vendor API calls, package version requirements, or deployment configuration appear in the post.
- The OpenAI evaluation guidance currently carries an Evals platform deprecation notice, and the safety page carries an Agent Builder deprecation notice. The post depends on neither product API; its conceptual guidance and standalone Python remain applicable.
- README.md was left unchanged. No live judge calls were necessary or performed; validation covered the executable local example and documented workflow claims.
