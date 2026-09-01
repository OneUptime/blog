# How to Calibrate an LLM-as-a-Judge Against Human Labels with Cohen’s Kappa

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Statistical Analysis, Python, Data Quality

Description: Calibrate a categorical LLM judge against expert labels using Cohen’s kappa, confusion analysis, uncertainty, and iterative rubric repair.

---

An LLM judge is useful only when its decisions align with the people responsible for the product requirement. Raw agreement is a necessary check, but it can look impressive when one label dominates. Cohen’s kappa adjusts observed agreement by the agreement expected from the two label distributions, making it a useful diagnostic for two raters assigning categorical labels.

Kappa is not a universal “judge quality” number. It must be read alongside the confusion matrix, class prevalence, sample design, and concrete disagreements.

## Build a Calibration Set

Sample examples from the same workflows the judge will score. Include common traffic, rare high-risk cases, known failures, and cases near the rubric boundary. Keep this set separate from the examples used to write or tune the judge prompt.

Ask qualified human reviewers to label independently before discussion. Provide one criterion, explicit label definitions, authoritative references, and boundary examples. If the human reviewers cannot apply the rubric consistently, an LLM will not repair the underlying ambiguity.

For a binary judge, store rows like:

```json
{
  "case_id": "policy-018",
  "input": "...",
  "response": "...",
  "human_label": "fail",
  "human_reason": "Claims a refund is guaranteed after the policy deadline",
  "rubric_version": "policy-correctness/4"
}
```

Use an adjudicated expert label as the comparison target, but retain original reviewer votes. Adjudication should resolve the requirement, not conceal disagreement.

## Freeze the Judge Under Test

Pin the judge model version, full prompt, examples, output schema, decoding configuration, and all supplied references. Save parse failures and refusals as explicit error outcomes. Do not exclude them from the denominator: a judge that labels 90% of cases accurately and fails to produce a label for 10% is not a 90%-agreement production judge.

Run the judge on the untouched calibration set and normalize only harmless formatting differences:

```python
ALLOWED = {"pass", "fail"}

def normalize(value: str) -> str:
    label = value.strip().lower()
    return label if label in ALLOWED else "judge_error"
```

If the judge is stochastic, repeat it and report both single-run agreement and label stability. Majority voting can change performance and cost, so treat it as a separate judge configuration.

## Compute Agreement and Kappa

For labels from two annotators, scikit-learn implements:

\[
\kappa = \frac{p_o - p_e}{1 - p_e}
\]

where \(p_o\) is observed agreement and \(p_e\) is agreement expected from the annotators’ empirical label frequencies.

```python
from sklearn.metrics import cohen_kappa_score, confusion_matrix

human = ["pass", "fail", "fail", "pass", "fail", "pass"]
judge = ["pass", "pass", "fail", "pass", "fail", "judge_error"]
labels = ["pass", "fail", "judge_error"]

raw_agreement = sum(a == b for a, b in zip(human, judge)) / len(human)
kappa = cohen_kappa_score(human, judge, labels=labels)
matrix = confusion_matrix(human, judge, labels=labels)

print(raw_agreement, kappa)
print(matrix)
```

Here the human never emits `judge_error`; keeping it as a judge label penalizes invalid outputs. In a larger system, infrastructure timeouts may be reported separately as availability, but the end-to-end acceptance policy must still account for them.

Scikit-learn reports kappa on a scale from `-1` to `1`: `1` is complete agreement, `0` is no agreement beyond that expected from the observed label marginals, and negative values indicate less agreement than that chance model expects. These anchors do not create universal “fair,” “good,” or “excellent” bands; interpret the confusion pattern and use-case risk directly.

Use unweighted kappa for nominal labels such as `pass`, `fail`, and `abstain`. For genuinely ordered categories, scikit-learn supports `weights="linear"` or `weights="quadratic"`, but the choice assigns a disagreement cost and should be justified. Kappa is not designed for arbitrary continuous judge scores; use an agreement or error analysis appropriate to continuous measurements instead.

## Add Uncertainty

A point estimate from a small calibration set is fragile. Bootstrap independent cases to obtain an interval:

```python
import numpy as np
from sklearn.metrics import cohen_kappa_score

rng = np.random.default_rng(23)
human = np.asarray(human)
judge = np.asarray(judge)
values = []
undefined = 0

for _ in range(5000):
    idx = rng.integers(0, len(human), len(human))
    score = cohen_kappa_score(human[idx], judge[idx], labels=labels)
    if np.isfinite(score):
        values.append(score)
    else:
        undefined += 1

if not values:
    raise RuntimeError("all bootstrap kappa estimates were undefined")
print(np.quantile(values, [0.025, 0.975]))
print("undefined bootstrap resamples", undefined)
```

Resample the unit that is independent. If several examples come from the same conversation, customer, or source document, resample that cluster together. Some resamples can contain only one effective label and yield undefined kappa; report how these were handled rather than silently presenting an overconfident interval.

## Interpret the Failure Pattern

There is no context-free kappa cutoff that makes a judge safe. Choose acceptance criteria from the use case and compare with human-human agreement. A judge used to route low-risk review may tolerate more error than one used to certify medical or legal content.

Always inspect:

- false passes versus false failures;
- recall and precision for the harmful class;
- agreement by language, workflow, response length, and severity;
- invalid-output and timeout rates; and
- repeated-run stability.

Kappa can be low despite high agreement when one class is extremely prevalent, and it can hide asymmetric harms. For example, five false passes may be much worse than five false failures. A cost-sensitive acceptance rule or per-class requirement should accompany kappa.

## Iterate Without Leaking the Test

Analyze disagreements on a development calibration split. Common repairs include separating compound criteria, clarifying whether implicit evidence counts, supplying the relevant source, adding boundary examples, or changing `1–5` scoring to `pass/fail/abstain`.

After revising the prompt, evaluate once on a held-out calibration split. If you repeatedly tune against that split, it is no longer held out. Collect fresh expert labels for the next iteration and periodically rerun the judge as production traffic changes.

Ragas’ official judge-alignment workflow follows the same broad pattern: compare judge decisions with expert targets, inspect false-positive and false-negative patterns, revise the prompt, and rerun the experiment. Kappa adds chance-adjusted agreement, but it does not replace this qualitative error analysis.

## Official Documentation

- [scikit-learn: `cohen_kappa_score`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html)
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Ragas: Align an LLM as a judge](https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/)
- [NIST AI RMF Core: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

## Conclusion

Calibrate an LLM judge as you would any measurement instrument: define a clear rubric, compare fixed judge outputs with independent expert labels, count errors, compute chance-adjusted agreement with uncertainty, and inspect every consequential disagreement. Trust comes from repeated alignment evidence on representative data, not from a high kappa value in isolation.
