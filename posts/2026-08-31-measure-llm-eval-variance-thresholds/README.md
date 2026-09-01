# Why Do LLM Eval Scores Change Between Runs? Measuring Variance Before Setting Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Statistical Analysis, Sampling, Confidence Interval

Description: Measure output, judge, and dataset variance in LLM evaluations before choosing regression thresholds or interpreting small score changes.

---

The same evaluation can produce different scores without any code change. The application model may sample a different answer, an LLM judge may choose a different label, a live retriever may return a different ranking, and a small dataset may overrepresent whichever cases happened to be selected. Even nominally deterministic settings do not guarantee identical service-level execution.

A threshold should therefore follow a variance study. Otherwise it encodes false precision and turns normal noise into release churn.

## Separate the Sources of Variation

At least four components matter:

- **Case variation:** some inputs are intrinsically harder than others.
- **Application variation:** repeated generations for the same case differ.
- **Evaluator variation:** repeated scoring by a stochastic judge can change its decision; systematic judge error is bias rather than run-to-run variance.
- **Environment variation:** retriever contents, tools, provider versions, concurrency, and failures change.

Freeze everything you can measure independently. Snapshot documents, replay tool results, pin prompt and model versions, and record decoding parameters. Then deliberately repeat the components that remain stochastic.

A practical repeated-measures design runs every case several times, then scores each saved response several times with the judge. Saving responses is important: it lets you re-score the exact same application output and distinguish judge repeatability variance from generation variance.

```text
for each case i:
    for generation seed/run g:
        save response[i, g]
        for judge repetition j:
            save score[i, g, j]
```

Provider APIs may not expose or honor a portable random seed. Treat a seed as recorded configuration, not proof of determinism, and still measure repeats.

## Inspect Per-Case Stability

Do not begin with only the grand mean. For each case, calculate pass rate, mean, standard deviation, missing-score count, and range. Then ask:

- Are flips concentrated near a legitimate rubric boundary?
- Does the judge alternate on otherwise identical responses?
- Do long or multilingual cases have more failures?
- Does retrieval order change before the answer changes?
- Are a few unstable rows driving the whole aggregate?

Review the raw traces of high-variance cases. An underspecified rubric should be fixed; a genuinely ambiguous product decision should be escalated; a legitimately variable workflow should remain in the test with uncertainty represented. Deleting every noisy case can produce a stable but unrealistic benchmark.

## Estimate Different Uncertainties

There are two common questions, and they require different resampling units.

First, “How stable is this fixed evaluation set under repeated execution?” Hold the cases fixed and summarize repeated runs per case. If a common run or environment can affect multiple cases, preserve that run identifier and also summarize the aggregate score for each complete run; otherwise, per-case summaries omit cross-case covariance. This captures execution variance for the benchmark you actually gate on.

Second, “How well does this dataset estimate production performance?” Resample independent cases or clusters. If several turns, paraphrases, or questions come from one conversation or document, resample the whole cluster. Treating correlated rows as independent can make intervals invalid—often too narrow when within-cluster correlation is positive.

For a candidate comparison, use paired differences because both systems saw the same cases:

```python
import numpy as np
from scipy.stats import bootstrap

# One aggregate score per independent case for each system.
delta = np.asarray(candidate_by_case) - np.asarray(baseline_by_case)

result = bootstrap(
    (delta,),
    np.mean,
    paired=False,
    confidence_level=0.95,
    method="BCa",
    n_resamples=9999,
    rng=np.random.default_rng(42),
)

print("mean delta", delta.mean())
print("95% interval", result.confidence_interval)
```

Because `delta` already contains paired observations, it is resampled as one array. If you instead pass baseline and candidate as separate arrays to a statistic, set `paired=True` so SciPy resamples common indices.

A confidence interval is not the probability that the true value lies inside this one computed interval. Under the method’s assumptions, the procedure produces intervals with approximately the stated long-run coverage. It also does not remove bias from an unrepresentative dataset or a misaligned judge.

## Choose a Threshold from the Decision

Define the smallest regression that matters operationally, often called a practical tolerance. It might be two percentage points overall, zero regressions in a critical safety slice, or a cost-quality tradeoff. Do not derive it solely from observed noise: a very noisy evaluator should be improved, not granted permission to miss large harms.

Then choose a decision rule. For paired delta `candidate - baseline` and tolerated regression `-0.02`:

- fail conservatively if the interval’s lower bound is at or below `-0.02`;
- fail only with strong regression evidence if the upper bound is below `-0.02`; or
- mark the result inconclusive and collect more samples when the interval includes the boundary.

The first rule blocks more potentially good changes; the second can allow uncertain harmful ones. The correct choice depends on risk. Document it before seeing a candidate’s result.

Under the conservative rule, a lower bound at or below the margin means the candidate has not established non-inferiority at the chosen confidence level. It does not, by itself, prove that the candidate regressed; report that distinction in CI output.

## Determine Repetitions and Sample Size Empirically

Run a pilot and plot how estimates stabilize as cases and repetitions increase. More generation repeats reduce uncertainty about a fixed case’s expected behavior. More independent cases improve coverage of the input population. Once generation variance is small relative to case-to-case variation, additional cases often provide more information than additional repeats.

For rare critical failures, averages and normal approximations are inadequate. Use targeted strata, exact counts, and hard invariants. Report denominators: “0 failures in 20 cases” is not equivalent to proof that the failure probability is zero.

## Keep the Measurement Stable

Store per-case outputs and scores, not just aggregates. Record dataset, rubric, judge, model, prompt, retrieval snapshot, tool fixtures, timestamps, retries, and missing results. Never drop `NaN` silently; a changing failure rate is itself a source of apparent score movement.

Use a fixed baseline response set to monitor judge drift and a fixed judge to compare application changes. When either must change, run an overlap experiment and publish both old- and new-measurement results.

## Official Documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [SciPy: `scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html)
- [NIST AI RMF Core: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [Anthropic: Challenges in evaluating AI systems](https://www.anthropic.com/news/evaluating-ai-systems)

## Conclusion

Score movement is a mixture of case sampling, model generation, judge behavior, and environment changes. Freeze and repeat these components separately, inspect per-case instability, and use paired, cluster-aware uncertainty for comparisons. Only then set a threshold tied to a real product decision and define how inconclusive results are handled.
