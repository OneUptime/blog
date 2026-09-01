# Validation Summary: Why LLM Eval Scores Change: Measure Variance Before Setting Thresholds

## Status

validated

## Post Type

Technical guide with a Python statistical-analysis example

## Technologies Covered

- Large language model evaluation and LLM-as-a-judge workflows
- Repeated-measures evaluation design and variance analysis
- Paired and cluster-aware bootstrap confidence intervals
- Python
- NumPy
- SciPy `scipy.stats.bootstrap`
- Non-inferiority decision rules and rare-event measurement

## Sources Consulted

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI: Reproducible outputs](https://developers.openai.com/api/docs/guides/advanced-usage#reproducible-outputs)
- [OpenAI: Text generation and model snapshot guidance](https://developers.openai.com/api/docs/guides/text#prompt-engineering)
- [SciPy: `scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html)
- [SciPy 1.15.0 release notes: transition from `random_state` to `rng`](https://docs.scipy.org/doc/scipy/release/1.15.0-notes.html)
- [NumPy: `numpy.mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html)
- [NumPy: Random Generator and `default_rng`](https://numpy.org/doc/stable/reference/random/generator.html)
- [NIST AI RMF Core: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [NIST TN 1297: repeatability, random error, and systematic error terminology](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-d1-terminology)
- [NIST/SEMATECH: propagation of variance and covariance](https://www.itl.nist.gov/div898/handbook/ppc/section1/ppc133.htm)
- [NIST: confidence interval definition and long-run coverage](https://csrc.nist.gov/glossary/term/confidence_interval)
- [NIST/SEMATECH: exact binomial confidence limits](https://itl.nist.gov/div898/software/dataplot/refman2/auxillar/exacbici.htm)
- [FDA: Non-Inferiority Clinical Trials](https://www.fda.gov/media/78504/download)
- [Field and Welsh: Bootstrapping clustered data](https://doi.org/10.1111/j.1467-9868.2007.00593.x)
- [Anthropic: Challenges in evaluating AI systems](https://www.anthropic.com/news/evaluating-ai-systems)

## Issues Found

- The repetition scheme was called a crossed design, but the shown generations-within-cases and judge calls-within-responses are naturally repeated measures unless stable factor levels are deliberately crossed. Changed “crossed design” to “repeated-measures design.”
- Evaluator fallibility was presented as run-to-run variation even though a judge can be consistently wrong. Separated stochastic repeatability variation from systematic judge error, and clarified that rescoring saved outputs estimates judge repeatability variance.
- The fixed-set discussion relied only on per-case summaries. Added a requirement to preserve shared run identifiers and complete-run aggregates when one run-level condition can affect several cases, because aggregate variance then includes cross-case covariance.
- The statement that treating correlated rows as independent always makes intervals too narrow was too absolute. Clarified that it can invalidate intervals and often narrows them when within-cluster correlation is positive.
- Bootstrap coverage was described as exact. Added “approximately” to match SciPy’s documented finite-sample coverage language.
- “Crosses the boundary” omitted the equality case. Changed it to “includes the boundary,” consistent with the post’s conservative rule when a confidence bound equals the tolerance.

## Review Notes

- The Python example was executed successfully with NumPy and SciPy 1.18.1. Precomputing one paired-difference array and bootstrapping it with `paired=False` is correct; passing candidate and baseline as separate samples requires `paired=True` so common indices are resampled.
- The current `rng` keyword is non-deprecated and is the right choice for new code. It requires SciPy 1.15 or later.
- SciPy documents that a BCa interval can contain `NaN` for a degenerate bootstrap distribution, such as identical per-case deltas. This does not invalidate the example, and the post already warns against silently dropping missing results.
- SciPy returns a two-sided 95% interval by default. Using its lower bound to establish non-inferiority is conservative, as the post states.
- All external links were live and pointed to the described resources on 2026-09-01. The OpenAI evaluation-best-practices page currently notes deprecation of OpenAI’s hosted Evals platform, but this post uses only the page’s methodology and does not depend on that platform.
