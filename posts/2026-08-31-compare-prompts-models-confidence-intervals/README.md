# How to Compare Prompts or Models with Confidence Intervals Instead of Average Scores

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Confidence Interval, Statistical Analysis, Statistics

Description: Compare prompts or models with paired uncertainty estimates and practical decision rules instead of trusting a single average score.

---

An average score hides how uncertain an LLM comparison is. A candidate prompt may average 0.82 while the baseline averages 0.80, but that two-point lift could be stable across cases, caused by two outliers, or smaller than ordinary judge variation. A confidence interval around the **paired difference** makes case-sampling uncertainty visible, but diagnosing outliers or judge variability requires inspecting the differences or repeating judge calls.

A confidence interval does not prove that a future production run must fall inside its bounds. Under its statistical procedure, it quantifies uncertainty in the estimated population effect from the sampled cases. Its usefulness depends on representative sampling, correct pairing, and an uncertainty method that matches the data-generating process.

## Use a Paired Experiment

Run both candidates on the same evaluation cases. Keep the input, retrieved context, tools, sampling settings, judge rubric, and judge version fixed. For case `i`, compute:

```text
difference_i = candidate_score_i - baseline_score_i
estimated_lift = mean(difference_i)
```

Pairing can remove much of the variation caused by some questions being intrinsically harder than others. Bootstrapping the candidate and baseline as unrelated samples throws away that covariance information and estimates uncertainty for an unpaired sampling design.

Preserve failures in the data. A timeout or invalid output needs a predeclared treatment-often a failure score or a separately gated error rate. Silently dropping only one candidate's failures biases the comparison.

## Bootstrap the Paired Difference

When case-level scores have an awkward or bounded distribution, a paired nonparametric bootstrap is a practical approach. It repeatedly samples case indices with replacement and recomputes the mean lift.

SciPy's `bootstrap` supports paired resampling. This example calculates a bias-corrected and accelerated interval:

```python
import numpy as np
from scipy.stats import bootstrap

baseline = np.asarray([0.7, 1.0, 0.4, 0.8, 0.6])
candidate = np.asarray([0.8, 0.9, 0.7, 0.8, 0.7])

def mean_lift(candidate_values, baseline_values, axis=-1):
    return np.mean(candidate_values - baseline_values, axis=axis)

result = bootstrap(
    (candidate, baseline),
    mean_lift,
    paired=True,
    vectorized=True,
    n_resamples=20_000,
    confidence_level=0.95,
    method="BCa",
    rng=np.random.default_rng(7),
)

print(mean_lift(candidate, baseline))
print(result.confidence_interval.low, result.confidence_interval.high)
```

Five observations are intentionally too few for a serious decision. With tiny or nearly constant samples, a bootstrap interval can be unstable or degenerate. Increase representative cases and inspect the distribution rather than treating more resamples as a substitute for more data.

## Respect the Sampling Unit

Rows may not be independent when several come from one conversation, document, customer, or incident. Resampling individual rows can then produce an interval that is too narrow. Bootstrap whole clusters: sample conversations, then include all turns inside each selected conversation. If production traffic is stratified, resample within the predefined strata and combine them using production weights.

Repeated generations create another hierarchy. Separate questions answer different needs:

- Resampling cases estimates uncertainty from which workload examples were sampled.
- Repeating generations estimates model stochasticity on the same examples.
- Repeating judge calls estimates evaluator variability.

Do not flatten every repetition into an independent row. Average repetitions within a case for a workload-level comparison, or use a hierarchical bootstrap that resamples cases and then repetitions. Report the design so readers know what the interval covers.

## Choose the Right Per-Case Outcome

For continuous rubric scores, use the paired mean difference or a robust alternative chosen in advance. For binary pass/fail, compare the paired pass-rate difference and inspect discordant cases-those where only one system passed. For pairwise judgments, encode candidate win as `1`, tie as `0.5`, and baseline win as `0`, while also reporting raw win/tie/loss counts.

If an LLM judge is used, randomize presentation order or score both orders to control position bias. Keep the judge blind to candidate names. Confidence intervals quantify sampling uncertainty; they do not repair a systematically biased rubric or a judge that prefers longer responses.

## Make a Practical Decision, Not Just a Sign Decision

Define a minimum meaningful lift `m` before seeing results. Then use a decision rule such as:

```text
lower bound > m       adopt: evidence supports a useful improvement
upper bound < -m      reject: evidence supports a meaningful regression
otherwise             inconclusive: collect data or decide from predeclared costs and risks
```

An interval entirely above zero can describe an improvement too small to justify higher latency or cost. Conversely, an interval that narrowly crosses zero may still rule out a material regression. Show quality, latency, error rate, and cost as separate outcomes rather than forcing them into one opaque score.

## Avoid Slice and Multiple-Comparison Traps

Always show the overall paired result and predeclared critical slices, such as language, intent, safety category, or long-context queries. A positive overall lift can coexist with a harmful regression for a small high-risk group. Slice intervals will often be wider because they contain fewer cases; that is information, not a reason to hide them.

Searching dozens of models, prompts, thresholds, and slices and publishing only the best interval understates uncertainty. Keep an untouched confirmation set, preregister the primary comparison, or apply an appropriate multiple-comparison procedure. Prompt exploration and final confirmation should not reuse the same evidence without acknowledging selection.

Finally, publish the case count, number of clusters, mean lift, interval method and level, random seed, missing-result policy, and candidate/judge versions. Include a plot or quantiles of per-case differences. Reproducible uncertainty is more actionable than a decimal average with no context.

## Official Documentation

- [SciPy `bootstrap` reference](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html)
- [NIST/SEMATECH e-Handbook: Confidence Limits for the Mean](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm)
- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [scikit-learn Cross-validation: Evaluating Estimator Performance](https://scikit-learn.org/stable/modules/cross_validation.html)

## Conclusion

Compare prompts and models on the same cases, analyze per-case differences, and bootstrap the real sampling unit. Pair the interval with a predeclared practical margin, critical slices, and explicit failure handling. The result distinguishes a dependable improvement from noise-and makes an inconclusive outcome an honest signal to gather better evidence.
