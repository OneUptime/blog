# Validation Summary: How to Measure LLM Output Variance at Temperature Zero

## Status

validated

## Post Type

Technical guide with an executable offline Python example.

## Technologies Covered

- Large language model inference and temperature-zero repeatability
- OpenAI Chat Completions, seeds, and backend fingerprints
- LangSmith evaluation repetitions, concurrency, caching, and existing-experiment evaluation
- Python standard library: `collections.Counter` and `math.comb`
- Categorical agreement statistics and experimental design

## Sources Consulted

- [OpenAI: Reproducible outputs](https://developers.openai.com/api/docs/guides/advanced-usage#reproducible-outputs) — mostly deterministic seeded generation, matching request parameters, and backend configuration changes.
- [LangSmith: Experiment configuration](https://docs.langchain.com/langsmith/experiment-configuration) — target and evaluator repetition, concurrency, and cached response replay.
- [LangSmith: Evaluate with repetitions](https://docs.langchain.com/langsmith/repetition) — per-example repetitions and variability reporting.
- [LangSmith: Evaluate an existing experiment](https://docs.langchain.com/langsmith/evaluate-existing-experiment) — scoring stored traces without rerunning the application.
- [Python: Counter](https://docs.python.org/3/library/collections.html#collections.Counter) — counting hashable outcomes.
- [Python: math.comb](https://docs.python.org/3.13/library/math.html#math.comb) — unordered combinations and Python version availability.
- [NIST: Consequences of non-randomness](https://www.itl.nist.gov/div898/handbook/eda/section2/eda251.htm) — dependence and its effect on uncertainty estimates and independent sample counts.
- [NIST: Consequences of non-fixed location](https://www.itl.nist.gov/div898/handbook/eda/section2/eda252.htm) — drift and misleading pooled estimates.
- [NIST: Quantitative techniques](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35.htm) — sample estimates, uncertainty, and statistical assumptions.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. The post is technically relevant and contains working implementation details; neither skip status applies.
- Executed the exact Python code block with Python 3.15.0. The text fixture returned 4 observations, 3 distinct outcomes, modal share 0.5, and pair disagreement 0.8333333333333334. The semantic fixture returned 4 observations, 2 distinct outcomes, modal share 0.75, and pair disagreement 0.5. The included assertion passed.
- Independently checked the disagreement formula against explicit unordered-pair enumeration for every sequence of lengths 2 through 7 over three categories. All checks passed. Empty and single-observation inputs correctly raised ValueError.
- The formula subtracts within-category equal pairs from all possible pairs. For the semantic fixture, three approve/deny pairs out of six disagree. Shared observations make the pair comparisons dependent; their count is not an independent sample size.
- The example needs Python 3.8 or later because of math.comb, and accepts sized collections of hashable outcomes. Its supplied string lists meet those requirements. Structured extraction results would need conversion to hashable representations before using this helper.
- The request-control, fixed-budget, separate-concurrency, error-accounting, and per-case aggregation recommendations are sound experimental-design guidance. Independence must be established at the request or cluster level; sequential requests are not automatically independent.
- OpenAI documentation supports the qualified repeatability claims. The article appropriately makes seed and temperature support conditional on the selected model and endpoint, and does not promise deterministic results or assert an unverified hardware cause.
- LangSmith documentation confirms that repetitions rerun both target and evaluators and that response caching can reuse saved results. Existing-experiment evaluation can score stored outputs without regeneration; the documented existing-experiment workflow is currently specific to the Python SDK.
- All three official documentation links and the author link resolved to the intended resources. There are no terminal commands, configuration snippets, or pinned SDK/model versions to validate.
- Validation covered the offline fixture, mathematical reasoning, and published API behavior. No live model calls or hosted LangSmith experiments were required or performed.
