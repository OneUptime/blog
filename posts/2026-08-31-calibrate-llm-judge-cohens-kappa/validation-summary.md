# Validation Summary: How to Calibrate an LLM-as-a-Judge Against Human Labels with Cohen’s Kappa

## Status

validated

## Post Type

Technical guide with Python statistical-analysis examples

## Technologies Covered

- LLM-as-a-judge evaluation and calibration against expert labels
- Cohen’s kappa and raw inter-rater agreement
- Confusion matrices, class-specific error analysis, precision, and recall
- Bootstrap uncertainty estimation for independent and clustered cases
- Python
- NumPy
- scikit-learn
- Ragas judge-alignment workflows
- NIST AI Risk Management Framework measurement practices

## Sources Consulted

- [scikit-learn: `cohen_kappa_score`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html) - verified the formula, use of per-annotator empirical label frequencies, `labels` behavior, unweighted/linear/quadratic options, score range, and undefined-result handling.
- [scikit-learn: `confusion_matrix`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html) - verified label ordering and row/column interpretation.
- [scikit-learn: Cohen’s kappa model-evaluation guide](https://scikit-learn.org/stable/modules/model_evaluation.html#cohen-s-kappa) - verified the intended two-annotator categorical-agreement use case.
- [NumPy: Random `Generator`](https://numpy.org/doc/stable/reference/random/generator.html) - verified `default_rng` and `Generator.integers` usage.
- [NumPy: `isfinite`](https://numpy.org/doc/stable/reference/generated/numpy.isfinite.html) and [NumPy: `quantile`](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html) - verified filtering of undefined scores and percentile extraction.
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) - verified production-representative evaluation, expert labeling, clear rubrics, edge-case coverage, continuous evaluation, and calibration of automated scoring against human feedback.
- [Ragas: Align an LLM as a judge](https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/) - verified comparison with expert targets, false-positive/false-negative analysis, prompt revision, and re-evaluation.
- [NIST AI RMF Core: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) - verified deployment-context evaluation, uncertainty documentation, independent/domain-expert input, ongoing measurement, and production monitoring.
- [Cohen: A Coefficient of Agreement for Nominal Scales](https://doi.org/10.1177/001316446002000104) and [Weighted Kappa](https://doi.org/10.1037/h0026256) - verified the nominal and weighted forms of Cohen’s kappa.
- [Feinstein and Cicchetti: High agreement but low kappa](https://pubmed.ncbi.nlm.nih.gov/2348207/) - verified the prevalence-related high-agreement/low-kappa phenomenon.
- [Field and Welsh: Bootstrapping clustered data](https://doi.org/10.1111/j.1467-9868.2007.00593.x) - verified cluster-level resampling when observations within a cluster are dependent.
- [de Raadt et al.: Cohen’s kappa with missing data](https://doi.org/10.1177/0013164418823249) - checked the caveat around treating a missing or invalid rating as an ordinary category.

## Issues Found

- The invalid-output example conflated conditional accuracy with end-to-end agreement. As written, accurately labeling 90% of all cases and failing on the other 10% is exactly 90% raw agreement. Changed it to a judge that is 90% accurate on the 90% of cases for which it returns a label, which yields 81% end-to-end agreement when the remaining 10% are failures.

## Review Notes

- Both Python examples were executed successfully with scikit-learn 1.9.0 and NumPy 2.5.2. The first prints raw agreement `0.6666666666666666`, kappa `0.4285714285714286`, and `[[2, 0, 1], [1, 2, 0], [0, 0, 0]]`. The bootstrap example produces `[-0.14285714, 1.0]` and reports 18 undefined resamples for the shown seed.
- scikit-learn 1.9.0 emits `UndefinedMetricWarning` and returns `NaN` by default for the degenerate bootstrap draws. The post correctly excludes non-finite values from the quantiles and reports their count.
- Treating `judge_error` as a category is an operational end-to-end policy rather than conventional complete-data inter-rater kappa. It counts invalid outputs as disagreements, but it also changes the expected-agreement term; the post correctly requires the invalid-output rate to be reported separately.
- Weighted kappa depends on the semantic category order. When applying it to string labels, pass `labels` in the intended order rather than relying on automatic sorting.
- All external links resolved to their intended resources on 2026-09-01. The scikit-learn `stable` documentation currently represents version 1.9.0.
- The OpenAI page notes the upcoming retirement of the legacy hosted Evals platform, but this post relies only on provider-independent evaluation guidance and no deprecated API.
- The linked NIST page presents AI RMF 1.0 and notes that a revision is in progress; its measurement guidance remains applicable.
