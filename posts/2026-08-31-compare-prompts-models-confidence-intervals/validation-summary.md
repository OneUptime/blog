# Validation Summary: Compare Prompts or Models with Confidence Intervals, Not Average Scores

## Status

validated

## Post Type

Technical guide with an executable Python example.

## Technologies Covered

- Python 3
- NumPy
- SciPy `scipy.stats.bootstrap`
- Paired nonparametric bootstrap and BCa confidence intervals
- Clustered, stratified, and hierarchical resampling
- LLM evaluation and LLM-as-a-judge methodology
- Practical significance, slice analysis, and multiple-comparison control

## Sources Consulted

- [SciPy `bootstrap` reference](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) — current function signature, paired and vectorized resampling behavior, BCa intervals, return attributes, random-number handling, and degenerate-data warnings.
- [SciPy 1.15.0 release notes](https://docs.scipy.org/doc/scipy/release/1.15.0-notes.html) — transition from `random_state` to the current `rng` keyword.
- [NIST/SEMATECH: Confidence Limits for the Mean](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm) — frequentist confidence-interval interpretation and the effects of sample size and variability on interval width.
- [NIST/SEMATECH: Analysis of Paired Observations](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm) — analysis of within-pair differences.
- [NIST Dataplot: McNemar Test](https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/mcnemar.htm) — discordant outcomes in paired binary data.
- [Field and Welsh, “Bootstrapping Clustered Data”](https://doi.org/10.1111/j.1467-9868.2007.00593.x) — cluster-aware bootstrap methodology.
- [Saravanan et al., “The Hierarchical Bootstrap”](https://pmc.ncbi.nlm.nih.gov/articles/PMC7906290/) — resampling for nested observations.
- [NIST/SEMATECH: Bonferroni's Method](https://itl.nist.gov/div898/handbook/prc/section4/prc473.htm) — simultaneous confidence intervals and multiple-comparison control.
- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — representative eval design and LLM-judge position and verbosity biases.
- [scikit-learn Cross-validation: Evaluating Estimator Performance](https://scikit-learn.org/stable/modules/cross_validation.html) — held-out evaluation, non-IID groups, grouped splitting, and stratification.

## Issues Found

- The introduction implied that a paired confidence interval alone exposes outlier influence and judge variability. It now says that the interval exposes case-sampling uncertainty and that diagnosing the other sources requires inspecting per-case differences or repeating judge calls.
- The pairing section described independently bootstrapping the two systems as answering a less precise question. The estimand is still a difference of means; what changes is the assumed sampling design. The text now says that independent resampling discards within-pair covariance and estimates uncertainty for an unpaired design. The preceding claim about variance reduction was also made conditional because its size depends on within-pair covariance.
- The cluster section categorically treated rows from the same cluster as dependent and said row-level resampling always makes an interval too narrow. The wording now correctly says such rows may be dependent and that ignoring clustering can produce an interval that is too narrow; the direction depends on the dependence structure.
- The slice section said smaller slices always have wider intervals. Because interval width also depends on within-slice variability, this was corrected to say they are often wider.
- The scikit-learn link was labeled “Resampling Strategies,” but its target is the cross-validation guide rather than bootstrap documentation. The link label now matches the target page.

## Review Notes

- The exact code example ran without warnings under Python 3.13, NumPy 2.5.2, and SciPy 1.18.1. It produced an estimated lift of `0.08` and a 95% BCa interval of approximately `[-0.02, 0.22]`.
- `rng=` is the current, non-deprecated SciPy API and requires SciPy 1.15 or newer. Older SciPy releases used `random_state=`; the post targets the current API, so no compatibility edit was needed.
- The effective high-level sample size for a cluster bootstrap is the number of independent clusters. A future expansion could also state explicitly whether the target estimand weights turns or conversations when cluster sizes differ.
- All external links in the post returned HTTP 200 on 2026-09-01. The cited OpenAI page currently notes the separate Evals platform shutdown scheduled for November 30, 2026; its general evaluation and LLM-judge guidance remains applicable, but the link should be rechecked after that transition.
